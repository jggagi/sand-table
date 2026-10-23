import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';

/** Geometry is static. Refresh light-space shadows only after a lighting change. */
export function useStaticShadows(ready:boolean,lightingRevision:string='dawn'):void {
  const {gl,invalidate}=useThree();
  useLayoutEffect(()=>{
    if(!ready)return;
    const previous=gl.shadowMap.autoUpdate;
    gl.shadowMap.autoUpdate=false;
    return ()=>{gl.shadowMap.autoUpdate=previous;gl.shadowMap.needsUpdate=true;};
  },[ready,gl]);
  useLayoutEffect(()=>{
    if(!ready)return;
    gl.shadowMap.needsUpdate=true;
    invalidate(2);
  },[ready,lightingRevision,gl,invalidate]);
}
