import { CatmullRomCurve3, Shape, Vector3 } from 'three';

export const POND_PROFILE: readonly (readonly [number, number])[] = [[-.48,-.25],[-.27,-.46],[.1,-.47],[.44,-.35],[.49,-.04],[.44,.35],[.16,.47],[-.16,.43],[-.47,.2]];
export function pondShape(width: number, depth: number, scale=1): Shape {
  const curve=new CatmullRomCurve3(POND_PROFILE.map(([x,z])=>new Vector3(x*width*scale,-z*depth*scale,0)),true,'catmullrom',.12);
  const points=curve.getPoints(100),shape=new Shape();
  shape.moveTo(points[0].x,points[0].y);
  points.slice(1).forEach(p=>shape.lineTo(p.x,p.y));shape.closePath();return shape;
}

/** Signed distance to the actual curved shoreline, in garden units. Positive inside. */
export function shoreDistance(x: number,z: number,outline: readonly {x:number;y:number}[]): number {
  let squared=Infinity,inside=false;
  const y=-z;
  for(let i=0,j=outline.length-1;i<outline.length;j=i++){
    const a=outline[j],b=outline[i],dx=b.x-a.x,dy=b.y-a.y;
    const t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1)));
    squared=Math.min(squared,(x-a.x-t*dx)**2+(y-a.y-t*dy)**2);
    if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }
  return Math.sqrt(squared)*(inside?1:-1);
}
