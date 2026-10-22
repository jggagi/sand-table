import { useStaticShadows } from './useStaticShadows';
import { useGLTF } from '@react-three/drei';
import { installCraftStone } from './craftStone';
import { useEffect, useState } from 'react';
import { createGarden } from './geometry';

/** Geometry and materials stay fixed for the lifetime of this scene. */
export default function GardenScene() {
  const asset = useGLTF(`${import.meta.env.BASE_URL}assets/craft-stone.glb`);
  const [resources, setResources] = useState<ReturnType<typeof createGarden> | null>(null);
  useEffect(() => {
    // React StrictMode may repeat setup/cleanup. Every setup owns fresh resources.
    const nextResources = installCraftStone(createGarden(), asset.scene);
    setResources(nextResources);
    return () => nextResources.dispose();
  }, [asset.scene]);
  useStaticShadows(resources !== null);
  return resources ? <primitive object={resources.group} dispose={null} /> : null;
}
