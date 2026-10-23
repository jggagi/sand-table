/** Artistic lighting moods, not a solar ephemeris or real-world opening hours. */
export type TimeId = 'dawn' | 'noon' | 'dusk' | 'night';
export interface GardenTime {
  id: TimeId; name: string; mood: string; description: string;
  ambient: number; sky: string; ground: string; hemisphere: number;
  position: [number, number, number]; color: string; intensity: number;
  waterDeep: string; waterShallow: string; lantern: number; spill: number;
}
export const GARDEN_TIMES: readonly GardenTime[] = [
  {id:'dawn',name:'卯时',mood:'晨光',description:'清光入石，池影初醒。',
    ambient:.22,sky:'#edf4ef',ground:'#a6a48e',hemisphere:.72,
    position:[-20,25,12],color:'#ffe9c9',intensity:3.05,
    waterDeep:'#517e74',waterShallow:'#98b19b',lantern:0,spill:0},
  {id:'noon',name:'午时',mood:'日盛',description:'日高影短，满园明净。',
    ambient:.24,sky:'#e5effb',ground:'#afa893',hemisphere:.82,
    position:[3,42,7],color:'#fff5df',intensity:3.3,
    waterDeep:'#4b827a',waterShallow:'#a4bca5',lantern:0,spill:0},
  {id:'dusk',name:'酉时',mood:'暮色',description:'斜阳过瓦，灯火渐起。',
    ambient:.16,sky:'#b2b5cf',ground:'#88796e',hemisphere:.52,
    position:[24,11,-13],color:'#ffb779',intensity:2.6,
    waterDeep:'#4e6b70',waterShallow:'#a49e88',lantern:1.2,spill:5},
  {id:'night',name:'亥时',mood:'月夜',description:'月照石径，一亭暖灯。',
    ambient:.12,sky:'#8faed7',ground:'#455569',hemisphere:.55,
    position:[-14,25,-9],color:'#b8d4ff',intensity:1.15,
    waterDeep:'#213d51',waterShallow:'#567685',lantern:2.4,spill:15},
];
export function getGardenTime(id:TimeId): GardenTime {
  return GARDEN_TIMES.find(time=>time.id===id)!;
}
