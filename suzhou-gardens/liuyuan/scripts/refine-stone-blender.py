"""Refine this garden's own authored stone, bake vertex AO, export local GLB.

Reproduce after npm ci: node scripts/export-stone-input.mjs
blender --background --factory-startup --python scripts/refine-stone-blender.py
No remote assets, image synthesis, texture downloads or paid services.
"""
import bpy,bmesh,math,json,hashlib,time
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

root=Path(__file__).resolve().parents[1]
data=json.loads((root/'.sites-runtime/stone-input.json').read_text())
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
metadata=[]
for item in data['objects']:
    positions=[];colors=[]
    for mesh in item['meshes']:
        positions.extend(mesh['positions']);colors.extend(mesh['colors'])
    vertices=[(positions[i],-positions[i+2],positions[i+1]) for i in range(0,len(positions),3)]
    faces=[(i,i+1,i+2) for i in range(0,len(vertices),3)]
    mesh=bpy.data.meshes.new(item['id']);mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new(item['id'],mesh);bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000005);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free();mesh.update()
    # Preserve authored holes and major masses; soften the sampling facets.
    smooth=obj.modifiers.new('Soft limestone transitions','SMOOTH');smooth.factor=.20;smooth.iterations=2
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    # Deliberate shallow folds follow the stone, never random vertex scatter.
    extent=max(v.co.z for v in mesh.vertices)-min(v.co.z for v in mesh.vertices)
    for v in mesh.vertices:
        x,y,z=v.co
        ripple=math.sin(z*5.7+x*2.4)*math.sin(y*6.1+z*1.9)
        low=math.sin(x*2.6+z*2.0)*math.cos(y*3.4-z*.4)
        amplitude=.010 if data['key']=='liuyuan' else .014
        v.co+=v.normal*(amplitude*(.6*ripple+.4*low)*min(1,max(0,z/.22)))
    mesh.update()
    # Reduce browser geometry while retaining the original perforated topology.
    decimate=obj.modifiers.new('Mobile silhouette budget','DECIMATE');decimate.ratio=.78;decimate.use_collapse_triangulate=True
    bpy.ops.object.modifier_apply(modifier=decimate.name)
    for face in mesh.polygons:face.use_smooth=True
    mesh.update()
    bvh=BVHTree.FromPolygons([v.co for v in mesh.vertices],[p.vertices for p in mesh.polygons],all_triangles=True)
    attribute=mesh.color_attributes.new(name='StoneWash',type='FLOAT_COLOR',domain='POINT')
    samples=16;reach=.8 if data['key']=='liuyuan' else 1.0
    raw_base=(.462,.456,.366) if data['key']=='liuyuan' else (.358,.365,.301)
    minimum=min(v.co.z for v in mesh.vertices)
    for v in mesh.vertices:
        n=v.normal.normalized();t=n.cross(Vector((0,0,1)))
        if t.length<.01:t=n.cross(Vector((0,1,0)))
        t.normalize();b=n.cross(t).normalized();occluded=0
        for i in range(samples):
            radius=math.sqrt((i+.5)/samples);angle=i*2.3999632297
            direction=(t*(radius*math.cos(angle))+b*(radius*math.sin(angle))+n*math.sqrt(1-radius*radius)).normalized()
            hit=bvh.ray_cast(v.co+n*.004,direction,reach)
            if hit[0] is not None:occluded+=1-min(1,hit[3]/reach)*.7
        ao=1-.36*occluded/samples
        x,y,z=v.co
        wash=.965+.035*math.sin(z*3.3+x*2.2)*math.cos(y*4.2)
        moss=max(0,1-(z-minimum)/.65)*(.5+.5*math.sin(x*4+y*2))*.08
        rgb=[c*ao*wash for c in raw_base]
        rgb[0]*=1-moss;rgb[2]*=1-moss*.8
        attribute.data[v.index].color=(*rgb,1)
    mesh.color_attributes.active_color=attribute
    material=bpy.data.materials.new('Baked limestone '+item['id']);material.use_nodes=True
    nodes=material.node_tree.nodes;bsdf=nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.88
    color=nodes.new('ShaderNodeVertexColor');color.layer_name='StoneWash';material.node_tree.links.new(color.outputs['Color'],bsdf.inputs['Base Color'])
    mesh.materials.append(material)
    obj['artistic_asset']='Original garden geometry refined in Blender; not measured reconstruction'
    metadata.append({'id':item['id'],'vertices':len(mesh.vertices),'triangles':sum(len(p.vertices)-2 for p in mesh.polygons),'vertex_ao_samples':samples})
    obj.select_set(False)

bpy.ops.object.select_all(action='SELECT')
output=root/'public/assets/craft-stone.glb';output.parent.mkdir(parents=True,exist_ok=True)
properties=bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
kwargs={'filepath':str(output),'export_format':'GLB','use_selection':True,'export_animations':False,'export_texcoords':False,'export_normals':True,'export_materials':'EXPORT','export_colors':True,'export_vertex_color':'MATERIAL','export_cameras':False,'export_lights':False,'export_yup':True,'export_extras':False}
kwargs={k:v for k,v in kwargs.items() if k in properties}
bpy.ops.export_scene.gltf(**kwargs)
receipt={'tool':'Blender '+bpy.app.version_string,'source':'This garden original procedural stone; no external model','operations':['Weld','Smooth x2','Shallow directed folds','Decimate 0.78','16-ray baked vertex ambient occlusion','GLB export Y-up'],'meshes':metadata,'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest()}
report=root/'docs/reviews/craft-1/stone-asset.json';report.parent.mkdir(parents=True,exist_ok=True);report.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
print('CRAFT_RESULT '+json.dumps(receipt,ensure_ascii=False))
