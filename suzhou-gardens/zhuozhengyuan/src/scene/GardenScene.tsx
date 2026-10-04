import { useEffect, useState } from 'react';
import { createGarden } from './geometry';

/** Geometry and materials stay fixed for the lifetime of this scene. */
export default function GardenScene() {
  const [resources, setResources] = useState<ReturnType<typeof createGarden> | null>(null);
  useEffect(() => {
    // React StrictMode may repeat setup/cleanup. Every setup owns fresh resources.
    const nextResources = createGarden();
    setResources(nextResources);
    return () => nextResources.dispose();
  }, []);
  return resources ? <primitive object={resources.group} dispose={null} /> : null;
}
