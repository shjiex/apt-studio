"""Procedural furniture + Cycles studio renders for Apt Studio tiles.
usage: python3 furn.py <name|all> [res] [samples]
"""
import bpy, bmesh, math, random, sys, os
from mathutils import Vector, Euler

OUT = os.environ.get('OUT', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'renders'))
os.makedirs(OUT, exist_ok=True)

# ---------- materials ----------
def L(c):
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)

def _bsdf(m):
    return next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')

def _set(b, name, val):
    if name in b.inputs:
        b.inputs[name].default_value = val

def plain(name, col, rough=0.5, metallic=0.0, coat=0.0, sheen=0.0, emit=None, emit_s=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = _bsdf(m)
    _set(b, 'Base Color', (*L(col), 1)); _set(b, 'Roughness', rough); _set(b, 'Metallic', metallic)
    _set(b, 'Coat Weight', coat); _set(b, 'Sheen Weight', sheen)
    if emit:
        _set(b, 'Emission Color', (*L(emit), 1)); _set(b, 'Emission Strength', emit_s)
    return m

def wood(name, c1, c2, axis='X', rough=0.55, freq=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = _bsdf(m)
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
    s = [16 * freq, 16 * freq, 16 * freq]; s['XYZ'.index(axis)] = 1.2 * freq
    mp.inputs['Scale'].default_value = s
    nz = nt.nodes.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = 5.0; nz.inputs['Detail'].default_value = 9.0
    if 'Distortion' in nz.inputs: nz.inputs['Distortion'].default_value = 1.2
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    e = ramp.color_ramp.elements
    e[0].position = 0.32; e[0].color = (*L(c1), 1); e[1].position = 0.72; e[1].color = (*L(c2), 1)
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.06
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs[0], nz.inputs['Vector'])
    nt.links.new(nz.outputs[0], ramp.inputs[0]); nt.links.new(ramp.outputs[0], b.inputs['Base Color'])
    nt.links.new(nz.outputs[0], bump.inputs['Height']); nt.links.new(bump.outputs[0], b.inputs['Normal'])
    _set(b, 'Roughness', rough); _set(b, 'Coat Weight', 0.05)
    return m

def fabric(name, col, weave=380.0, wrinkle=0.0, sheen=0.6, rough=0.92):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = _bsdf(m)
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = weave; nz.inputs['Detail'].default_value = 2.0
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.35; bump.inputs['Distance'].default_value = 0.002
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector']); nt.links.new(nz.outputs[0], bump.inputs['Height'])
    last = bump
    if wrinkle > 0:
        nz2 = nt.nodes.new('ShaderNodeTexNoise'); nz2.inputs['Scale'].default_value = 5.0; nz2.inputs['Detail'].default_value = 3.0
        b2 = nt.nodes.new('ShaderNodeBump'); b2.inputs['Strength'].default_value = wrinkle; b2.inputs['Distance'].default_value = 0.03
        nt.links.new(tc.outputs['Object'], nz2.inputs['Vector']); nt.links.new(nz2.outputs[0], b2.inputs['Height'])
        nt.links.new(bump.outputs[0], b2.inputs['Normal']); last = b2
    nt.links.new(last.outputs[0], b.inputs['Normal'])
    _set(b, 'Base Color', (*L(col), 1)); _set(b, 'Roughness', rough); _set(b, 'Sheen Weight', sheen)
    return m

def banded(name, c1, c2, scale=(3, 3, 26), rough=0.35):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = _bsdf(m)
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = scale
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 2.0; nz.inputs['Detail'].default_value = 4.0
    ramp = nt.nodes.new('ShaderNodeValToRGB'); e = ramp.color_ramp.elements
    e[0].position = 0.38; e[0].color = (*L(c1), 1); e[1].position = 0.62; e[1].color = (*L(c2), 1)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs[0], nz.inputs['Vector'])
    nt.links.new(nz.outputs[0], ramp.inputs[0]); nt.links.new(ramp.outputs[0], b.inputs['Base Color'])
    _set(b, 'Roughness', rough); _set(b, 'Coat Weight', 0.2)
    return m

def rugmat(name, base, stripe, border):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = _bsdf(m)
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
    # stripes along Y: sin(y*f) > t
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 26.0
    sn = nt.nodes.new('ShaderNodeMath'); sn.operation = 'SINE'
    gt = nt.nodes.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = 0.55
    nt.links.new(sep.outputs['X'], mul.inputs[0]); nt.links.new(mul.outputs[0], sn.inputs[0]); nt.links.new(sn.outputs[0], gt.inputs[0])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    mix.inputs['A'].default_value = (*L(base), 1); mix.inputs['B'].default_value = (*L(stripe), 1)
    nt.links.new(gt.outputs[0], mix.inputs['Factor'])
    # border: |y| > limit
    ab = nt.nodes.new('ShaderNodeMath'); ab.operation = 'ABSOLUTE'; nt.links.new(sep.outputs['Y'], ab.inputs[0])
    gb = nt.nodes.new('ShaderNodeMath'); gb.operation = 'GREATER_THAN'; gb.inputs[1].default_value = 0.56
    nt.links.new(ab.outputs[0], gb.inputs[0])
    mix2 = nt.nodes.new('ShaderNodeMix'); mix2.data_type = 'RGBA'; mix2.inputs['B'].default_value = (*L(border), 1)
    nt.links.new(mix.outputs['Result'], mix2.inputs['A']); nt.links.new(gb.outputs[0], mix2.inputs['Factor'])
    nt.links.new(mix2.outputs['Result'], b.inputs['Base Color'])
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 260.0
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.6; bump.inputs['Distance'].default_value = 0.004
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector']); nt.links.new(nz.outputs[0], bump.inputs['Height']); nt.links.new(bump.outputs[0], b.inputs['Normal'])
    _set(b, 'Roughness', 0.95); _set(b, 'Sheen Weight', 0.2)
    return m

# ---------- geometry ----------
def _finish(o, mat, bevel=0.004, segs=3, smooth=True):
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        bv = o.modifiers.new('bevel', 'BEVEL'); bv.width = bevel; bv.segments = segs; bv.limit_method = 'ANGLE'
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
        o.modifiers.new('wn', 'WEIGHTED_NORMAL')
    if mat: o.data.materials.append(mat)
    return o

def box(size, loc, mat, bevel=0.004, segs=3, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object; o.scale = size
    return _finish(o, mat, bevel, segs)

def cyl(r, h, loc, mat, rot=(0, 0, 0), r2=None, verts=48, bevel=0.002):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=loc, rotation=rot, vertices=verts)
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=h, location=loc, rotation=rot, vertices=verts)
    return _finish(bpy.context.object, mat, bevel, 2)

def leg(top, bottom, r_top, r_bot, mat):
    """tapered round leg between two points"""
    top = Vector(top); bottom = Vector(bottom); d = top - bottom
    mid = (top + bottom) / 2
    rot = d.to_track_quat('Z', 'Y').to_euler()
    bpy.ops.mesh.primitive_cone_add(radius1=r_bot, radius2=r_top, depth=d.length, location=mid, rotation=rot, vertices=32)
    return _finish(bpy.context.object, mat, 0.0015, 2)

def blade(h, w, lean, az, mat, fold=0.18, tilt=0.0):
    bm = bmesh.new(); n = 14; rows = []
    for i in range(n + 1):
        t = i / n
        ww = w * (0.55 + 0.45 * math.sin(math.pi * min(t * 1.15, 1.0))) * (1 - t ** 4) + 0.002
        z = h * t; y = lean * h * t * t
        rows.append((bm.verts.new((-ww / 2, y, z)), bm.verts.new((0, y - ww * fold, z)), bm.verts.new((ww / 2, y, z))))
    for a, b in zip(rows, rows[1:]):
        bm.faces.new((a[0], a[1], b[1], b[0])); bm.faces.new((a[1], a[2], b[2], b[1]))
    me = bpy.data.meshes.new('blade'); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('blade', me); bpy.context.collection.objects.link(o)
    o.rotation_euler = (-tilt, 0, az)
    for p in me.polygons: p.use_smooth = True
    so = o.modifiers.new('solid', 'SOLIDIFY'); so.thickness = 0.004
    sub = o.modifiers.new('sub', 'SUBSURF'); sub.levels = 1; sub.render_levels = 2
    me.materials.append(mat)
    return o

# ---------- objects ----------
WALNUT = ((0.36, 0.22, 0.13), (0.52, 0.34, 0.20))
OAK = ((0.72, 0.55, 0.36), (0.85, 0.69, 0.48))

def desk():
    wx = wood('walnut_x', *WALNUT, axis='X'); wz = wood('walnut_z', *WALNUT, axis='Z')
    brass = plain('brass', (0.83, 0.62, 0.30), 0.28, 1.0)
    W, D, H = 1.15, 0.58, 0.75
    box((W, D, 0.032), (0, 0, H - 0.016), wx, 0.006, 4)
    # drawer unit under the right side
    box((0.42, D - 0.08, 0.13), (W / 2 - 0.27, 0, H - 0.032 - 0.065), wx, 0.004)
    box((0.39, 0.012, 0.10), (W / 2 - 0.27, -(D - 0.08) / 2 - 0.004, H - 0.032 - 0.065), wx, 0.003)
    cyl(0.011, 0.02, (W / 2 - 0.27, -(D - 0.08) / 2 - 0.02, H - 0.032 - 0.065), brass, rot=(math.pi / 2, 0, 0))
    # apron
    box((W - 0.16, 0.018, 0.06), (0, D / 2 - 0.06, H - 0.032 - 0.03), wx, 0.003)
    for sx in (-1, 1):
        for sy in (-1, 1):
            leg((sx * (W / 2 - 0.07), sy * (D / 2 - 0.07), H - 0.032), (sx * (W / 2 - 0.035), sy * (D / 2 - 0.035), 0), 0.024, 0.013, wz)
    return dict(az=-32, el=20)

def chair():
    wz = wood('oak_z', *OAK, axis='Z'); wxm = wood('oak_x', *OAK, axis='X')
    fab = fabric('boucle', (0.80, 0.77, 0.70), weave=160.0, wrinkle=0.15)
    S = 0.46
    box((S, S, 0.075), (0, 0, 0.46), fab, 0.03, 8)
    box((S - 0.02, 0.065, 0.30), (0, S / 2 - 0.02, 0.77), fab, 0.03, 8, rot=(math.radians(-10), 0, 0))
    box((S - 0.06, S - 0.06, 0.03), (0, 0, 0.41), wxm, 0.004)
    for sx in (-1, 1):
        leg((sx * (S / 2 - 0.05), -(S / 2 - 0.05), 0.41), (sx * (S / 2 - 0.015), -(S / 2 - 0.0), 0), 0.02, 0.012, wz)
        # back legs run up into the backrest
        leg((sx * (S / 2 - 0.04), S / 2 + 0.03, 0.86), (sx * (S / 2 - 0.015), S / 2 + 0.01 - 0.03, 0), 0.017, 0.012, wz)
    return dict(az=-38, el=18)

def shelf():
    wx = wood('oak_x', *OAK, axis='X'); wz = wood('oak_z', *OAK, axis='Z')
    W, D, H = 0.8, 0.3, 1.6
    for sx in (-1, 1):
        box((0.022, D, H), (sx * (W / 2 - 0.011), 0, H / 2), wz, 0.003)
    zs = [0.06, 0.44, 0.82, 1.2, H - 0.011]
    for z in zs:
        box((W - 0.044, D - 0.01, 0.022), (0, 0, z), wx, 0.003)
    random.seed(4)
    cols = [(1.0, 0.75, 0.03), (1.0, 0.07, 0.03), (0.9, 0.9, 0.86), (0.28, 0.14, 0.9), (1.0, 0.2, 0.62), (0.02, 0.36, 0.11), (0.05, 0.05, 0.05), (0.85, 0.3, 0.1)]
    def books(z, x0, n, lean_last=False):
        x = x0
        for i in range(n):
            t = random.uniform(0.022, 0.045); h = random.uniform(0.2, 0.28); d = random.uniform(0.17, 0.22)
            c = random.choice(cols); m = plain('book', c, 0.6)
            rot = (0, math.radians(-14), 0) if (lean_last and i == n - 1) else (0, 0, 0)
            xo = 0.03 if rot[1] else 0
            box((t, d, h), (x + t / 2 + xo, -0.02, z + 0.011 + h / 2), m, 0.002, rot=rot)
            x += t + 0.002
    books(zs[3], -W / 2 + 0.04, 7, True)
    books(zs[2], -0.05, 8)
    books(zs[1], -W / 2 + 0.04, 5, True)
    cer = plain('ceramic', (0.9, 0.88, 0.84), 0.25, coat=0.5)
    cyl(0.07, 0.2, (-0.2, 0, zs[2] + 0.011 + 0.1), cer, r2=0.04, bevel=0.01)
    terr = plain('terracotta', (0.76, 0.40, 0.26), 0.8)
    cyl(0.06, 0.1, (0.2, 0, zs[1] + 0.011 + 0.05), terr, r2=0.075, bevel=0.004)
    leaf = banded('leaf', (0.10, 0.30, 0.14), (0.30, 0.52, 0.26))
    for i in range(7):
        o = blade(random.uniform(0.14, 0.24), 0.035, random.uniform(0.1, 0.3), i * 0.9 - math.pi / 2, leaf, tilt=math.radians(18))
        o.location = (0.2 + 0.015 * math.cos(i * 0.9), 0.015 * math.sin(i * 0.9), zs[1] + 0.011 + 0.09)
    # stacked books lying flat on the top shelf
    for i, c in enumerate([(0.9, 0.9, 0.86), (1.0, 0.75, 0.03), (0.05, 0.05, 0.05)]):
        box((0.24 - i * 0.02, 0.18, 0.03), (0.12, 0, zs[3] + 0.011 + 0.015 + i * 0.031), plain('bookf', c, 0.6), 0.002, rot=(0, 0, math.radians(4 * i - 4)))
    return dict(az=-30, el=14)

def lamp():
    blk = plain('black', (0.09, 0.09, 0.09), 0.45)
    brass = plain('brass', (0.83, 0.62, 0.30), 0.28, 1.0)
    shade = fabric('linen', (0.93, 0.88, 0.78), weave=300.0, sheen=0.3)
    b = _bsdf(shade); _set(b, 'Emission Color', (1.0, 0.72, 0.42, 1)); _set(b, 'Emission Strength', 1.4)
    cyl(0.15, 0.022, (0, 0, 0.011), blk, bevel=0.006)
    cyl(0.011, 1.32, (0, 0, 0.022 + 0.66), blk)
    cyl(0.018, 0.07, (0, 0, 1.36), brass)
    cyl(0.22, 0.27, (0, 0, 1.50), shade, r2=0.15, bevel=0.0)
    return dict(az=-25, el=10)

def bed():
    wx = wood('walnut_x', *WALNUT, axis='X'); wy = wood('walnut_y', *WALNUT, axis='Y'); wz = wood('walnut_z', *WALNUT, axis='Z')
    linen = fabric('linen_w', (0.90, 0.88, 0.84), weave=300.0, wrinkle=0.35)
    duvet = fabric('duvet', (0.74, 0.30, 0.15), weave=260.0, wrinkle=0.5, sheen=0.15)
    W, L = 1.5, 2.05
    for sx in (-1, 1):
        box((0.035, L, 0.2), (sx * (W / 2), 0, 0.3), wy, 0.004)
    box((W + 0.035, 0.035, 0.2), (0, -L / 2, 0.3), wx, 0.004)
    box((W + 0.08, 0.05, 0.95), (0, L / 2, 0.475 + 0.08), wx, 0.008, 4)
    for sx in (-1, 1):
        leg((sx * (W / 2 - 0.02), -L / 2 + 0.04, 0.2), (sx * (W / 2 - 0.02), -L / 2 + 0.04, 0), 0.03, 0.02, wz)
    box((W - 0.04, L - 0.06, 0.22), (0, 0, 0.47), linen, 0.06, 8)
    for sx in (-1, 1):
        box((0.62, 0.4, 0.15), (sx * 0.36, L / 2 - 0.32, 0.64), linen, 0.07, 8, rot=(math.radians(8), 0, math.radians(sx * 3)))
    box((W + 0.02, 1.28, 0.26), (0, -0.37, 0.485), duvet, 0.08, 8)
    box((W + 0.03, 0.2, 0.05), (0, 0.33, 0.6), linen, 0.024, 6)
    return dict(az=-38, el=24)

def plant():
    terr = plain('terracotta', (0.76, 0.40, 0.26), 0.8)
    soil = plain('soil', (0.16, 0.12, 0.09), 1.0)
    leaf = banded('leaf', (0.10, 0.30, 0.14), (0.32, 0.55, 0.26))
    cyl(0.12, 0.26, (0, 0, 0.13), terr, r2=0.16, bevel=0.006)
    cyl(0.168, 0.035, (0, 0, 0.26), terr, bevel=0.008)
    cyl(0.145, 0.01, (0, 0, 0.272), soil, bevel=0.0)
    random.seed(7)
    for i in range(12):
        ring = 0 if i < 4 else 1
        h = random.uniform(0.66, 0.9) if ring == 0 else random.uniform(0.4, 0.66)
        az = i * 2.399 + random.uniform(-0.2, 0.2)
        tilt = math.radians(random.uniform(2, 8) if ring == 0 else random.uniform(12, 26))
        o = blade(h, random.uniform(0.085, 0.115), random.uniform(0.0, 0.06) if ring == 0 else random.uniform(0.05, 0.16), az - math.pi / 2, leaf, tilt=tilt)
        r = 0.02 if ring == 0 else 0.065
        o.location = (r * math.cos(az), r * math.sin(az), 0.262)
    return dict(az=-30, el=12)

def rug():
    m = rugmat('rug', (0.90, 0.85, 0.74), (0.72, 0.28, 0.14), (0.16, 0.16, 0.16))
    box((2.0, 1.3, 0.016), (0, 0, 0.008), m, 0.006, 3)
    # fringe
    fr = fabric('fringe', (0.90, 0.86, 0.76), weave=600.0)
    for sx in (-1, 1):
        for i in range(52):
            y = -0.64 + i * (1.28 / 51)
            box((0.06, 0.012, 0.006), (sx * 1.03, y, 0.004), fr, 0.002, 2, rot=(0, 0, math.radians(random.uniform(-6, 6))))
    return dict(az=-34, el=30)

def sofa():
    fab = fabric('sofa', (0.22, 0.42, 0.34), weave=220.0, wrinkle=0.25)
    wz = wood('oak_z', *OAK, axis='Z')
    W, D = 1.8, 0.85
    box((W, D, 0.2), (0, 0, 0.28), fab, 0.05, 8)
    for i in (-1, 1):
        box((W / 2 - 0.13, D - 0.22, 0.15), (i * (W / 4 - 0.06), -0.08, 0.45), fab, 0.06, 8)
        box((W / 2 - 0.13, 0.2, 0.42), (i * (W / 4 - 0.06), D / 2 - 0.2, 0.68), fab, 0.07, 8, rot=(math.radians(-12), 0, 0))
        box((0.18, D + 0.03, 0.54), (i * (W / 2 - 0.07), 0, 0.44), fab, 0.06, 8)
    box((W - 0.04, 0.17, 0.6), (0, D / 2 - 0.07, 0.5), fab, 0.06, 8)
    for sx in (-1, 1):
        for sy in (-1, 1):
            leg((sx * (W / 2 - 0.1), sy * (D / 2 - 0.1), 0.19), (sx * (W / 2 - 0.07), sy * (D / 2 - 0.07), 0), 0.025, 0.015, wz)
    return dict(az=-32, el=18)

# ---------- more pieces (added 22 Nov for a larger catalog). Fronts face -Y, like the desk's drawer. ----------
def _four_legs(W, D, top, mat, inset=0.05, r_top=0.022, r_bot=0.013):
    for sx in (-1, 1):
        for sy in (-1, 1):
            leg((sx * (W / 2 - inset), sy * (D / 2 - inset), top), (sx * (W / 2 - inset + 0.02), sy * (D / 2 - inset + 0.02), 0), r_top, r_bot, mat)

def nightstand():
    wx = wood('walnut_x', *WALNUT, axis='X'); wz = wood('walnut_z', *WALNUT, axis='Z')
    brass = plain('brass', (0.83, 0.62, 0.30), 0.28, 1.0)
    W, D, H = 0.45, 0.40, 0.55
    box((W, D, 0.34), (0, 0, H - 0.17), wx, 0.006, 4)
    for z in (H - 0.09, H - 0.25):
        box((W - 0.04, 0.012, 0.14), (0, -D / 2 - 0.004, z), wx, 0.003)
        cyl(0.011, 0.02, (0, -D / 2 - 0.02, z), brass, rot=(math.pi / 2, 0, 0))
    _four_legs(W, D, H - 0.34, wz)
    return dict(az=-32, el=20)

def dresser():
    wx = wood('oak_x', *OAK, axis='X'); wz = wood('oak_z', *OAK, axis='Z')
    brass = plain('brass', (0.83, 0.62, 0.30), 0.28, 1.0)
    W, D, H, foot = 1.2, 0.45, 0.8, 0.12
    body = H - foot
    box((W, D, body), (0, 0, foot + body / 2), wx, 0.006, 4)
    for row in range(3):
        z = foot + (row + 0.5) * body / 3
        for sx in (-1, 1):
            box((W / 2 - 0.04, 0.012, body / 3 - 0.03), (sx * W / 4, -D / 2 - 0.004, z), wx, 0.003)
            cyl(0.012, 0.02, (sx * W / 4, -D / 2 - 0.02, z), brass, rot=(math.pi / 2, 0, 0))
    _four_legs(W, D, foot, wz)
    return dict(az=-32, el=18)

def coffee_table():
    wx = wood('walnut_x', *WALNUT, axis='X'); wz = wood('walnut_z', *WALNUT, axis='Z')
    W, D, H = 1.0, 0.55, 0.40
    box((W, D, 0.03), (0, 0, H - 0.015), wx, 0.006, 4)
    box((W - 0.16, D - 0.12, 0.018), (0, 0, 0.14), wx, 0.004)
    _four_legs(W, D, H - 0.03, wz, inset=0.06)
    return dict(az=-32, el=24)

def armchair():
    fab = fabric('armchair', (0.74, 0.50, 0.26), weave=200.0, wrinkle=0.2)
    wz = wood('oak_z', *OAK, axis='Z')
    W, D = 0.8, 0.8
    box((W, D, 0.18), (0, 0, 0.27), fab, 0.05, 8)
    box((W - 0.28, D - 0.2, 0.14), (0, -0.06, 0.43), fab, 0.06, 8)
    box((W - 0.28, 0.18, 0.40), (0, D / 2 - 0.18, 0.66), fab, 0.07, 8, rot=(math.radians(-12), 0, 0))
    for i in (-1, 1):
        box((0.16, D + 0.02, 0.50), (i * (W / 2 - 0.07), 0, 0.42), fab, 0.06, 8)
    box((W - 0.04, 0.15, 0.58), (0, D / 2 - 0.06, 0.48), fab, 0.06, 8)
    _four_legs(W, D, 0.19, wz, inset=0.1, r_top=0.025, r_bot=0.015)
    return dict(az=-34, el=18)

def dining_table():
    wx = wood('oak_x', *OAK, axis='X'); wz = wood('oak_z', *OAK, axis='Z')
    W, D, H = 1.4, 0.8, 0.75
    box((W, D, 0.035), (0, 0, H - 0.0175), wx, 0.006, 4)
    for sy in (-1, 1):
        box((W - 0.2, 0.02, 0.07), (0, sy * (D / 2 - 0.07), H - 0.035 - 0.035), wx, 0.003)
    for sx in (-1, 1):
        box((0.02, D - 0.2, 0.07), (sx * (W / 2 - 0.09), 0, H - 0.035 - 0.035), wx, 0.003)
    _four_legs(W, D, H - 0.035, wz, inset=0.08, r_top=0.03, r_bot=0.018)
    return dict(az=-32, el=22)

def bookcase():
    wx = wood('walnut_x', *WALNUT, axis='X')
    W, D, H, t = 1.0, 0.32, 0.9, 0.022
    for sx in (-1, 1):
        box((t, D, H), (sx * (W / 2 - t / 2), 0, H / 2), wx, 0.003)
    for z in (0.06, H / 2, H - t / 2):
        box((W - 2 * t, D, t), (0, 0, z), wx, 0.003)
    box((W - 2 * t, 0.008, H - 0.06), (0, D / 2 - 0.004, H / 2 + 0.03), wx, 0.002)
    # a few books on each shelf, in the colours of the design system
    colours = [(1.0, 0.31, 0.17), (1.0, 0.88, 0.23), (0.15, 0.28, 0.96), (0.12, 0.66, 0.35), (0.56, 0.42, 1.0), (0.95, 0.94, 0.9)]
    random.seed(4)
    for base in (0.06 + t / 2, H / 2 + t / 2):
        x = -W / 2 + t + 0.03
        for i in range(9):
            w = random.uniform(0.025, 0.05); h = random.uniform(0.2, 0.3)
            box((w, D - 0.1, h), (x + w / 2, -0.02, base + h / 2), plain(f'book{i}', colours[i % 6], 0.7), 0.002)
            x += w + 0.004
    return dict(az=-30, el=16)

# ---------- six more pieces (added 22 Nov, afternoon). Fronts face -Y, like the ones above. ----------
def dining_chair():
    wx = wood('oak_x', *OAK, axis='X'); wz = wood('oak_z', *OAK, axis='Z')
    pad = fabric('seat_pad', (0.31, 0.34, 0.31), weave=240.0, wrinkle=0.1)
    W, D, H, seat = 0.45, 0.50, 0.85, 0.45
    box((W - 0.03, D - 0.09, 0.028), (0, -0.03, seat - 0.014), wx, 0.006, 4)
    box((W - 0.07, D - 0.14, 0.03), (0, -0.035, seat + 0.012), pad, 0.014, 6)
    for sx in (-1, 1):
        # front legs stop under the seat; back legs run up and hold the backrest
        leg((sx * (W / 2 - 0.045), -(D / 2 - 0.06), seat - 0.028), (sx * (W / 2 - 0.022), -(D / 2 - 0.025), 0), 0.02, 0.012, wz)
        leg((sx * (W / 2 - 0.035), D / 2 - 0.03, H - 0.012), (sx * (W / 2 - 0.022), D / 2 - 0.085, 0), 0.016, 0.013, wz)
    # two rails across the back, leaning the same way as the back legs
    box((W - 0.07, 0.022, 0.11), (0, D / 2 - 0.036, H - 0.08), wx, 0.008, 4, rot=(math.radians(-4), 0, 0))
    box((W - 0.07, 0.018, 0.04), (0, D / 2 - 0.052, seat + 0.19), wx, 0.006, 3, rot=(math.radians(-4), 0, 0))
    return dict(az=-38, el=18)

def tv_stand():
    wx = wood('walnut_x', *WALNUT, axis='X'); wz = wood('walnut_z', *WALNUT, axis='Z')
    brass = plain('brass', (0.83, 0.62, 0.30), 0.28, 1.0)
    dark = plain('inside', (0.13, 0.10, 0.08), 0.8)
    W, D, H, foot, t = 1.5, 0.40, 0.50, 0.14, 0.022
    body = H - foot; zc = foot + body / 2
    box((W, D, t), (0, 0, H - t / 2), wx, 0.005, 4)
    box((W, D, t), (0, 0, foot + t / 2), wx, 0.004)
    for x in (-(W / 2 - t / 2), -W / 6, W / 6, W / 2 - t / 2):      # two ends and two dividers
        box((t, D - 0.004, body - 2 * t), (x, 0, zc), wx, 0.003)
    box((W - 2 * t, 0.008, body - 2 * t), (0, D / 2 - 0.008, zc), dark, 0.0)   # back panel, dark so the open middle reads as a hollow
    box((W / 3 - t, D - 0.04, 0.018), (0, 0.01, zc), wx, 0.003)               # one shelf in the open middle
    door_w = W / 3 - 1.5 * t - 0.006
    for sx in (-1, 1):                                                         # a door on each side, knob near the middle
        xc = sx * (W / 3 - t / 4)
        box((door_w, 0.016, body - 2 * t - 0.006), (xc, -D / 2 + 0.008, zc), wx, 0.003)
        cyl(0.011, 0.02, (xc - sx * (door_w / 2 - 0.04), -D / 2 - 0.01, zc + 0.05), brass, rot=(math.pi / 2, 0, 0))
    _four_legs(W, D, foot, wz, inset=0.07)
    return dict(az=-30, el=20)

def wardrobe():
    wx = wood('oak_x', *OAK, axis='X'); wz = wood('oak_z', *OAK, axis='Z')
    brass = plain('brass', (0.83, 0.62, 0.30), 0.28, 1.0)
    W, D, H, foot, lid = 1.0, 0.56, 1.9, 0.10, 0.03
    body = H - foot - lid                                                      # the body stops under the top, so no two faces share a plane
    box((W, D, body), (0, 0, foot + body / 2), wz, 0.006, 4)                   # the body, grain running up
    for sx in (-1, 1):                                                         # two doors, a long brass pull on each
        box((W / 2 - 0.012, 0.014, body - 0.03), (sx * W / 4, -D / 2 - 0.005, foot + body / 2), wz, 0.003)
        cyl(0.007, 0.26, (sx * 0.045, -D / 2 - 0.026, foot + body * 0.5), brass)
    box((W + 0.02, D + 0.01, lid), (0, 0, H - lid / 2), wx, 0.005, 3)          # the top sits a little proud of the body
    _four_legs(W, D, foot, wz, inset=0.06, r_top=0.026, r_bot=0.017)
    return dict(az=-30, el=12)

def side_table():
    wx = wood('walnut_x', *WALNUT, axis='X')
    blk = plain('black', (0.09, 0.09, 0.09), 0.45)
    R, H = 0.225, 0.50
    cyl(R, 0.024, (0, 0, H - 0.012), wx, bevel=0.005)                          # round top
    cyl(0.016, H - 0.036, (0, 0, 0.012 + (H - 0.036) / 2), blk)                # one stem
    cyl(0.15, 0.012, (0, 0, 0.006), blk, bevel=0.004)                          # a flat round foot
    return dict(az=-30, el=22)

def floor_mirror():
    wx = wood('oak_x', *OAK, axis='X'); wz = wood('oak_z', *OAK, axis='Z')
    # a real mirror cannot be baked into a picture, so the glass is a pale, glossy sheet with soft bands
    glass = banded('mirror', (0.70, 0.77, 0.82), (0.90, 0.93, 0.95), scale=(0.8, 0.8, 1.6), rough=0.08)
    W, H, t, lean = 0.60, 1.70, 0.03, math.radians(6)
    def tilted(size, x, y, z, mat, bevel):
        # every part is turned about the floor line (the X axis), so the whole mirror leans back together
        yy = y * math.cos(lean) + z * math.sin(lean); zz = -y * math.sin(lean) + z * math.cos(lean)
        return box(size, (x, yy, zz), mat, bevel, 3, rot=(-lean, 0, 0))
    for sx in (-1, 1):
        tilted((t, 0.028, H), sx * (W / 2 - t / 2), 0, H / 2, wz, 0.004)
    tilted((W - 2 * t, 0.028, t), 0, 0, H - t / 2, wx, 0.004)
    tilted((W - 2 * t, 0.028, t), 0, 0, t / 2, wx, 0.004)
    tilted((W - 2 * t, 0.006, H - 2 * t), 0, -0.006, H / 2, glass, 0.0)
    tilted((W - 2 * t, 0.006, H - 2 * t), 0, 0.006, H / 2, wx, 0.0)            # a board behind the glass
    # one strut behind holds it up, like an easel
    zs = 1.25; top = (0, 0.014 * math.cos(lean) + zs * math.sin(lean), zs * math.cos(lean))
    leg(top, (0, 0.36, 0), 0.012, 0.012, wz)
    return dict(az=-28, el=10)

def pouf():
    fab = fabric('pouf', (0.36, 0.44, 0.52), weave=140.0, wrinkle=0.25)
    R, H = 0.25, 0.40
    tall = H - 0.012 - 0.004                                                   # the base below, and the button 4 mm proud above
    bpy.ops.mesh.primitive_cylinder_add(radius=R, depth=tall, location=(0, 0, 0.012 + tall / 2), vertices=64)
    _finish(bpy.context.object, fab, 0.085, 8)                                 # a wide bevel rounds the top and bottom edges
    cyl(0.02, 0.012, (0, 0, H - 0.006), fab, bevel=0.004)                      # the button in the middle of the top
    cyl(R - 0.06, 0.012, (0, 0, 0.006), plain('pouf_base', (0.10, 0.10, 0.10), 0.7), bevel=0.002)   # a dark base lifts it off the floor
    return dict(az=-30, el=22)

OBJECTS = dict(desk=desk, chair=chair, shelf=shelf, lamp=lamp, bed=bed, plant=plant, rug=rug, sofa=sofa,
               nightstand=nightstand, dresser=dresser, coffee_table=coffee_table, armchair=armchair,
               dining_table=dining_table, bookcase=bookcase,
               dining_chair=dining_chair, tv_stand=tv_stand, wardrobe=wardrobe, side_table=side_table,
               floor_mirror=floor_mirror, pouf=pouf)

# ---------- scene ----------
def render(name, res=640, samples=96):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    view = OBJECTS[name]()
    meshes = [o for o in sc.objects if o.type == 'MESH']
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    c = (mn + mx) / 2; R = (mx - mn).length / 2
    # ground shadow catcher
    bpy.ops.mesh.primitive_plane_add(size=60, location=(c.x, c.y, 0)); g = bpy.context.object; g.is_shadow_catcher = True
    # camera
    az = math.radians(view['az']); el = math.radians(view['el'])
    cam_d = bpy.data.cameras.new('cam'); cam_d.lens = 90; cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam)
    fov = 2 * math.atan(18 / 90)
    dist = R / math.sin(fov / 2) * 1.0
    dirv = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
    cam.location = c + dirv * dist
    cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam_d.clip_end = 200; sc.camera = cam
    # lights (scaled to object size)
    def area(loc, size, power, col=(1, 1, 1)):
        d = bpy.data.lights.new('l', 'AREA'); d.size = size; d.energy = power; d.color = col
        o = bpy.data.objects.new('l', d); sc.collection.objects.link(o)
        o.location = c + Vector(loc) * R
        o.rotation_euler = (c - o.location).to_track_quat('-Z', 'Y').to_euler()
    area((-2.6, -2.4, 3.4), 3.2 * R, 190 * R * R, (1.0, 0.96, 0.9))
    area((3.2, -1.6, 1.6), 3.0 * R, 55 * R * R, (0.92, 0.96, 1.0))
    area((0.6, 3.4, 2.6), 2.0 * R, 110 * R * R)
    w = bpy.data.worlds.new('w'); w.use_nodes = True; sc.world = w
    bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (1, 1, 1, 1); bg.inputs[1].default_value = 0.28
    # render settings
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    try: sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception as e: print('denoiser', e)
    sc.cycles.max_bounces = 6; sc.cycles.use_adaptive_sampling = True; sc.cycles.adaptive_threshold = 0.03
    sc.render.film_transparent = True
    sc.render.resolution_x = res; sc.render.resolution_y = res; sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.threads_mode = 'AUTO'
    for look in ('AgX - Medium High Contrast', 'Medium High Contrast', 'AgX - Punchy'):
        try:
            sc.view_settings.look = look; break
        except Exception: pass
    sc.render.filepath = f'{OUT}/{name}.png'
    bpy.ops.render.render(write_still=True)
    print('RENDERED', name, sc.view_settings.view_transform, sc.view_settings.look)

if __name__ == '__main__':
    which = sys.argv[1] if len(sys.argv) > 1 else 'all'
    res = int(sys.argv[2]) if len(sys.argv) > 2 else 640
    smp = int(sys.argv[3]) if len(sys.argv) > 3 else 96
    for n in (OBJECTS if which == 'all' else which.split(',')):
        render(n, res, smp)
