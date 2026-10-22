import { Mesh, MeshStandardMaterial, type Group, type Object3D } from 'three';
import { finishMaterial } from './surfaceFinish';

/** Each mounted garden owns its cloned geometry/materials; loader cache stays intact. */
export function installCraftStone<T extends {group: Group; dispose: () => void}>(resources: T, asset: Object3D): T {
  const ids = ["stone-labyrinth"];
  const ownedMaterials = new Set<MeshStandardMaterial>();
  for (const id of ids) {
    const destination=resources.group.getObjectByName(id), original=asset.getObjectByName(id);
    if (!destination || !original) throw new Error(`精修石体缺少稳定对象：${id}`);
    const replacement=original.clone(true);
    replacement.name=`body-${id}:crafted-stone`;
    replacement.traverse(child => {
      if (!(child instanceof Mesh)) return;
      child.geometry=child.geometry.clone();
      const clone=(material: MeshStandardMaterial) => {
        const own=material.clone();finishMaterial(own,'stone');ownedMaterials.add(own);return own;
      };
      child.material=Array.isArray(child.material)?child.material.map(clone):clone(child.material);
      child.castShadow=true;child.receiveShadow=true;
    });
    for (const old of [...destination.children]) {
      old.traverse(child => {if(child instanceof Mesh)child.geometry.dispose();});
      destination.remove(old);
    }
    destination.add(replacement);
    destination.userData.craftAsset=true;
  }
  const dispose=resources.dispose;let released=false;
  return {...resources,dispose:()=>{if(released)return;released=true;dispose();ownedMaterials.forEach(material=>material.dispose());}};
}
