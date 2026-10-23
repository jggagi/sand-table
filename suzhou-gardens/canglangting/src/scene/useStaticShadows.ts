import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';

/** Garden geometry/light are static: moving the camera does not dirty light-space shadows. */
export function useStaticShadows(ready: boolean): void {
  const {gl,invalidate}=useThree();
  useLayoutEffect(()=>{
    if(!ready)return;
    const previous=gl.shadowMap.autoUpdate;
    gl.shadowMap.autoUpdate=false;
    gl.shadowMap.needsUpdate=true;
    invalidate(2);
    return ()=>{gl.shadowMap.autoUpdate=previous;gl.shadowMap.needsUpdate=true;};
  },[ready,gl,invalidate]);
}
