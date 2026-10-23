import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildSync} from 'esbuild';
const root=path.resolve(import.meta.dirname,'..');
const key=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).name.split('-')[0];
const directory=path.join(root,'.sites-runtime');fs.mkdirSync(directory,{recursive:true});
const bundled=path.join(directory,'original-stone-geometry.mjs');
buildSync({entryPoints:[path.join(root,'src/scene/geometry.ts')],bundle:true,platform:'node',format:'esm',packages:'external',outfile:bundled});
const {createGarden}=await import(pathToFileURL(bundled).href+'?'+Date.now());
const resources=createGarden();
const ids=key==='liuyuan'?['guanyun-peak','guanyun-companion-west','guanyun-companion-east']:['stone-labyrinth'];
const objects=ids.map(id=>{
 const group=resources.group.getObjectByName(id);if(!group)throw Error('Missing '+id);
 const meshes=[];group.traverse(child=>{if(child.isMesh&&child.name.endsWith(':stone')){
  const geometry=child.geometry.index?child.geometry.toNonIndexed():child.geometry;
  meshes.push({positions:Array.from(geometry.attributes.position.array),colors:Array.from(geometry.attributes.color.array)});
 }});return {id,meshes};
});resources.dispose();
fs.writeFileSync(path.join(directory,'stone-input.json'),JSON.stringify({key,objects}));console.log(JSON.stringify({key,objects:ids}));
