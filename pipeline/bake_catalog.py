"""bake_catalog.py - turn the catalog pieces into real 3D model files (.glb).

The pieces are drawn in Blender with wood, fabric and weave patterns that only Blender understands.
"Baking" paints those patterns into ordinary image textures (colour + surface bumps) so a web page can show them.

usage: python3 bake_catalog.py <name|all> [texture size] [out dir]
"""
import bpy, sys, os, math
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import furniture_lib as furn

ROUGH = dict(desk=0.5, chair=0.85, shelf=0.55, lamp=0.6, bed=0.9, plant=0.7, rug=0.97, sofa=0.92, armchair=0.92,
             dining_chair=0.6, tv_stand=0.5, wardrobe=0.55, side_table=0.45, floor_mirror=0.3, pouf=0.92)


def bake(name, res, out_dir):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    furn.OBJECTS[name]()
    ms = [o for o in sc.objects if o.type == 'MESH']
    for o in ms:
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
        bpy.ops.object.convert(target='MESH')
    bpy.ops.object.select_all(action='DESELECT')
    for o in ms: o.select_set(True)
    bpy.context.view_layer.objects.active = ms[0]
    bpy.ops.object.join()
    ob = bpy.context.object
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # one texture sheet for the whole piece
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004)
    bpy.ops.object.mode_set(mode='OBJECT')
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 6
    sc.render.bake.margin = 6
    images = {}
    for kind in ('color', 'normal', 'emit'):
        img = bpy.data.images.new(f'{name}_{kind}', res, res, alpha=False)
        if kind == 'normal': img.colorspace_settings.name = 'Non-Color'
        images[kind] = img
    has_emit = False
    for m in ob.data.materials:
        nt = m.node_tree
        b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
        b.inputs['Metallic'].default_value = 0.0          # metal bakes black otherwise
        if b.inputs['Emission Strength'].default_value > 0 and name == 'lamp': has_emit = True
        t = nt.nodes.new('ShaderNodeTexImage'); t.name = 'BAKE'
    def run(kind, btype, **kw):
        for m in ob.data.materials:
            t = m.node_tree.nodes['BAKE']; t.image = images[kind]
            for n in m.node_tree.nodes: n.select = False
            t.select = True; m.node_tree.nodes.active = t
        bpy.ops.object.bake(type=btype, **kw)
    run('color', 'DIFFUSE', pass_filter={'COLOR'})
    run('normal', 'NORMAL')
    if has_emit: run('emit', 'EMIT')
    tex = os.path.join(out_dir, 'tex'); os.makedirs(tex, exist_ok=True)
    paths = {}
    for kind, img in images.items():
        if kind == 'emit' and not has_emit: continue
        p = os.path.join(tex, f'{name}_{kind}.png'); img.filepath_raw = p; img.file_format = 'PNG'; img.save(); paths[kind] = p
    # one plain material that uses the baked images
    mat = bpy.data.materials.new(name + '_baked'); mat.use_nodes = True
    nt = mat.node_tree; b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    tc = nt.nodes.new('ShaderNodeTexImage'); tc.image = bpy.data.images.load(paths['color'])
    nt.links.new(tc.outputs['Color'], b.inputs['Base Color'])
    tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = bpy.data.images.load(paths['normal']); tn.image.colorspace_settings.name = 'Non-Color'
    nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(tn.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    if has_emit:
        te = nt.nodes.new('ShaderNodeTexImage'); te.image = bpy.data.images.load(paths['emit'])
        nt.links.new(te.outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = 1.0
    b.inputs['Roughness'].default_value = ROUGH.get(name, 0.6)
    ob.data.materials.clear(); ob.data.materials.append(mat)
    for p in ob.data.polygons: p.material_index = 0
    glb = os.path.join(out_dir, name + '.glb')
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', export_apply=True, export_yup=True,
                              export_image_format='JPEG', export_jpeg_quality=82, use_selection=True)
    d = ob.dimensions
    print('BAKED', name, 'verts', len(ob.data.vertices), 'size', round(d.x, 2), round(d.y, 2), round(d.z, 2), os.path.getsize(glb) // 1024, 'KB')


if __name__ == '__main__':
    which = sys.argv[1] if len(sys.argv) > 1 else 'all'
    res = int(sys.argv[2]) if len(sys.argv) > 2 else 1024
    out = sys.argv[3] if len(sys.argv) > 3 else os.path.join(HERE, 'out', 'catalog')
    os.makedirs(out, exist_ok=True)
    for n in (furn.OBJECTS if which == 'all' else which.split(',')):
        bake(n, res, out)
