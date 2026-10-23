(() => {
 'use strict';
 const marker=document.querySelector('#garden-shizilin'),map=document.querySelector('#map-page');
 const host=document.querySelector('#garden-host'),veil=document.querySelector('#journey-veil');
 if(!marker||!map||!host||!veil)return;
 const title=document.querySelector('#journey-title'),message=document.querySelector('#journey-message');
 const back=document.querySelector('#journey-back'),retry=document.querySelector('#journey-retry'),fallback=document.querySelector('#journey-fallback');
 const channel='suzhou-map-v1',run=globalThis.crypto?.randomUUID?.()||String(Date.now());
 const initialTitle=document.title,theme=document.querySelector('meta[name="theme-color"]');
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 let frame=null,ready=false,pending=null,desired=false,ticket=0,phase='map',returnTimer=0,scroll={x:0,y:0},period='dawn',pendingBack=false,reopenAfterBack=false;
 fallback.href=marker.href;
 const baseState=()=>history.state&&typeof history.state==='object'?history.state:{};
 const routeIsGarden=()=>{const q=new URLSearchParams(location.hash.slice(1));return q.get('garden')==='shizilin'&&q.get('view')==='garden';};
 function setPhase(next){phase=next;document.body.dataset.journey=next;}
 function post(type,extra={}){frame?.contentWindow?.postMessage({channel,garden:'shizilin',type,...extra},location.origin);}
 function activity(active){post('active',{active:active&&!document.hidden});}
 function setAccess(element,shown){element.inert=!shown;element.setAttribute('aria-hidden',String(!shown));}
 function syncMap(){try{sessionStorage.setItem('suzhou-gardens-map-v1','shizilin');}catch{}dispatchEvent(new Event('suzhou-map-restore'));}
 function palette(){const color=phase==='garden'?({dawn:'#f6f4ed',noon:'#f8f6ef',dusk:'#f1e6db',night:'#132130'}[period]||'#f6f4ed'):'#f6f4ed';if(theme)theme.content=color;document.documentElement.style.background=color;}
 function fail(){
  if(!desired)return;
  setPhase('error');activity(false);setAccess(host,false);setAccess(veil,true);
  title.textContent='园景暂未展开';message.textContent='可以重新入园，或先回到地图。';retry.hidden=false;fallback.hidden=false;
  retry.focus({preventScroll:true});palette();
 }
 function settlePending(error){
  if(!pending)return;const wait=pending;pending=null;clearTimeout(wait.timeout);
  if(error)wait.reject(error);else wait.resolve();
 }
 function ensureFrame(){
  if(ready&&frame)return Promise.resolve();
  if(pending)return pending.promise;
  if(frame)return Promise.reject(new Error('Garden requires retry'));
  let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});
  pending={promise,resolve,reject,timeout:setTimeout(()=>settlePending(new Error('Garden readiness timeout')),60000)};
  frame=document.createElement('iframe');frame.title='掌上狮子林，可返回苏州地图';frame.dataset.garden='shizilin';frame.tabIndex=-1;
  frame.setAttribute('aria-hidden','true');frame.setAttribute('allow','autoplay');frame.referrerPolicy='same-origin';
  frame.src=new URL('shizilin/index.html?map=1',location.href).href;
  frame.addEventListener('load',()=>activity(phase==='garden'));
  host.append(frame);return promise;
 }
 async function enter(fromHistory=false){
  if(pendingBack){reopenAfterBack=true;return;}
  if(desired&&(phase==='entering'||phase==='garden'))return;
  const current=++ticket;clearTimeout(returnTimer);desired=true;
  if(phase==='map'||phase==='returning')scroll={x:scrollX,y:scrollY};
  const point=marker.getBoundingClientRect(),page=map.getBoundingClientRect();
  map.style.setProperty('--journey-x',(point.x+point.width/2-page.x)+'px');map.style.setProperty('--journey-y',(point.y+point.height/2-page.y)+'px');
  if(!fromHistory){
   history.replaceState({...baseState(),sgJourney:{owner:run,page:'map'}},'','#garden=shizilin');
   history.pushState({...baseState(),sgJourney:{owner:run,page:'garden'}},'','#garden=shizilin&view=garden');
  }
  syncMap();setPhase('entering');setAccess(map,false);setAccess(host,false);setAccess(veil,true);
  title.textContent='穿过月洞，走入石境';message.textContent=ready?'回到刚才的园景。':'正在展开园景…';retry.hidden=true;fallback.hidden=true;
  document.title='狮子林 · 苏州园林游览图';back.focus({preventScroll:true});
  try{
   await ensureFrame();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   if(current!==ticket||!desired)return;
   setPhase('garden');setAccess(veil,false);setAccess(host,true);frame.tabIndex=0;frame.removeAttribute('aria-hidden');activity(true);palette();
   frame.contentWindow?.focus();post('focus');
  }catch{if(current===ticket&&desired)fail();}
 }
 function close(fromHistory=false){
  if(!desired&&(phase==='map'||phase==='returning'))return;
  desired=false;const current=++ticket;activity(false);setAccess(map,true);marker.focus({preventScroll:true});setAccess(host,false);if(frame){frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');}
  setAccess(veil,false);setPhase('returning');document.title=initialTitle;palette();
  if(!fromHistory){
   if(history.state?.sgJourney?.owner===run&&history.state.sgJourney.page==='garden'){pendingBack=true;history.back();}
   else history.replaceState({...baseState(),sgJourney:{owner:run,page:'map'}},'','#garden=shizilin');
  }
  returnTimer=setTimeout(()=>{
   if(current!==ticket||desired)return;
   setPhase('map');setAccess(map,true);syncMap();window.scrollTo({left:scroll.x,top:scroll.y,behavior:'instant'});marker.focus({preventScroll:true});
  },reduced.matches?0:480);
 }
 document.addEventListener('click',event=>{
  const link=event.target instanceof Element?event.target.closest('#garden-shizilin'):null;
  if(!link||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();void enter();
 },true);
 addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==frame?.contentWindow)return;
  const data=event.data;if(!data||data.channel!==channel||data.garden!=='shizilin')return;
  if(data.type==='hello'){activity(phase==='garden');return;}
  if(data.type==='return'){if(desired)close();return;}
  if(data.type==='ready'){
   if(['dawn','noon','dusk','night'].includes(data.period))period=data.period;
   ready=true;settlePending();palette();
  }else if(data.type==='error'){
   ready=false;settlePending(new Error('Garden renderer error'));if(phase==='garden')fail();
  }
 });
 back.addEventListener('click',()=>close());
 retry.addEventListener('click',()=>{
  settlePending(new Error('Garden retried'));activity(false);frame?.remove();frame=null;ready=false;
  desired=false;void enter(true);
 });
 const route=()=>{if(routeIsGarden())void enter(true);else close(true);};
 addEventListener('popstate',()=>{pendingBack=false;if(reopenAfterBack&&!routeIsGarden()){reopenAfterBack=false;void enter();}else{reopenAfterBack=false;route();}});addEventListener('hashchange',()=>{if(routeIsGarden()!==desired)route();});
 addEventListener('keydown',event=>{if(event.key==='Escape'&&desired&&!event.defaultPrevented){event.preventDefault();close();}});
 document.addEventListener('visibilitychange',()=>activity(phase==='garden'));
 addEventListener('pagehide',()=>activity(false));addEventListener('pageshow',()=>activity(phase==='garden'));
 setPhase('map');if(routeIsGarden())void enter(true);
})();
