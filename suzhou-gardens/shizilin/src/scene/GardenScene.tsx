import { useStaticShadows } from './useStaticShadows';
import { useGLTF, useTexture } from '@react-three/drei';
import { installCraftStone } from './craftStone';
import { useEffect, useState } from 'react';
import { createGarden } from './geometry';
import WaterSurface from './WaterSurface';

/** Geometry and materials stay fixed for the lifetime of this scene. */
export default function GardenScene() {
  const asset = useGLTF(`${import.meta.env.BASE_URL}assets/craft-stone.glb`);
  const normal=useTexture(`${import.meta.env.BASE_URL}assets/stone-normal.png`);
  const [resources, setResources] = useState<ReturnType<typeof createGarden> | null>(null);
  useEffect(() => {
    // React StrictMode may repeat setup/cleanup. Every setup owns fresh resources.
    const nextResources = installCraftStone(createGarden(), asset.scene,normal);
    setResources(nextResources);
    return () => nextResources.dispose();
  }, [asset.scene,normal]);
  useStaticShadows(resources !== null);
  return resources ? <><primitive object={resources.group} dispose={null} /><WaterSurface group={resources.group} /></> : null;
}
