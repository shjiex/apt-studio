"""object2glb.py  -  one targeted object (from pin2object.py) in, a scaled 3D model (.glb) out.

Three ways to make the model ("backends"):
  photo-box  boxy furniture (cabinet, dresser, nightstand, bookshelf) and rugs:
             the real photo is straightened and put on the front (or top) of a box of the right size.
  template   everything else: a furniture template of the right type and size,
             recoloured with the colours and fabric/wood swatch read from the photo.
  generated  a real image-to-3D model (Meshy, Hunyuan3D, TripoSR...). Not run here: it needs a GPU
             service. If <pin>/generated.glb exists it is used as-is and only rescaled.

usage:  python3 object2glb.py <pin_dir> [--out models_dir] [--preview]
        python3 object2glb.py --all <pins_dir> --out models_dir --preview
"""
import bpy, bmesh, sys, os, json, math, argparse
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import furniture_lib as furn

BOXY = {'cabinet', 'side cabinet', 'tv cabinet', 'file cabinet', 'wine cabinet', 'dresser', 'nightstand',
        'bureau', 'bookshelf', 'bookcase', 'shelf', 'armoire', 'closet'}
ROUGH = dict(sofa=0.92, chair=0.9, bed=0.92, desk=0.5, shelf=0.5, lamp=0.85, plant=0.8, rug=0.97)
# which template material takes the photo's main material, and which takes its second colour
ROLES = dict(sofa=(['sofa'], ['oak_z']), chair=(['boucle'], ['oak_z', 'oak_x']),
             bed=(['duvet'], ['walnut_x', 'walnut_y', 'walnut_z']), desk=(['walnut_x', 'walnut_z'], []),
             lamp=(['linen'], ['black']), plant=(['terracotta'], []), shelf=(['oak_x', 'oak_z'], []))
FLAT = dict(leaf='#2f6a36', linen_w='#e8e3d9', soil='#2a2019', fringe='#e6dcc4', rug='#e6d9bd',
            oak_x='#c9a274', oak_z='#c9a274', walnut_x='#6b4424', walnut_y='#6b4424', walnut_z='#6b4424',
            sofa='#3a6b57', boucle='#ccc4b3', duvet='#bd4d26', linen='#ede0c7')


def lin(hexcol):
    h = hexcol.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c] + [1.0]


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def color_mat(name, hexcol, rough=0.6, metallic=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = lin(hexcol)
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metallic
    return m


def image_mat(name, path, rough=0.6):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(path)
    nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough
    return m


def meshes():
    return [o for o in bpy.context.scene.objects if o.type == 'MESH']


def bake_modifiers():
    for o in meshes():
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
        bpy.ops.object.convert(target='MESH')
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def box_uvs(tile=0.5, skip=()):
    """UVs in real metres: each face is mapped flat along its main axis, one texture tile per `tile` metres."""
    for o in meshes():
        me = o.data
        if not me.uv_layers:
            me.uv_layers.new(name='UVMap')
        uv = me.uv_layers.active.data
        for p in me.polygons:
            if me.materials and me.materials[p.material_index] and me.materials[p.material_index].name in skip:
                continue
            n = p.normal; ax = max(range(3), key=lambda i: abs(n[i]))
            a, b = [i for i in range(3) if i != ax]
            for li in p.loop_indices:
                co = me.vertices[me.loops[li].vertex_index].co
                uv[li].uv = (co[a] / tile, co[b] / tile)


def bounds():
    pts = [o.matrix_world @ Vector(c) for o in meshes() for c in o.bound_box]
    mn = Vector([min(p[i] for p in pts) for i in range(3)]); mx = Vector([max(p[i] for p in pts) for i in range(3)])
    return mn, mx


def fit_to(size):
    """Scale the whole model to real size (w, d, h) in metres, centred on the floor."""
    mn, mx = bounds(); cur = mx - mn
    s = Vector((size['w'] / cur.x, size['d'] / cur.y, size['h'] / cur.z))
    c = (mn + mx) / 2
    for o in meshes():
        for v in o.data.vertices:
            v.co = Vector(((v.co.x - c.x) * s.x, (v.co.y - c.y) * s.y, (v.co.z - mn.z) * s.z))
        o.data.update()


# ---------- photo-box backend ----------
def straighten(cutout_path, out_path, fill_hex):
    """Find the 4 corners of the object in the photo and warp it to a flat rectangle."""
    import cv2
    rgba = cv2.imread(cutout_path, cv2.IMREAD_UNCHANGED)
    a = rgba[..., 3]
    mask = (a > 128).astype(np.uint8)
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    c = max(cnts, key=cv2.contourArea)
    hull = cv2.convexHull(c)
    quad = None
    for eps in np.linspace(0.01, 0.12, 23):
        ap = cv2.approxPolyDP(hull, eps * cv2.arcLength(hull, True), True)
        if len(ap) == 4:
            quad = ap[:, 0, :].astype(np.float32); break
    x, y, w, h = cv2.boundingRect(c)
    box = np.float32([[x, y], [x + w, y], [x + w, y + h], [x, y + h]])
    if quad is None or cv2.contourArea(quad) > 1.35 * cv2.contourArea(c) or cv2.contourArea(quad) < 0.8 * cv2.contourArea(c):
        quad, how = box, 'bbox'
    else:
        s = quad.sum(1); d = np.diff(quad, axis=1)[:, 0]
        quad = np.float32([quad[np.argmin(s)], quad[np.argmin(d)], quad[np.argmax(s)], quad[np.argmax(d)]])
        how = 'quad'
    wtop, wbot = np.linalg.norm(quad[1] - quad[0]), np.linalg.norm(quad[2] - quad[3])
    hl, hr = np.linalg.norm(quad[3] - quad[0]), np.linalg.norm(quad[2] - quad[1])
    aspect = float(((wtop + wbot) / 2) / max(1.0, (hl + hr) / 2))
    H = 768; W = int(max(64, min(2048, H * aspect)))
    M = cv2.getPerspectiveTransform(quad, np.float32([[0, 0], [W, 0], [W, H], [0, H]]))
    fill = [int(fill_hex[i:i + 2], 16) for i in (5, 3, 1)]
    bgr = rgba[..., :3].astype(np.float32); al = (a.astype(np.float32) / 255)[..., None]
    flat = (bgr * al + np.float32(fill) * (1 - al)).astype(np.uint8)
    out = cv2.warpPerspective(flat, M, (W, H), flags=cv2.INTER_LANCZOS4, borderValue=fill)
    cv2.imwrite(out_path, out, [cv2.IMWRITE_JPEG_QUALITY, 92])
    return aspect, how


def build_photo_box(t, pin_dir, work):
    main = t['colors'][0]['hex'] if t['colors'] else '#b8a48a'
    aspect, how = straighten(os.path.join(pin_dir, 'cutout.png'), os.path.join(work, 'front.jpg'), main)
    size = dict(t['size_m'])
    if t['type'] == 'rug':
        size['d'] = max(0.6, min(3.0, size['w'] / max(0.4, min(2.5, aspect * 0.6))))
    else:
        w = size['h'] * aspect
        lo, hi = 0.45 * size['w'], 2.2 * size['w']
        if w < lo or w > hi:                      # keep the photo's proportions: change the height instead
            w = max(lo, min(hi, w)); size['h'] = round(float(w / aspect), 3)
        size['w'] = round(float(w), 3)
    W, D, Hh = size['w'], size['d'], size['h']
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * W, v.co.y * D, (v.co.z + 0.5) * Hh))
    me = bpy.data.meshes.new('object'); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('object', me); bpy.context.scene.collection.objects.link(o)
    rough = ROUGH[t['type']]
    sw = os.path.join(pin_dir, 'swatch.png')
    body = image_mat('body', sw, rough) if t.get('swatch') and os.path.exists(sw) else color_mat('body', main, rough)
    front = image_mat('photo', os.path.join(work, 'front.jpg'), rough)
    me.materials.append(body); me.materials.append(front)
    uvl = me.uv_layers.new(name='UVMap').data
    show = Vector((0, 0, 1)) if t['type'] == 'rug' else Vector((0, -1, 0))
    for p in me.polygons:
        is_front = p.normal.dot(show) > 0.9
        p.material_index = 1 if is_front else 0
        for li in p.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            if is_front and t['type'] == 'rug':
                uvl[li].uv = (co.x / W + 0.5, co.y / D + 0.5)
            elif is_front:
                uvl[li].uv = (co.x / W + 0.5, co.z / Hh)
            else:
                n = p.normal; ax = max(range(3), key=lambda i: abs(n[i])); a, b = [i for i in range(3) if i != ax]
                uvl[li].uv = (co[a] / 0.5, co[b] / 0.5)
    if t['type'] != 'rug':
        bpy.context.view_layer.objects.active = o; o.select_set(True)
        bv = o.modifiers.new('bevel', 'BEVEL'); bv.width = 0.006; bv.segments = 2; bv.limit_method = 'ANGLE'
        bpy.ops.object.convert(target='MESH')
    return size, 'photo-box (' + how + ')'


# ---------- template backend ----------
def build_template(t, pin_dir):
    furn.OBJECTS[t['type']]()
    bake_modifiers()
    main_names, second_names = ROLES.get(t['type'], ([], []))
    colors = t.get('colors') or []
    main_hex = colors[0]['hex'] if colors else None
    second_hex = colors[1]['hex'] if len(colors) > 1 else None
    rough = ROUGH[t['type']]
    sw = os.path.join(pin_dir, 'swatch.png')
    main_mat = None
    if main_hex:
        main_mat = image_mat('main', sw, rough) if t.get('swatch') and os.path.exists(sw) else color_mat('main', main_hex, rough)
    second_mat = color_mat('second', second_hex, 0.55) if second_hex else None
    cache = {}
    for o in meshes():
        for i, m in enumerate(o.data.materials):
            base = m.name.split('.')[0]
            if base in main_names and main_mat:
                o.data.materials[i] = main_mat
            elif base in second_names and second_mat:
                o.data.materials[i] = second_mat
            elif base in FLAT:                     # procedural material: replace by a flat exportable one
                if base not in cache:
                    cache[base] = color_mat('flat_' + base, FLAT[base], 0.7)
                o.data.materials[i] = cache[base]
    box_uvs(tile=0.45)
    fit_to(t['size_m'])
    return dict(t['size_m']), 'template'


def match_photo_colour(pin_dir):
    """Generated models often come out darker than the photo. Scale the texture so its average
    colour matches the average colour of the object in the photo (limited to 0.6x - 2.2x)."""
    from PIL import Image
    cut = np.asarray(Image.open(os.path.join(pin_dir, 'cutout.png')).convert('RGBA'), dtype=np.float32) / 255
    solid = cut[..., 3] > 0.9
    if solid.sum() < 100:
        return None
    photo = cut[..., :3][solid].mean(0)
    gains = []
    for img in bpy.data.images:
        if img.size[0] == 0 or img.colorspace_settings.name != 'sRGB':
            continue
        px = np.array(img.pixels[:], dtype=np.float32).reshape(-1, 4)
        used = px[:, :3].sum(1) > 0.03                      # ignore the empty parts of the texture sheet
        if used.sum() < 100:
            continue
        gain = np.clip(photo / np.maximum(px[used, :3].mean(0), 1e-3), 0.6, 2.2)
        px[:, :3] = np.clip(px[:, :3] * gain, 0, 1)
        img.pixels = px.ravel().tolist(); img.update(); img.pack()
        gains.append([round(float(g), 2) for g in gain])
    return gains


def export_glb(path):
    bpy.ops.object.select_all(action='DESELECT')
    ms = meshes()
    for o in ms: o.select_set(True)
    bpy.context.view_layer.objects.active = ms[0]
    if len(ms) > 1:
        bpy.ops.object.join()
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True, export_yup=True,
                              export_image_format='JPEG', export_jpeg_quality=85)


def preview(glb, png, res=420, samples=40):
    reset()
    bpy.ops.import_scene.gltf(filepath=glb)
    sc = bpy.context.scene
    mn, mx = bounds(); c = (mn + mx) / 2; R = (mx - mn).length / 2
    bpy.ops.mesh.primitive_plane_add(size=60, location=(c.x, c.y, mn.z)); bpy.context.object.is_shadow_catcher = True
    az, el = math.radians(-32), math.radians(20)
    cd = bpy.data.cameras.new('cam'); cd.lens = 90; cam = bpy.data.objects.new('cam', cd); sc.collection.objects.link(cam)
    dist = R / math.sin(math.atan(18 / 90)) * 1.05
    cam.location = c + Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el))) * dist
    cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler(); cd.clip_end = 200; sc.camera = cam
    def area(loc, size, power):
        d = bpy.data.lights.new('l', 'AREA'); d.size = size; d.energy = power
        o = bpy.data.objects.new('l', d); sc.collection.objects.link(o)
        o.location = c + Vector(loc) * R; o.rotation_euler = (c - o.location).to_track_quat('-Z', 'Y').to_euler()
    area((-2.6, -2.4, 3.4), 3.2 * R, 190 * R * R); area((3.2, -1.6, 1.6), 3.0 * R, 55 * R * R); area((0.6, 3.4, 2.6), 2.0 * R, 110 * R * R)
    w = bpy.data.worlds.new('w'); w.use_nodes = True; sc.world = w
    w.node_tree.nodes['Background'].inputs[0].default_value = (1, 1, 1, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 0.3
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples; sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 4; sc.render.film_transparent = True
    sc.render.resolution_x = res; sc.render.resolution_y = res
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.filepath = png
    bpy.ops.render.render(write_still=True)


def make(pin_dir, out_dir, do_preview=False):
    r = json.load(open(os.path.join(pin_dir, 'target.json')))
    t = r.get('target')
    if not t:
        return None
    os.makedirs(out_dir, exist_ok=True)
    work = os.path.join(pin_dir, 'work'); os.makedirs(work, exist_ok=True)
    reset()
    gen = os.path.join(pin_dir, 'generated.glb')
    if not os.path.exists(gen):                       # also accepted: pipeline/generated/<image id>.glb
        gen = os.path.join(HERE, 'generated', r['id'] + '.glb')
    if os.path.exists(gen):
        bpy.ops.import_scene.gltf(filepath=gen); bake_modifiers()
        mn, mx = bounds(); cur = mx - mn
        k = t['size_m']['h'] / cur.z                 # generated models have no real scale: fix the height, keep the shape
        size = dict(w=round(cur.x * k, 3), d=round(cur.y * k, 3), h=round(cur.z * k, 3))
        fit_to(size); backend = 'generated'
        gains = match_photo_colour(pin_dir); print('COLOUR GAIN', gains)
    elif t['label'] in BOXY or t['type'] == 'rug':
        size, backend = build_photo_box(t, pin_dir, work)
    else:
        size, backend = build_template(t, pin_dir)
    glb = os.path.join(out_dir, r['id'] + '.glb')
    export_glb(glb)
    entry = dict(id=r['id'], name=t['label'], type=t['type'], size=size, model=os.path.basename(glb), backend=backend,
                 ready_for_3d=t['ready_for_3d'], source=dict(image=r.get('source'), link=r.get('link'), box=t['box'], outline=t.get('outline')),
                 colors=[c['hex'] for c in t.get('colors', [])], bytes=os.path.getsize(glb))
    png = os.path.join(out_dir, r['id'] + '.png')
    if do_preview:
        preview(glb, png)
    if os.path.exists(png):
        entry['thumb'] = os.path.basename(png)
    return entry


if __name__ == '__main__':
    argv = sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument('pin_dir', nargs='?'); ap.add_argument('--all'); ap.add_argument('--out', default=os.path.join(HERE, 'out', 'models'))
    ap.add_argument('--preview', action='store_true')
    a = ap.parse_args(argv)
    dirs = [a.pin_dir] if a.pin_dir else sorted(d for d in (os.path.join(a.all, n) for n in os.listdir(a.all)) if os.path.isdir(d))
    manifest = []
    for d in dirs:
        e = make(d, a.out, a.preview)
        if e:
            manifest.append(e); print('MODEL', e['id'][:36], e['name'], e['backend'], e['size'], e['bytes'] // 1024, 'KB')
    # keep entries for other images that are already in the list (a run on one image must not drop the rest)
    path = os.path.join(a.out, 'manifest.json')
    if os.path.exists(path):
        done = {e['id'] for e in manifest}
        manifest = [e for e in json.load(open(path)) if e['id'] not in done] + manifest
        manifest.sort(key=lambda e: e['id'])
    json.dump(manifest, open(path, 'w'), indent=1)
