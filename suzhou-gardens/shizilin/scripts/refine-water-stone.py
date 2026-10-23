"""Blender 4.3: shallow limestone folds, vertex AO, actual Cycles tangent-normal bake.

Input is this garden's previously authored GLB, copied into ignored runtime state.
Run: blender --background --factory-startup --python scripts/refine-water-stone.py
No downloaded models, texture assets or paid services.
"""
import bpy,math,json,hashlib,time
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

root=Path(__file__).resolve().parents[1]
source=root/'.sites-runtime/water-input.glb'
if hashlib.sha256(source.read_bytes()).hexdigest()!='cc92ba3697c36a730080f77f912e657cd24fbd0ce4ad295ce6194ea6ece31b70':
    raise RuntimeError('Expected the original craft-1 stone input; see water-1/ASSETS.md for the exact Git version.')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(source))
obj=next(o for o in bpy.context.scene.objects if o.type=='MESH')
bpy.context.view_layer.objects.active=obj;obj.select_set(True)
mesh=obj.data
for v in mesh.vertices:
    x,y,z=v.co
    # Carve shallow directional folds rather than scatter vertices randomly.
    fold=math.sin(z*3.8+x*1.1+.25*math.sin(y*2.1))
    groove=max(0,1-abs(fold)*3.5)**2
    fade=min(1,max(0,z/.38))
    displacement=(-.034*groove+.010*math.sin(y*8+z*2.1))*fade
    v.co+=v.normal*displacement
mesh.update();bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(69),island_margin=.016)
bpy.ops.object.mode_set(mode='OBJECT')
for face in mesh.polygons:face.use_smooth=True
mesh.update()

bvh=BVHTree.FromPolygons([v.co for v in mesh.vertices],[p.vertices for p in mesh.polygons],all_triangles=True)
color=mesh.color_attributes.get('COLOR_0') or mesh.color_attributes.active_color
if color:mesh.color_attributes.remove(color)
color=mesh.color_attributes.new(name='LimestoneWash',type='FLOAT_COLOR',domain='POINT')
mesh.color_attributes.active_color=color
for v in mesh.vertices:
    n=v.normal.normalized();t=n.cross(Vector((0,0,1)))
    if t.length<.01:t=n.cross(Vector((0,1,0)))
    t.normalize();b=n.cross(t).normalized();occlusion=0
    for i in range(24):
        radius=math.sqrt((i+.5)/24);angle=i*2.3999632297
        direction=(t*(radius*math.cos(angle))+b*(radius*math.sin(angle))+n*math.sqrt(1-radius*radius)).normalized()
        hit=bvh.ray_cast(v.co+n*.004,direction,1.05)
        if hit[0] is not None:occlusion+=1-min(1,hit[3]/1.05)*.55
    ao=1-.48*occlusion/24
    x,y,z=v.co;wash=.96+.04*math.sin(z*2.8+x*1.7)*math.cos(y*3.1)
    moss=max(0,1-z/.7)*(.5+.5*math.sin(x*3.4+y*2.2))*.1
    color.data[v.index].color=(.37*ao*wash*(1-moss),.378*ao*wash,.32*ao*wash*(1-moss*.6),1)

material=bpy.data.materials.new('Limestone with baked small folds');material.use_nodes=True
mesh.materials.clear();mesh.materials.append(material)
nodes=material.node_tree.nodes;links=material.node_tree.links;bsdf=nodes.get('Principled BSDF')
vertex=nodes.new('ShaderNodeVertexColor');vertex.layer_name=color.name
links.new(vertex.outputs['Color'],bsdf.inputs['Base Color']);bsdf.inputs['Roughness'].default_value=.89
coordinate=nodes.new('ShaderNodeTexCoord')
stretch=nodes.new('ShaderNodeVectorMath');stretch.operation='MULTIPLY';stretch.inputs[1].default_value=(2.1,2.1,.6)
links.new(coordinate.outputs['Generated'],stretch.inputs[0])
noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=18;noise.inputs['Detail'].default_value=2
links.new(stretch.outputs['Vector'],noise.inputs['Vector'])
bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.55;bump.inputs['Distance'].default_value=.055
links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],bsdf.inputs['Normal'])
image=bpy.data.images.new('Shizilin limestone tangent normal',width=1024,height=1024,alpha=False)
image.colorspace_settings.name='Non-Color'
target=nodes.new('ShaderNodeTexImage');target.image=image;nodes.active=target
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=8
scene.render.bake.margin=8;scene.render.bake.use_clear=True
bpy.ops.object.bake(type='NORMAL',normal_space='TANGENT')
output=root/'public/assets';output.mkdir(exist_ok=True,parents=True)
normal=output/'stone-normal.png';image.filepath_raw=str(normal);image.file_format='PNG';image.save()
# Runtime loads the normal separately, keeping GLB geometry verifiable in Node.
links.remove(bsdf.inputs['Normal'].links[0])
nodes.remove(target)
obj.name='stone-labyrinth'
properties=bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
kwargs={'filepath':str(output/'craft-stone.glb'),'export_format':'GLB','use_selection':True,'export_animations':False,'export_texcoords':True,'export_normals':True,'export_materials':'EXPORT','export_colors':True,'export_vertex_color':'MATERIAL','export_cameras':False,'export_lights':False,'export_yup':True,'export_extras':False}
bpy.ops.export_scene.gltf(**{k:v for k,v in kwargs.items() if k in properties})
def describe(p):return {'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
record={'tool':'Blender '+bpy.app.version_string,'input':describe(source),'source':'Previous original Shizilin craft-1 stone; no external asset','operations':['Shallow directional folds','Smart UV unwrap','24-ray vertex ambient occlusion','Cycles tangent-space normal bake, 1024 square, 8px margin','Y-up GLB with UV, separate local normal PNG'],'triangles':sum(len(p.vertices)-2 for p in mesh.polygons),'glb':describe(output/'craft-stone.glb'),'normal':describe(normal)}
folder=root/'docs/reviews/water-1';folder.mkdir(exist_ok=True,parents=True);(folder/'stone-assets.json').write_text(json.dumps(record,indent=2)+'\n')
print('WATER_STONE_RESULT '+json.dumps(record))
