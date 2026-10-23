import { getGardenTime, type TimeId } from '../data/garden.time';
import { SCENE_OBJECTS } from '../data/garden.layout';

// Six small, fixed lanterns. Two pavilion lights cast local warm light; no cube shadows.
const lanterns=SCENE_OBJECTS.filter(o=>o.geometry.kind==='building'||o.geometry.kind==='corridor').map(o=>({
  id:o.id,position:[o.position[0],o.position[1]+(o.geometry.kind==='building'||o.geometry.kind==='corridor'?o.geometry.height:0)-.48,o.position[2]] as [number,number,number],
  pavilion:o.geometry.kind==='building',
}));

export default function TimeLighting({timeId}:{timeId:TimeId}){
  const time=getGardenTime(timeId);
  return <>
    <ambientLight intensity={time.ambient} />
    <hemisphereLight args={[time.sky,time.ground,time.hemisphere]} />
    <directionalLight name="time-sun-moon" position={time.position} intensity={time.intensity} color={time.color} castShadow
      shadow-mapSize={[2048,2048]} shadow-camera-left={-25} shadow-camera-right={25}
      shadow-camera-top={25} shadow-camera-bottom={-25} shadow-camera-near={1} shadow-camera-far={90}
      shadow-bias={-0.0003} shadow-normalBias={0.035} shadow-radius={5} shadow-blurSamples={6} />
    <group name="time-lanterns">
      {lanterns.map(lantern=><group key={lantern.id} position={lantern.position} name={lantern.id+':lantern'}>
        <mesh><boxGeometry args={[.25,.34,.25]} /><meshStandardMaterial color="#e0c99e" roughness={.95}
          emissive="#ffd08b" emissiveIntensity={time.lantern} /></mesh>
        {[-.19,.19].map(y=><mesh key={y} position={[0,y,0]}>
          <boxGeometry args={[.31,.055,.31]} /><meshStandardMaterial color="#493b2b" roughness={.85} />
        </mesh>)}
        {lantern.pavilion&&<pointLight color="#ffbd75" intensity={time.spill} distance={7} decay={2} castShadow={false} />}
      </group>)}
    </group>
  </>;
}
