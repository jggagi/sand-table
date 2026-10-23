import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Mesh, OrthographicCamera, type Group } from 'three';
import { PondWater } from './pondWater';
import type {TimeId} from '../data/garden.time';
import {isHostActive,subscribeHostActivity} from '../navigation/mapHost';

export default function WaterSurface({group,timeId}:{group:Group;timeId:TimeId}){
  const {gl,scene,camera,invalidate}=useThree(),water=useRef<PondWater|null>(null);
  useEffect(()=>{
    const mesh=group.getObjectByName('eastern-pond:water');
    if(!(mesh instanceof Mesh))throw new Error('没有找到独立池面');
    const coarse=matchMedia('(pointer: coarse)').matches;
    const pond=new PondWater(mesh,coarse);water.current=pond;window.__WATER__=pond.diagnostics;
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    let inView=true,timer:ReturnType<typeof setInterval>|undefined,last=performance.now(),time=0;
    const stop=()=>{if(timer!==undefined){clearInterval(timer);timer=undefined;}pond.diagnostics.active=false;};
    const sync=()=>{
      stop();last=performance.now();
      if(motion.matches||document.hidden||!inView||!isHostActive())return;
      pond.diagnostics.active=true;
      timer=setInterval(()=>{
        const now=performance.now();time+=Math.min(.2,(now-last)/1000);last=now;
        pond.setTime(time);pond.diagnostics.animationTicks++;invalidate();
      },1000/(coarse?12:24));
    };
    const observer=new IntersectionObserver(entries=>{inView=entries[0]?.isIntersecting??false;sync();},{threshold:.02});
    observer.observe(gl.domElement);motion.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
    const unsubscribe=subscribeHostActivity(sync);
    sync();invalidate(2);
    return()=>{
      unsubscribe();stop();observer.disconnect();motion.removeEventListener('change',sync);document.removeEventListener('visibilitychange',sync);
      if(window.__WATER__===pond.diagnostics)delete window.__WATER__;
      if(water.current===pond)water.current=null;pond.dispose();
    };
  },[group,gl,invalidate]);
  useFrame(()=>{if(water.current&&camera instanceof OrthographicCamera)water.current.update(gl,scene,camera,timeId);},-.5);
  return null;
}
