"""render_room.py  -  the room from the app in, one realistic picture out.

The app's live view has to stay fast, so it cuts corners on light. This script takes the room
file the app saves (download button, then "Room file"), rebuilds the same room in Blender with the
same furniture models and the same floor, and renders it with Cycles, which follows light the
way a camera does: soft shadows, light bouncing off the floor and walls.

usage:
  python3 render_room.py room.json --out render.png
  python3 render_room.py room.json --out render.png --view door|corner|window|top|app --width 1280 --samples 96
"""
import bpy, sys, os, json, math, argparse, base64, tempfile
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.environ.get('APT_PUBLIC', os.path.join(os.path.dirname(HERE), 'public'))
DOOR = 0.85
SHELL = []   # the walls and ceiling of the room being rendered
GLASS = []   # the area of each window, filled in by build_room
LAMPS = {}   # each lamp's bulb, by the lamp piece's id


def material(name, colour, rough=0.9):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*colour, 1); b.inputs['Roughness'].default_value = rough
    return m


def floor_material(width, length):
    """The same three oak images the app uses, repeated every 2.4 m."""
    m = bpy.data.materials.new('floor'); m.use_nodes = True; nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    coord = nt.nodes.new('ShaderNodeTexCoord'); scale = nt.nodes.new('ShaderNodeMapping')
    scale.inputs['Scale'].default_value = (width / 2.4, length / 2.4, 1)
    nt.links.new(coord.outputs['UV'], scale.inputs['Vector'])
    def image(kind, colour_data):
        t = nt.nodes.new('ShaderNodeTexImage')
        t.image = bpy.data.images.load(os.path.join(PUBLIC, 'textures', f'floor-oak-{kind}.jpg'))
        if not colour_data: t.image.colorspace_settings.name = 'Non-Color'
        nt.links.new(scale.outputs[0], t.inputs['Vector']); return t
    nt.links.new(image('colour', True).outputs['Color'], b.inputs['Base Color'])
    nt.links.new(image('roughness', False).outputs['Color'], b.inputs['Roughness'])
    bump = nt.nodes.new('ShaderNodeNormalMap'); bump.inputs['Strength'].default_value = 0.6
    nt.links.new(image('normal', False).outputs['Color'], bump.inputs['Color'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def photo_file(data_url, name):
    """The app puts a floor or wall photo inside the room file as a data URL. Save it as a picture file."""
    path = os.path.join(tempfile.gettempdir(), f'apt-studio-{name}.jpg')
    with open(path, 'wb') as f: f.write(base64.b64decode(data_url.split(',', 1)[1]))
    return path


def hex_colour(text):
    """'#F4F3EF' as Blender's linear red, green, blue."""
    return tuple((int(text[i:i + 2], 16) / 255) ** 2.2 for i in (1, 3, 5))


def photo_floor_material(width, length, floor):
    """Your own floor photo, repeated mirrored so one copy covers `span` metres across (as in the app)."""
    m = bpy.data.materials.new('floor'); m.use_nodes = True; nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'); b.inputs['Roughness'].default_value = 0.75
    coord = nt.nodes.new('ShaderNodeTexCoord'); scale = nt.nodes.new('ShaderNodeMapping')
    scale.inputs['Scale'].default_value = (width / floor['span'], length / (floor['span'] / floor['aspect']), 1)
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(photo_file(floor['photo'], 'floor')); t.extension = 'MIRROR'
    nt.links.new(coord.outputs['UV'], scale.inputs['Vector']); nt.links.new(scale.outputs[0], t.inputs['Vector'])
    nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    return m


def photo_wall_material(wall):
    """Your own wall photo. It is laid on by position in the room, so every wall gets it at the same
    real size: `span` metres across, span / aspect metres up. Across a wall is x on the back and front
    walls and y on the side walls; the other one is constant there, so x + y works for all four."""
    m = bpy.data.materials.new('wall'); m.use_nodes = True; nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'); b.inputs['Roughness'].default_value = 0.95
    where = nt.nodes.new('ShaderNodeNewGeometry'); split = nt.nodes.new('ShaderNodeSeparateXYZ')
    across = nt.nodes.new('ShaderNodeMath'); across.operation = 'ADD'; join = nt.nodes.new('ShaderNodeCombineXYZ')
    scale = nt.nodes.new('ShaderNodeMapping')
    scale.inputs['Scale'].default_value = (1 / wall['span'], wall['aspect'] / wall['span'], 1)
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(photo_file(wall['photo'], 'wall')); t.extension = 'MIRROR'
    nt.links.new(where.outputs['Position'], split.inputs[0])
    nt.links.new(split.outputs['X'], across.inputs[0]); nt.links.new(split.outputs['Y'], across.inputs[1])
    nt.links.new(across.outputs[0], join.inputs['X']); nt.links.new(split.outputs['Z'], join.inputs['Y'])
    nt.links.new(join.outputs[0], scale.inputs['Vector']); nt.links.new(scale.outputs[0], t.inputs['Vector'])
    nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    return m


def plane(size, loc, rot, mat):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object; o.scale = (size[0], size[1], 1); o.data.materials.append(mat); return o


def box(size, loc, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object; o.scale = size; o.data.materials.append(mat); return o


def kelvin_colour(kelvin):
    """The colour of a light from its Kelvin number (the same curve fit the app uses), in Blender's linear colours."""
    t = kelvin / 100.0
    r = 255 if t <= 66 else 329.7 * (t - 60) ** -0.1332
    g = 99.47 * math.log(t) - 161.12 if t <= 66 else 288.12 * (t - 60) ** -0.0755
    b = 255 if t >= 66 else (0 if t <= 19 else 138.52 * math.log(t - 10) - 305.04)
    return tuple((min(255, max(0, v)) / 255) ** 2.2 for v in (r, g, b))


# Blender measures a bulb in watts of light, not the watts printed on the box.
# lumens / 683 * 4 * pi is the usual conversion for a bulb that shines all round.
def bulb_watts(lumens):
    return lumens / 683.0 * 4 * math.pi


def bulb(location, kelvin, lumens, size=0.06):
    d = bpy.data.lights.new('bulb', 'POINT'); d.energy = bulb_watts(lumens); d.color = kelvin_colour(kelvin); d.shadow_soft_size = size
    o = bpy.data.objects.new('bulb', d); bpy.context.scene.collection.objects.link(o); o.location = location
    return o


def openings_of(room, kind):
    """The room's windows (kind 'windows') or doors (kind 'doors') as the app describes them: which wall,
    how far along, how wide, and for a window its bottom and top. They are turned into Blender positions:
    'at' is the middle of the opening at floor level on the wall's inner face, 'inward' points into the room
    and 'along' runs along the wall. A room file from before these could be placed gets the one window and
    the one door it used to have."""
    W, L = room['width'], room['length']
    if kind == 'windows':
        wins = room.get('windows') or [dict(wall='back', along=0.5 + 1 / 6, width=min(1.2, W - 0.6), bottom=0.9, top=2.0)]
        clear = 0.15                                              # a window stays 15 cm from a corner
    else:
        wins = room.get('doors') or [dict(wall='left', along=1 - (DOOR / 2 + 0.02) / L, width=DOOR)]
        wins = [dict(w, bottom=0, top=2.0) for w in wins]
        clear = 0.02                                              # a door may sit right in the corner
    out = []
    for win in wins:
        across = win['wall'] in ('back', 'front')            # does the wall run across the room (x)?
        length = W if across else L
        half = min(win['width'], length - clear * 2) / 2
        limit = length / 2 - clear - half
        u = min(max((win['along'] - 0.5) * length, -limit), limit)
        top = min(win['top'], room['height'] - 0.1); bottom = max(0, min(win['bottom'], top - 0.3))
        # app axes (x, z) for the wall's place and inward direction, then Blender axes (x, -z)
        if win['wall'] == 'back': x, z, ix, iz = u, -L / 2, 0, 1
        elif win['wall'] == 'front': x, z, ix, iz = u, L / 2, 0, -1
        elif win['wall'] == 'left': x, z, ix, iz = -W / 2, u, 1, 0
        else: x, z, ix, iz = W / 2, u, -1, 0
        out.append(dict(at=Vector((x, -z, 0)), inward=Vector((ix, -iz, 0)), along=Vector((1, 0, 0)) if across else Vector((0, 1, 0)),
                        half=half, bottom=bottom, top=top,
                        hinge=win.get('hinge', 'left'), shut=bool(win.get('shut'))))   # doors only: hinge edge, open or shut
    return out


def build_room(room, lighting=None, surfaces=None):
    """App axes: x across, z toward the front, y up.  Blender axes: x across, y toward the BACK, z up."""
    W, L, H = room['width'], room['length'], room['height']
    # 'lighting' comes from the app: is it day, where the sun is, the fixed lights, each lamp's bulb
    sun = (lighting or {}).get('sun') or dict(up=True, direct=False, strength=1.0, kelvin=5500, direction=[0, 1, 0])
    daylight = lighting is None or (lighting.get('daylight', True) and sun['up'])
    # 'surfaces' comes from the app too: the floor is oak or your photo, the walls are paint or your photo
    floor_is = (surfaces or {}).get('floor') or {}; wall_is = (surfaces or {}).get('wall') or {}
    if wall_is.get('kind') == 'photo' and wall_is.get('photo'): wall = photo_wall_material(wall_is)
    else: wall = material('wall', hex_colour(wall_is.get('color', '#F4F3EF')))
    trim = material('trim', (0.95, 0.95, 0.94), 0.5)
    photo_floor = floor_is.get('kind') == 'photo' and floor_is.get('photo')
    plane((W, L), (0, 0, 0), (0, 0, 0), photo_floor_material(W, L, floor_is) if photo_floor else floor_material(W, L))
    # each wall and the ceiling is kept with a point on it and the direction that points into the room
    SHELL.clear()
    SHELL.append((plane((W, L), (0, 0, H), (math.pi, 0, 0), material('ceiling', (0.96, 0.96, 0.95))), (0, 0, H), (0, 0, -1)))
    SHELL.append((plane((W, H), (0, L / 2, H / 2), (math.pi / 2, 0, 0), wall), (0, L / 2, 0), (0, -1, 0)))             # back wall
    SHELL.append((plane((W, H), (0, -L / 2, H / 2), (-math.pi / 2, 0, 0), wall), (0, -L / 2, 0), (0, 1, 0)))           # front wall
    SHELL.append((plane((L, H), (-W / 2, 0, H / 2), (math.pi / 2, 0, math.pi / 2), wall), (-W / 2, 0, 0), (1, 0, 0)))  # left wall
    SHELL.append((plane((L, H), (W / 2, 0, H / 2), (math.pi / 2, 0, -math.pi / 2), wall), (W / 2, 0, 0), (-1, 0, 0)))  # right wall
    for x, y, sx, sy in ((0, L / 2 - 0.008, W, 0.016), (0, -L / 2 + 0.008, W, 0.016),
                         (-W / 2 + 0.008, 0, 0.016, L), (W / 2 - 0.008, 0, 0.016, L)):
        box((sx, sy, 0.09), (x, y, 0.045), trim)                             # skirting boards
    # The doors, where the app put them. The walls here are flat sheets, so a doorway is drawn as a
    # dim panel on the wall (the hall behind it) with a frame round it, and the door itself stands
    # open 75 degrees into the room on its hinge, as in the app, or shut in the doorway. The hinge is
    # at the door's left or right edge as you face the wall from inside, as the app says.
    door_mat = material('door', (0.93, 0.92, 0.90), 0.45); handle = material('handle', (0.25, 0.25, 0.25), 0.3)
    hall = material('hall', (0.20, 0.19, 0.18), 0.95)
    for door in openings_of(room, 'doors'):
        at, inward, along, half = door['at'], door['inward'], door['along'], door['half']
        def dbox(size_along, size_deep, size_up, a, d, h, mat):                # a box lined up with the wall
            dims = (size_along, size_deep, size_up) if abs(along.x) > 0.5 else (size_deep, size_along, size_up)
            return box(dims, at + along * a + inward * d + Vector((0, 0, h)), mat)
        if not door['shut']: dbox(half * 2, 0.006, 2.0, 0, 0.004, 1.0, hall)   # the doorway, seen past the open door
        dbox(0.06, 0.05, 2.0, -half - 0.03, 0.025, 1.0, trim)                  # the frame's two sides stop under its top
        dbox(0.06, 0.05, 2.0, half + 0.03, 0.025, 1.0, trim)
        dbox(half * 2 + 0.12, 0.05, 0.06, 0, 0.025, 2.03, trim)
        right = Vector((-inward.y, inward.x, 0))                               # to your right as you face the wall from inside
        closed = right if door['hinge'] == 'left' else -right                  # the way the shut door points from its hinge
        hinge = at - closed * half + inward * 0.03                             # 3 cm clear of the wall
        swing = 0 if door['shut'] else math.radians(75)
        leaf_way = closed * math.cos(swing) + inward * math.sin(swing)         # the way the open door points
        face = Vector((-leaf_way.y, leaf_way.x, 0))                            # square to the door's face
        leaf = box((half * 2 - 0.02, 0.04, 1.98), hinge + leaf_way * half + Vector((0, 0, 1.0)), door_mat)
        leaf.rotation_euler = (0, 0, math.atan2(leaf_way.y, leaf_way.x))
        for side in (-1, 1):                                                   # a knob on each face
            knob = box((0.05, 0.05, 0.05), hinge + leaf_way * (half * 2 - 0.09) + face * 0.04 * side + Vector((0, 0, 1.0)), handle)
            knob.rotation_euler = leaf.rotation_euler
    # The windows, where the app put them. A bright pane stands in for daylight coming through each one.
    pane = bpy.data.materials.new('daylight'); pane.use_nodes = True
    e = pane.node_tree.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (0.86, 0.93, 1.0, 1) if daylight else (0.02, 0.03, 0.06, 1); e.inputs['Strength'].default_value = 4 if daylight else 1
    pane.node_tree.links.new(e.outputs[0], pane.node_tree.nodes['Material Output'].inputs['Surface'])
    def area(loc, size, power, look_at, colour=(1, 1, 1)):
        d = bpy.data.lights.new('light', 'AREA'); d.size = size; d.energy = power; d.color = colour
        o = bpy.data.objects.new('light', d); bpy.context.scene.collection.objects.link(o); o.location = loc
        o.rotation_euler = (Vector(look_at) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    sky = 0.4 + 0.6 * sun['strength']
    GLASS.clear()
    for win in openings_of(room, 'windows'):
        GLASS.append((win['half'] * 2) * (win['top'] - win['bottom']))       # square metres of glass, for the exposure
        at, inward, along = win['at'], win['inward'], win['along']
        wide, tall, mid = win['half'] * 2, win['top'] - win['bottom'], (win['top'] + win['bottom']) / 2
        up = Vector((0, 0, 1))
        def put(a=0.0, d=0.0, h=0.0):                                         # a point: a along the wall, d into the room, h up
            return at + along * a + inward * d + up * h
        def wbox(size_along, size_deep, size_up, a, d, h, mat):                # a box lined up with the wall
            dims = (size_along, size_deep, size_up) if abs(along.x) > 0.5 else (size_deep, size_along, size_up)
            return box(dims, put(a, d, h), mat)
        bpy.ops.mesh.primitive_plane_add(size=1, location=put(0, 0.012, mid))
        o = bpy.context.object; o.scale = (wide, tall, 1); o.data.materials.append(pane)
        # turn the pane so it lies on the wall: its own x along the wall, its face toward the room
        o.rotation_euler = Matrix((along, inward.cross(along), inward)).transposed().to_euler()
        wbox(wide + 0.1, 0.08, 0.04, 0, 0.04, win['bottom'] - 0.02, trim)     # sill
        wbox(wide + 0.1, 0.03, 0.04, 0, 0.015, win['top'] + 0.02, trim)       # top of the frame
        for a in (-win['half'] - 0.02, 0, win['half'] + 0.02):                 # the frame's two sides and its middle bar
            wbox(0.04, 0.03, tall, a, 0.015, mid, trim)
        if daylight:
            # light from the sky through this window
            target = put(0, 3.0, 0); target.z = 0.4
            area(put(0, 0.15, mid), 1.1, 150 * sky, target, (1.0, 0.95, 0.88))
            # The sun itself, if it stands on the outer side of this wall: a narrow beam the size of
            # the window, pointing the way the sunlight travels.
            dx, dy, dz = sun['direction']                      # app axes, from the room toward the sun
            toward_sun = Vector((dx, -dz, dy))                 # Blender axes
            if toward_sun.dot(-inward) > 0.17:
                d = bpy.data.lights.new('sun through the window', 'AREA'); d.shape = 'RECTANGLE'; d.size = wide; d.size_y = tall
                d.spread = math.radians(12); d.energy = 2600 * sun['strength']; d.color = kelvin_colour(sun['kelvin'])
                o = bpy.data.objects.new('sun through the window', d); bpy.context.scene.collection.objects.link(o)
                o.location = put(0, 0.06, mid); o.rotation_euler = (-toward_sun).to_track_quat('-Z', 'Y').to_euler()
    if daylight:
        area((0, 0, H - 0.05), 0.9, 45 * sky, (0, 0, 0))                      # daylight's bounce off the ceiling, so far corners are not black
    # the lights fixed to the room, as described: each bulb's place, colour (Kelvin) and brightness (lumens)
    for light in (lighting or {}).get('fixed', []):
        for x, y, z in light['points']:
            bulb((x, -z, y), light['kelvin'], light['lumens'] / len(light['points']), size=0.1 if light['kind'] == 'ceiling' else 0.04)
    return W, L, H


def place(piece):
    """Bring in one piece's model, give it the size the app gives it, and stand it where it stands in the app."""
    path = os.path.join(PUBLIC, piece['model'].lstrip('/'))
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in set(bpy.data.objects) - before]
    meshes = [o for o in new if o.type == 'MESH']
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    lo = Vector([min(p[i] for p in pts) for i in range(3)]); hi = Vector([max(p[i] for p in pts) for i in range(3)])
    size = piece['size']; cur = hi - lo
    # model axes after import: x = width, y = depth, z = height
    s = Vector((size['w'] / cur.x, size['d'] / cur.y, size['h'] / cur.z)); centre = (lo + hi) / 2
    holder = bpy.data.objects.new(piece['id'], None); bpy.context.scene.collection.objects.link(holder)
    for o in new:
        if o.parent is None:
            o.parent = holder
    for o in meshes:
        me = o.data
        mw = o.matrix_world.copy()
        for v in me.vertices:
            p = mw @ v.co
            v.co = Vector(((p.x - centre.x) * s.x, (p.y - centre.y) * s.y, (p.z - lo.z) * s.z))
        o.matrix_world = holder.matrix_world.copy(); o.parent = holder; o.matrix_parent_inverse.identity()
        o.location = (0, 0, 0); o.rotation_euler = (0, 0, 0); o.scale = (1, 1, 1)
    lamp = LAMPS.get(piece['id'])                 # this lamp's bulb, if the app sent one
    if lamp and lamp.get('on'):
        bulb((piece['x'], -piece['z'], size['h'] * 0.85), lamp['kelvin'], lamp['lumens'])
        for o in meshes:
            o.visible_shadow = False
    holder.location = (piece['x'], -piece['z'], 0)
    holder.rotation_euler = (0, 0, -math.radians(piece['rotation']))


def camera(view, W, L, H, width, height, pieces=(), app_camera=None):
    sc = bpy.context.scene
    cd = bpy.data.cameras.new('camera'); cam = bpy.data.objects.new('camera', cd); sc.collection.objects.link(cam); sc.camera = cam
    cd.sensor_width = 36
    if view == 'app':
        # The view that was on screen in the app. App axes (x, y up, z front) become Blender's (x, -z, y up).
        px, py, pz = app_camera['position']; dx, dy, dz = app_camera['direction']
        pos = Vector((px, -pz, py)); look = Vector((dx, -dz, dy))
        cam.location = pos; cam.rotation_euler = look.to_track_quat('-Z', 'Y').to_euler()
        cd.sensor_fit = 'VERTICAL'; cd.angle_y = math.radians(app_camera['fov']); cd.clip_start = 0.05; cd.clip_end = 500
        # The app looks in from outside, over low walls. Here: a wall the camera is behind is left out of
        # the picture, but still blocks and bounces light, so the room is lit as a closed room.
        for obj, point, inward in SHELL:
            if (pos - Vector(point)).dot(Vector(inward)) < 0:
                obj.visible_camera = False
        return
    if view == 'top':
        cd.type = 'ORTHO'; cd.ortho_scale = max(W, L * width / height) * 1.08
        cam.location = (0, 0, H - 0.01); cam.rotation_euler = (0, 0, 0); cd.clip_start = 0.02
        for o in sc.objects:
            if o.type == 'MESH' and o.data.materials and o.data.materials[0] and o.data.materials[0].name.startswith('ceiling'):
                o.hide_render = True
        return
    cd.lens = 17
    if view == 'window':        # standing with your back to the window, looking at the door side
        pos = Vector((W / 6, L / 2 - 0.35, 1.5)); target = Vector((-W * 0.2, -L / 2, 0.9))
    elif view == 'corner':      # from the front right corner, looking toward the window
        pos = Vector((W / 2 - 0.25, -L / 2 + 0.25, 1.5)); target = Vector((-W * 0.25, L / 2, 0.85))
    else:                       # 'door': what you see as you walk in
        pos = Vector((-W / 2 + 0.3, -L / 2 + DOOR / 2, 1.5)); target = Vector((W * 0.3, L / 2, 0.8))
    # a camera standing inside a tall piece sees the inside of it: say so instead of rendering nonsense quietly
    for piece in pieces:
        reach = max(piece['size']['w'], piece['size']['d']) / 2
        if piece['size']['h'] > 0.4 and (Vector((piece['x'], -piece['z'])) - pos.xy).length < reach:
            print('WARNING the', view, 'camera stands inside', piece['name'], '- try another --view')
    cam.location = pos; cam.rotation_euler = (target - pos).to_track_quat('-Z', 'Y').to_euler()
    cd.clip_start = 0.05


def render(state_path, out, view='door', width=1280, samples=64):
    state = json.load(open(state_path))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    lighting = state.get('lighting')
    LAMPS.clear(); LAMPS.update((lighting or {}).get('lamps', {}))
    W, L, H = build_room(state['room'], lighting, state.get('surfaces'))
    for piece in state['pieces']:
        place(piece)
    height = int(width * 2 / 3)
    if view == 'app':
        if 'camera' not in state:
            raise SystemExit('This room file has no camera in it. Download it again from the app, or use another --view.')
        height = int(width / state['camera']['aspect'])
    camera(view, W, L, H, width, height, state['pieces'], state.get('camera'))
    sc = bpy.context.scene
    sc.render.film_transparent = view in ('top', 'app')   # seen from outside there is nothing around the room: leave it see-through
    world = bpy.data.worlds.new('world'); world.use_nodes = True; sc.world = world
    daylight_now = lighting is None or (lighting.get('daylight', True) and (lighting.get('sun') or {}).get('up', True))
    world.node_tree.nodes['Background'].inputs[1].default_value = 0.05 if daylight_now else 0.004
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples
    sc.cycles.use_denoising = True; sc.cycles.max_bounces = 6
    sc.render.resolution_x = width; sc.render.resolution_y = height
    sc.render.image_settings.file_format = 'PNG'; sc.render.filepath = os.path.abspath(out)
    # A room with more glass is brighter. A camera would let in less light to match, so the picture
    # is exposed one stop down for every doubling of glass beyond one ordinary window (1.3 square metres).
    if daylight_now and sum(GLASS) > 1.32:
        sc.view_settings.exposure = -math.log2(sum(GLASS) / 1.32)
        print('EXPOSURE', round(sc.view_settings.exposure, 2), 'for', round(sum(GLASS), 2), 'm2 of glass')
    # AgX keeps bright areas from burning out to flat white, the way a camera does
    sc.view_settings.view_transform = 'AgX'
    try: sc.view_settings.look = 'AgX - Medium High Contrast'
    except Exception as e: print('look not set:', e)
    print('VIEW', sc.view_settings.view_transform, sc.view_settings.look)
    bpy.ops.render.render(write_still=True)
    print('RENDERED', out, f'{width}x{height}', samples, 'samples', len(state['pieces']), 'pieces')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('state'); ap.add_argument('--out', default='render.png')
    ap.add_argument('--view', default='door', choices=['door', 'corner', 'window', 'top', 'app'])
    ap.add_argument('--width', type=int, default=1280); ap.add_argument('--samples', type=int, default=64)
    a = ap.parse_args()
    render(a.state, a.out, a.view, a.width, a.samples)
