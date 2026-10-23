import {
  Color, DataTexture, LinearFilter, Matrix4, Mesh, MeshStandardMaterial, NoColorSpace,
  OrthographicCamera, Plane, RGBAFormat, Vector3, Vector4, WebGLRenderTarget,
  type Scene, type WebGLRenderer,
} from 'three';
import { SCENE_OBJECTS } from '../data/garden.layout';
import { pondShape, shoreDistance } from './pondShape';

const pond=SCENE_OBJECTS.find(o=>o.id==='eastern-pond')!;
if(pond.geometry.kind!=='pond')throw new Error('池面配置错误');
const POND={x:pond.position[0],z:pond.position[2],width:pond.geometry.width,depth:pond.geometry.depth,height:.125};
const UP=new Vector3(0,1,0);
const BIAS=new Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);

export interface WaterDiagnostics {
  captures: number; animationTicks: number; reflectionSize: number; active: boolean;
  time: number; mode: 'planar'|'surface';
}
declare global {interface Window {__WATER__?: WaterDiagnostics}}

export function updateMirrorCamera(source: OrthographicCamera,mirror: OrthographicCamera,height=POND.height): void {
  source.updateMatrixWorld();
  mirror.copy(source,false);
  const direction=source.getWorldDirection(new Vector3());
  mirror.position.set(source.position.x,2*height-source.position.y,source.position.z);
  mirror.up.set(0,1,0).applyQuaternion(source.quaternion).reflect(UP);
  direction.reflect(UP);mirror.lookAt(mirror.position.clone().add(direction));
  mirror.updateMatrixWorld();
  // Preserve the orthographic frustum/zoom; global world-plane clipping is used
  // instead of the perspective oblique-projection formula in stock Reflector.
  mirror.projectionMatrix.copy(source.projectionMatrix);
  mirror.projectionMatrixInverse.copy(source.projectionMatrixInverse);
}

export function createShoreTexture(size=128): DataTexture {
  const outline=pondShape(POND.width,POND.depth).getPoints();
  const data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const distance=shoreDistance(((x+.5)/size-.5)*POND.width,((y+.5)/size-.5)*POND.depth,outline);
    const value=Math.round(255*Math.max(0,Math.min(1,distance/1.6))),i=(y*size+x)*4;
    data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
  }
  const texture=new DataTexture(data,size,size,RGBAFormat);
  texture.minFilter=texture.magFilter=LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
  return texture;
}

/** Owned by one mounted pond. Does not own any scene geometry or original material. */
export class PondWater {
  readonly target: WebGLRenderTarget;
  readonly material: MeshStandardMaterial;
  readonly shore=createShoreTexture();
  readonly mirror=new OrthographicCamera();
  readonly textureMatrix=new Matrix4();
  readonly clipPlane=new Plane(UP.clone(),-POND.height-.006);
  readonly diagnostics: WaterDiagnostics;
  private readonly original: Mesh['material'];
  private readonly lastWorld=new Matrix4();
  private readonly lastProjection=new Matrix4();
  private readonly viewDirection=new Vector3();
  private readonly uniforms;
  private dirty=true;
  private disposed=false;

  constructor(readonly mesh: Mesh,coarse: boolean){
    this.original=mesh.material;
    const size=coarse?256:512;
    this.target=new WebGLRenderTarget(size,size,{minFilter:LinearFilter,magFilter:LinearFilter,depthBuffer:true});
    this.target.texture.colorSpace=NoColorSpace;this.target.texture.generateMipmaps=false;
    this.diagnostics={captures:0,animationTicks:0,reflectionSize:size,active:false,time:0,mode:'planar'};
    this.material=new MeshStandardMaterial({color:0xffffff,roughness:.27,metalness:0});
    this.material.name='Shizilin quiet pond';
    this.uniforms={
      uWaterTime:{value:0},uShore:{value:this.shore},uReflection:{value:this.target.texture},
      uReflectionMatrix:{value:this.textureMatrix},uWaterView:{value:this.viewDirection},
      uPond:{value:new Vector4(POND.x,POND.z,POND.width,POND.depth)},
      uDeep:{value:new Color('#517e74')},uShallow:{value:new Color('#98b19b')},
      uReflectionEnabled:{value:1},uReflectionTexel:{value:1/size},
    };
    this.material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,this.uniforms);
      shader.vertexShader='varying vec3 vWaterWorld;\nvarying vec4 vWaterReflection;\nuniform mat4 uReflectionMatrix;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        vWaterWorld=(modelMatrix*vec4(transformed,1.0)).xyz;
        vWaterReflection=uReflectionMatrix*vec4(vWaterWorld,1.0);`);
      shader.fragmentShader=`
        varying vec3 vWaterWorld;varying vec4 vWaterReflection;
        uniform float uWaterTime;uniform sampler2D uShore;uniform sampler2D uReflection;
        uniform vec4 uPond;uniform vec3 uDeep;uniform vec3 uShallow;uniform vec3 uWaterView;
        uniform float uReflectionEnabled;uniform float uReflectionTexel;
        vec3 pondNormal(vec2 p){
          float a=dot(p,vec2(7.3,2.2))-uWaterTime*.39;
          float b=dot(p,vec2(-3.1,9.1))+uWaterTime*.27;
          return normalize(vec3(-.031*cos(a)-.014*cos(b),1.0,-.012*cos(a)+.028*cos(b)));
        }
      `+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        vec2 shoreUv=(vWaterWorld.xz-uPond.xy)/uPond.zw+.5;
        float waterDepth=texture2D(uShore,shoreUv).r;
        float shallows=exp(-waterDepth*5.5);
        diffuseColor.rgb=mix(uDeep,uShallow,shallows);
        diffuseColor.rgb*=.98+.02*sin(dot(vWaterWorld.xz,vec2(2.2,1.1)));`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        vec3 waterNormal=pondNormal(vWaterWorld.xz);
        normal=normalize(mat3(viewMatrix)*waterNormal);`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
        vec2 reflectionUv=vWaterReflection.xy/vWaterReflection.w+waterNormal.xz*.12;
        vec2 texel=vec2(uReflectionTexel*1.15);
        vec4 reflection=texture2D(uReflection,reflectionUv)*.40;
        reflection+=texture2D(uReflection,reflectionUv+vec2(texel.x,0.0))*.15;
        reflection+=texture2D(uReflection,reflectionUv-vec2(texel.x,0.0))*.15;
        reflection+=texture2D(uReflection,reflectionUv+vec2(0.0,texel.y))*.15;
        reflection+=texture2D(uReflection,reflectionUv-vec2(0.0,texel.y))*.15;
        float angle=1.0-clamp(dot(waterNormal,uWaterView),0.0,1.0);
        float reflectance=(.22+.46*pow(angle,4.0))*smoothstep(.01,.18,waterDepth);
        vec3 reflected=reflection.rgb/max(reflection.a,.001);
        outgoingLight=mix(outgoingLight,reflected,reflectance*reflection.a*uReflectionEnabled);
        #include <opaque_fragment>`);
    };
    this.material.customProgramCacheKey=()=> 'shizilin-pond-v1';
    mesh.material=this.material;mesh.userData.waterSurface=true;
  }

  setTime(time: number): void {
    this.uniforms.uWaterTime.value=time;this.diagnostics.time=time;
  }

  update(renderer: WebGLRenderer,scene: Scene,camera: OrthographicCamera): void {
    if(this.disposed)return;
    camera.updateMatrixWorld();
    camera.getWorldDirection(this.viewDirection).negate();
    if(!this.dirty&&this.lastWorld.equals(camera.matrixWorld)&&this.lastProjection.equals(camera.projectionMatrix))return;
    this.lastWorld.copy(camera.matrixWorld);this.lastProjection.copy(camera.projectionMatrix);this.dirty=false;
    updateMirrorCamera(camera,this.mirror);
    this.textureMatrix.copy(BIAS).multiply(this.mirror.projectionMatrix).multiply(this.mirror.matrixWorldInverse);
    if(this.diagnostics.mode==='surface')return;
    const target=renderer.getRenderTarget(),clipping=renderer.clippingPlanes;
    const clearColor=renderer.getClearColor(new Color()),clearAlpha=renderer.getClearAlpha();
    const xr=renderer.xr.enabled,shadowAuto=renderer.shadowMap.autoUpdate,visible=this.mesh.visible;
    try{
      this.mesh.visible=false;renderer.xr.enabled=false;renderer.shadowMap.autoUpdate=false;
      renderer.clippingPlanes=[...clipping,this.clipPlane];
      renderer.setRenderTarget(this.target);renderer.setClearColor(0x000000,0);renderer.clear();
      renderer.render(scene,this.mirror);this.diagnostics.captures++;
    }catch{
      // A reflection allocation failure retains a usable, shaded pond.
      this.diagnostics.mode='surface';this.uniforms.uReflectionEnabled.value=0;
    }finally{
      this.mesh.visible=visible;renderer.clippingPlanes=clipping;renderer.xr.enabled=xr;
      renderer.shadowMap.autoUpdate=shadowAuto;renderer.setRenderTarget(target);renderer.setClearColor(clearColor,clearAlpha);
    }
  }

  dispose(): void {
    if(this.disposed)return;this.disposed=true;
    if(this.mesh.material===this.material)this.mesh.material=this.original;
    delete this.mesh.userData.waterSurface;
    this.material.dispose();this.shore.dispose();this.target.dispose();
  }
}
