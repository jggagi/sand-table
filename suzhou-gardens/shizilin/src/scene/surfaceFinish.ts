import { type MeshStandardMaterial } from 'three';

/** Quiet, world-space micro-surfaces. No UV atlas, downloads or frame loop. */
export function finishMaterial(material: MeshStandardMaterial, name: string): void {
  const kind = name === 'water' ? 1 : name === 'wood' ? 2 : ['stone','bank'].includes(name) ? 3 : ['leaf','foliage'].includes(name) ? 4 : ['roof','tile'].includes(name) ? 5 : 0;
  material.roughness = [0.94,0.38,0.77,0.89,0.88,0.85][kind];
  material.metalness = 0;
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 vCraftPosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvCraftPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = `varying vec3 vCraftPosition;
      float craftHash(vec3 p) { return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453); }
      float craftNoise(vec3 p) {
        vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(mix(craftHash(i),craftHash(i+vec3(1,0,0)),f.x),mix(craftHash(i+vec3(0,1,0)),craftHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(craftHash(i+vec3(0,0,1)),craftHash(i+vec3(1,0,1)),f.x),mix(craftHash(i+vec3(0,1,1)),craftHash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
    ` + shader.fragmentShader;
    const treatment = kind === 1
      ? 'float ripples=sin(p.x*2.1+p.z*.7)*sin(p.z*3.1-p.x*.35); diffuseColor.rgb*=.98+.025*ripples;'
      : kind === 2
      ? 'float grain=sin(p.x*37.0+p.z*29.0+craftNoise(p*.7)*4.0);diffuseColor.rgb*=.91+.075*wash+.025*grain*detail;'
      : kind === 3
      ? 'diffuseColor.rgb*=.89+.15*wash+.025*fine*detail;float moss=(1.0-smoothstep(.08,.58,p.y))*.10*wash;diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.83,.94,.78),moss);'
      : kind === 4
      ? 'diffuseColor.rgb*=.94+.11*wash;'
      : kind === 5
      ? 'diffuseColor.rgb*=.91+.13*wash+.025*fine*detail;'
      : 'diffuseColor.rgb*=.95+.06*wash+.018*fine*detail;';
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      { vec3 p=vCraftPosition;float wash=craftNoise(p*.85);float fine=sin(p.x*81.0+p.z*63.0)*sin(p.y*87.0-p.x*19.0);float detail=1.0-smoothstep(.035,.15,length(fwidth(p)));${treatment} }
    `);
  };
  material.customProgramCacheKey = () => `garden-craft-v1-${kind}`;
  material.userData.craftSurface = name;
}

export function finishSurfaces(materials: Record<string, MeshStandardMaterial>): void {
  Object.entries(materials).forEach(([name,material]) => finishMaterial(material,name));
}
