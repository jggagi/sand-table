/** A small same-origin host protocol; standalone Sites remain ordinary pages. */
const CHANNEL='suzhou-map-v1';
const embedded=window.parent!==window&&new URLSearchParams(location.search).get('map')==='1';
let active=!embedded,connected=false;
const listeners=new Set<(active:boolean)=>void>();
export function isMapEmbedded():boolean{return embedded;}
export function isHostActive():boolean{return active;}
export function subscribeHostActivity(listener:(active:boolean)=>void):()=>void {
  listeners.add(listener);return ()=>{listeners.delete(listener);};
}
function send(type:string,extra:Record<string,unknown>={}){
  if(embedded)window.parent.postMessage({channel:CHANNEL,garden:'shizilin',type,...extra},location.origin);
}
export function connectMapHost():()=>void {
  if(!embedded)return ()=>{};
  const receive=(event:MessageEvent)=>{
    if(event.origin!==location.origin||event.source!==window.parent)return;
    const data=event.data;
    if(!data||data.channel!==CHANNEL||data.garden!=='shizilin')return;
    if(data.type==='active'&&typeof data.active==='boolean'){
      connected=true;
      if(active!==data.active){active=data.active;listeners.forEach(listener=>listener(active));}
    }else if(data.type==='focus'&&connected&&active){
      const title=document.querySelector('h1');if(title){title.tabIndex=-1;title.focus({preventScroll:true});}
    }
  };
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!event.defaultPrevented&&requestMapReturn())event.preventDefault();};
  window.addEventListener('message',receive);window.addEventListener('keydown',escape);send('hello');
  return ()=>{window.removeEventListener('message',receive);window.removeEventListener('keydown',escape);};
}
export function reportToMap(status:'loading'|'ready'|'error',period:string):void{send(status,{period});}
export function requestMapReturn():boolean {
  if(!embedded||!connected)return false;
  send('return');return true;
}
