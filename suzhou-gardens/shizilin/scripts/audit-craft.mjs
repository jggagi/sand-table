import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildSync} from 'esbuild';
import {Box3,Mesh} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
const root=path.resolve(import.meta.dirname,'..'), key=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).name.split('-')[0];
const output=path.join(root,'.sites-runtime/audit-geometry.mjs');fs.mkdirSync(path.dirname(output),{recursive:true});
buildSync({entryPoints:[path.join(root,'src/scene/geometry.ts')],bundle:true,platform:'node',format:'esm',packages:'external',outfile:output});
let {createGarden}=await import(pathToFileURL(output).href+'?'+Date.now()), resources=createGarden();
if(['liuyuan','shizilin'].includes(key)){
 const helper=path.join(root,'.sites-runtime/audit-craft-install.mjs');
 buildSync({entryPoints:[path.join(root,'src/scene/craftStone.ts')],bundle:true,platform:'node',format:'esm',packages:'external',outfile:helper});
 const {installCraftStone}=await import(pathToFileURL(helper).href+'?'+Date.now());
 const bytes=fs.readFileSync(path.join(root,'public/assets/craft-stone.glb'));
 const raw=await new GLTFLoader().parseAsync(new Uint8Array(bytes).buffer,'');resources=installCraftStone(resources,raw.scene);
}
let meshes=0,triangles=0,vertices=0;const materials=new Set();
resources.group.traverse(o=>{if(o instanceof Mesh){meshes++;const pos=o.geometry.attributes.position;vertices+=pos.count;triangles+=(o.geometry.index?.count??pos.count)/3;if(!Array.from(pos.array).every(Number.isFinite))throw Error('Nonfinite geometry');for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
const limits={liuyuan:200000,wangshiyuan:150000,zhuozhengyuan:150000,shizilin:170000,canglangting:160000};if(triangles>=limits[key])throw Error(`Geometry budget exceeded: ${triangles}/${limits[key]}`);
const box=new Box3().setFromObject(resources.group);
const result={garden:key,meshes,triangles,vertices,triangleBudget:limits[key],materials:materials.size,bounds:{min:box.min.toArray(),max:box.max.toArray()},surfaces:[...materials].map(m=>({name:m.userData.craftSurface,roughness:m.roughness,metalness:m.metalness})),finite:true};
resources.dispose();resources.dispose();
const review=process.env.GARDEN_REVIEW_DIR||'craft-1';if(!/^[a-z0-9-]+$/.test(review))throw Error('Invalid review directory');
const folder=path.join(root,'docs/reviews',review);fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'geometry-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
