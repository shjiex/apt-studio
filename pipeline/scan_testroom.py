"""scan_testroom.py - renders a walk-around "video" of a made-up room with KNOWN size.

There is no real room video in this workspace, so this stands in for one. Because the room's true
size is known (3.6 x 3.0 x 2.5 m), the scan step can be checked against it.

usage: python3 scan_testroom.py <out dir> [frames] [samples] [first] [last]
"""
import bpy, sys, os, math, json
from mathutils import Vector
HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.environ.get('APT_APP', os.path.dirname(HERE))   # the web app folder (one level up)
W, L, H = 3.6, 3.0, 2.5


def img_mat(name, path, rough=0.6, scale=None):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(path)
    if scale:
        tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = (scale[0], scale[1], 1)
        nt.links.new(tc.outputs['UV'], mp.inputs['Vector']); nt.links.new(mp.outputs[0], t.inputs['Vector'])
    nt.links.new(t.outputs['Color'], b.inputs['Base Color']); b.inputs['Roughness'].default_value = rough
    return m


def col_mat(name, c, rough=0.9):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*c, 1); b.inputs['Roughness'].default_value = rough
    return m


def plane(name, size, loc, rot, mat):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = (size[0], size[1], 1); o.data.materials.append(mat); return o


def box(size, loc, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.object; o.scale = size; o.data.materials.append(mat); return o


def furniture(name, x, y, rot_z):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(APP, 'public/models/catalog', name + '.glb'))
    for o in set(bpy.data.objects) - before:
        if o.parent is None:
            o.location = (x, y, 0); o.rotation_mode = 'XYZ'; o.rotation_euler[2] = rot_z


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    wall = col_mat('wall', (0.86, 0.85, 0.82)); trim = col_mat('trim', (0.93, 0.93, 0.92), 0.5)
    floor = img_mat('floor', os.path.join(APP, 'public/textures/floor-oak-colour.jpg'), 0.55, (W / 2.4, L / 2.4))
    plane('floor', (W, L), (0, 0, 0), (0, 0, 0), floor)
    plane('ceiling', (W, L), (0, 0, H), (math.pi, 0, 0), col_mat('ceil', (0.95, 0.95, 0.94)))
    plane('back', (W, H), (0, L / 2, H / 2), (math.pi / 2, 0, 0), wall)
    plane('front', (W, H), (0, -L / 2, H / 2), (-math.pi / 2, 0, 0), wall)
    plane('left', (L, H), (-W / 2, 0, H / 2), (math.pi / 2, 0, math.pi / 2), wall)
    plane('right', (L, H), (W / 2, 0, H / 2), (math.pi / 2, 0, -math.pi / 2), wall)
    for x, y, sx, sy in ((0, L / 2 - 0.01, W, 0.02), (0, -L / 2 + 0.01, W, 0.02), (-W / 2 + 0.01, 0, 0.02, L), (W / 2 - 0.01, 0, 0.02, L)):
        box((sx, sy, 0.09), (x, y, 0.045), trim)                       # baseboards
    box((0.85, 0.03, 2.03), (-0.9, -L / 2 + 0.015, 1.015), col_mat('door', (0.55, 0.42, 0.30), 0.5))
    box((1.2, 0.03, 1.1), (0.4, L / 2 - 0.015, 1.5), col_mat('window', (0.72, 0.84, 0.95), 0.2))
    mood = os.path.join(APP, 'public/mood')
    p1 = plane('poster1', (0.6, 0.8), (-1.2, L / 2 - 0.02, 1.5), (math.pi / 2, 0, 0), img_mat('p1', os.path.join(mood, 'mood-2.jpg')))
    p2 = plane('poster2', (0.7, 0.5), (W / 2 - 0.02, 0.3, 1.45), (math.pi / 2, 0, -math.pi / 2), img_mat('p2', os.path.join(mood, 'mood-4.jpg')))
    p3 = plane('poster3', (0.5, 0.7), (-W / 2 + 0.02, -0.4, 1.5), (math.pi / 2, 0, math.pi / 2), img_mat('p3', os.path.join(mood, 'mood-1.jpg')))
    furniture('bed', -1.0, 0.45, 0); furniture('desk', 1.1, 1.15, 0); furniture('chair', 1.1, 0.6, math.pi)
    furniture('shelf', 1.6, -0.6, -math.pi / 2); furniture('plant', -1.5, -1.2, 0); furniture('rug', 0.4, -0.3, 0)
    d = bpy.data.lights.new('ceil', 'AREA'); d.size = 1.0; d.energy = 320
    o = bpy.data.objects.new('ceil', d); bpy.context.scene.collection.objects.link(o); o.location = (0, 0, H - 0.05)
    w = bpy.data.worlds.new('w'); w.use_nodes = True; bpy.context.scene.world = w
    w.node_tree.nodes['Background'].inputs[1].default_value = 0.6


def render(out, n=48, samples=12, first=0, last=None):
    build()
    sc = bpy.context.scene
    cd = bpy.data.cameras.new('cam'); cd.sensor_width = 36; cd.lens = 20
    cam = bpy.data.objects.new('cam', cd); sc.collection.objects.link(cam); sc.camera = cam
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples; sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 3
    sc.render.resolution_x = 640; sc.render.resolution_y = 480
    sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 92
    os.makedirs(out, exist_ok=True); truth = []
    last = n if last is None else last
    for i in range(n):
        a = 2 * math.pi * i / n
        pos = Vector((0.95 * math.cos(a), 0.75 * math.sin(a), 1.45 + 0.08 * math.sin(3 * a)))
        target = Vector((-1.1 * math.cos(a), -0.9 * math.sin(a), 0.95))
        cam.location = pos; cam.rotation_euler = (target - pos).to_track_quat('-Z', 'Y').to_euler()
        truth.append(dict(frame=i, position=list(pos)))
        if first <= i < last:
            sc.render.filepath = os.path.join(out, f'frame_{i:03d}.jpg'); bpy.ops.render.render(write_still=True)
    json.dump(dict(room=dict(width=W, length=L, height=H), focal_px=20 / 36 * 640, cameras=truth), open(os.path.join(out, '..', 'truth.json'), 'w'), indent=1)


if __name__ == '__main__':
    a = sys.argv[1:]
    render(a[0], int(a[1]) if len(a) > 1 else 48, int(a[2]) if len(a) > 2 else 12, int(a[3]) if len(a) > 3 else 0, int(a[4]) if len(a) > 4 else None)
