import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
if(!path.isAbsolute(process.argv[2]||''))throw Error('Pass an absolute installed Playwright index.mjs path.');
const {chromium}=await import(process.argv[2]);
const origin=process.env.JOURNEY_ORIGIN||'http://127.0.0.1:4216';
const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'docs/reviews/seam-1');fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],failures=[],external=[],requests=[],checks=[],shots=[];let fault=false;
checks.push=(...items)=>{for(const item of items)console.log(JSON.stringify({checkpoint:item.check}));return Array.prototype.push.apply(checks,items);};
async function open({mobile=false,hash='',scripts=true,motion='reduce'}={}){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},deviceScaleFactor:1,hasTouch:mobile,isMobile:mobile,javaScriptEnabled:scripts,reducedMotion:motion});
 if(scripts)await context.addInitScript(()=>{
  window.__journeyGPU={contexts:0,buffers:0,framebuffers:0,audioCloses:0};const seen=new WeakSet(),get=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(...args){const result=Reflect.apply(get,this,args);if(args[0]==='webgl2'&&result&&!seen.has(result)){seen.add(result);window.__journeyGPU.contexts++;}return result;};
  for(const key of ['createBuffer','createFramebuffer']){const p=WebGL2RenderingContext.prototype,original=p[key];p[key]=function(...args){window.__journeyGPU[key==='createBuffer'?'buffers':'framebuffers']++;return Reflect.apply(original,this,args);};}
  if(window.AudioContext){const close=AudioContext.prototype.close;AudioContext.prototype.close=function(...args){window.__journeyGPU.audioCloses++;return Reflect.apply(close,this,args);};}
  window.__journeyTransitions=[];document.addEventListener('transitionrun',event=>{if(event.target.id==='map-page')window.__journeyTransitions.push(event.propertyName);});
 });
 const page=await context.newPage();page.setDefaultTimeout(120000);
 page.on('pageerror',e=>errors.push({message:e.message,fault}));page.on('console',m=>{if(m.type()==='error')errors.push({message:m.text(),fault});});
 page.on('requestfailed',r=>failures.push({url:r.url(),error:r.failure()?.errorText,fault}));
 await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(origin+'/')||/^(data|blob):/.test(url)){requests.push({url,kind:route.request().resourceType(),fault});return route.continue();}external.push(url);return route.abort();});
 assert.equal((await page.goto(origin+'/'+hash)).status(),200);return {context,page};
}
async function phase(page,name){await page.waitForFunction(name=>document.body.dataset.journey===name,name,{timeout:120000});}
function garden(page){const f=page.frames().find(f=>f.url().startsWith(origin+'/shizilin/index.html'));assert(f,'Missing same-origin garden frame');return f;}
async function ready(frame,view){await frame.waitForFunction(view=>window.__GARDEN__?.ready&&(view===undefined||window.__GARDEN__.view===view)&&window.__WATER__?.captures>0&&document.querySelector('main')?.dataset.renderStatus==='ready',view,{timeout:120000});}
const read=f=>f.evaluate(()=>({garden:{...window.__GARDEN__},water:{...window.__WATER__},gpu:{...window.__journeyGPU},audio:{paused:document.querySelector('audio').paused,time:document.querySelector('audio').currentTime,message:document.querySelector('.music-message').textContent},viewport:{width:innerWidth,height:innerHeight,canvasWidth:document.querySelector('canvas').clientWidth,canvasHeight:document.querySelector('canvas').clientHeight},scrollY}));
function samePose(a,b){for(const key of ['position','target'])for(let i=0;i<3;i++)assert(Math.abs(a.garden[key][i]-b.garden[key][i])<1e-6,key);assert(Math.abs(a.garden.zoom-b.garden.zoom)<1e-6,JSON.stringify({kind:'zoom',expected:a,actual:b}));}
async function settled(frame){let previous='',stable=0;for(let i=0;i<160;i++){const s=await read(frame),signature=JSON.stringify({position:s.garden.position,target:s.garden.target,zoom:s.garden.zoom,viewport:s.viewport,musicMessage:s.audio.message});stable=s.garden.ready&&signature===previous?stable+1:0;previous=signature;if(stable>=3)return s;await frame.page().waitForTimeout(150);}throw Error('Garden layout and pose did not settle');}
async function enter(page){await page.locator('#garden-shizilin').click();await phase(page,'garden');const f=garden(page);await ready(f);return f;}
async function shot(page,name){await page.screenshot({path:path.join(output,name+'.jpg'),type:'jpeg',quality:86,fullPage:false});shots.push(name+'.jpg');}
async function noOverflow(page){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
try{
 const main=await open(),page=main.page;await noOverflow(page);assert.equal(await page.locator('iframe').count(),0);
 const links=await page.locator('.garden-marker').evaluateAll(es=>es.map(e=>e.href));assert.equal(links.length,5);assert(links.every(url=>url.includes('.chatgpt.site/')));
 await page.evaluate(()=>window.__mapIdentity={created:true});
 checks.push({check:'Map starts with five real fallback links and no iframe or garden WebGL allocation',passed:true});
 let release;const gate=new Promise(resolve=>{release=resolve;});await main.context.route('**/craft-stone.glb',async route=>{await gate;return route.continue();});
 await page.locator('#garden-shizilin').click();await phase(page,'entering');
 await page.evaluate(()=>window.postMessage({channel:'suzhou-map-v1',garden:'shizilin',type:'ready',period:'night'},location.origin));await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.body.dataset.journey),'entering');
 await shot(page,'desktop-entering');release();await phase(page,'garden');let f=garden(page);await ready(f,'overview');
 await f.evaluate(()=>{window.__retainedWater=window.__WATER__;window.__retainedGarden=window.__GARDEN__;window.__retainedCanvas=document.querySelector('canvas');});
 const initial=await read(f);assert(initial.garden.calls>10&&initial.garden.triangles>100000);assert.equal(initial.garden.objects,59);
 checks.push({check:'Cold entry waits for actual WebGL readiness; forged parent ready message is ignored',actual:initial});
 await f.getByTestId('time-night').click();await f.waitForFunction(()=>window.__WATER__?.period==='night');
 for(const id of ['overview','rockery','waterside','corridor']){await f.getByTestId('view-'+id).click();await ready(f,id);await shot(page,'desktop-'+id+'-night');}
 const box=await f.locator('canvas').boundingBox();await page.mouse.move(box.x+box.width*.48,box.y+box.height*.55);await page.mouse.down();await page.mouse.move(box.x+box.width*.60,box.y+box.height*.60,{steps:9});await page.mouse.up();await ready(f,null);
 await f.getByTestId('music-volume').focus();await page.keyboard.press('Home');for(let i=0;i<9;i++)await page.keyboard.press('ArrowRight');await f.getByTestId('music-toggle').click();await f.waitForFunction(()=>{const a=document.querySelector('audio');return !a.paused&&a.currentTime>0;});
 await f.waitForFunction(()=>document.querySelector('.music-message').textContent==='');
 const saved=await settled(f),documentLoads=requests.filter(x=>x.kind==='document').length;
 await f.getByTestId('return-map').click();await phase(page,'map');assert.equal(await page.locator('.garden-marker.is-current').getAttribute('data-garden'),'shizilin');assert.equal(await page.evaluate(()=>document.activeElement.id),'garden-shizilin');assert(await page.evaluate(()=>window.__mapIdentity.created));
 await shot(page,'desktop-returned-map');assert((await read(f)).audio.paused);assert.equal((await read(f)).gpu.audioCloses,0);
 for(let i=0;i<3;i++){
  f=await enter(page);await ready(f,null);const resumed=await read(f);samePose(saved,resumed);assert.equal(resumed.water.period,'night');assert.equal(resumed.audio.paused,true);assert.deepEqual(resumed.gpu,saved.gpu);
  assert(await f.evaluate(()=>window.__retainedWater===window.__WATER__&&window.__retainedGarden===window.__GARDEN__&&window.__retainedCanvas===document.querySelector('canvas')));
  assert.equal(await f.getByTestId('music-volume').inputValue(),'45');await page.keyboard.press('Escape');await phase(page,'map');
 }
 assert.equal(requests.filter(x=>x.kind==='document').length,documentLoads);
 checks.push({check:'Three retained round trips preserve free pose, zoom, night, volume and canvas/RT identities without document/asset reload or audio graph closure',saved});
 await page.goForward();await phase(page,'garden');f=garden(page);samePose(saved,await read(f));await page.goBack();await phase(page,'map');
 checks.push({check:'Browser back/forward restores map or same retained garden through the parent history',passed:true});
 f=await enter(page);await f.getByTestId('music-toggle').click();await f.waitForFunction(()=>{const a=document.querySelector('audio');return !a.paused&&a.currentTime>0;});await f.getByTestId('music-toggle').click();
 checks.push({check:'User can actually resume and pause music after re-entry; returning never starts music automatically',passed:true});
 await page.evaluate(()=>{window.__deferredNativeBack=history.back.bind(history);history.back=()=>{window.__deferredBackRequested=true;};});
 await f.getByTestId('return-map').click();await phase(page,'map');assert(await page.evaluate(()=>window.__deferredBackRequested));assert(new URL(page.url()).hash.includes('view=garden'));
 await page.locator('#garden-shizilin').click();assert.equal(await page.evaluate(()=>document.body.dataset.journey),'map');
 await page.evaluate(()=>{history.back=window.__deferredNativeBack;history.back();});await phase(page,'garden');f=garden(page);await ready(f,null);samePose(saved,await read(f));
 checks.push({check:'Delayed native history traversal and immediate re-entry do not reopen a cancelled view or consume the new visit',passed:true});

 const healthy=await read(f);await f.evaluate(()=>window.postMessage({channel:'suzhou-map-v1',garden:'shizilin',type:'active',active:false},location.origin));await page.waitForTimeout(100);assert.deepEqual((await read(f)).gpu,healthy.gpu);assert.equal(await page.evaluate(()=>document.body.dataset.journey),'garden');
 await main.context.close();
 const phone=await open({mobile:true,motion:'no-preference'}),m=phone.page;await m.setViewportSize({width:390,height:640});await m.locator('#garden-shizilin').scrollIntoViewIfNeeded();const scroll=await m.evaluate(()=>scrollY);
 f=await enter(m);await f.waitForFunction(()=>window.__WATER__?.active===true);assert.equal((await read(f)).water.reflectionSize,256);
 const transitionEvents=await m.evaluate(()=>window.__journeyTransitions);assert(transitionEvents.includes('opacity')&&transitionEvents.includes('transform'));
 const touch=await phone.context.newCDPSession(m),c=await f.locator('canvas').boundingBox();
 for(let i=0;i<=10;i++){await touch.send('Input.dispatchTouchEvent',{type:i===0?'touchStart':'touchMove',touchPoints:[{x:c.x+c.width*(.44+i*.014),y:c.y+c.height*(.50+i*.005),id:1}]});await m.waitForTimeout(18);}await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await ready(f,null);
 const beforeReturn=await read(f);await f.evaluate(()=>window.postMessage({channel:'suzhou-map-v1',garden:'shizilin',type:'active',active:false},location.origin));await m.waitForTimeout(150);assert((await read(f)).water.active,'A self-sourced active message should be rejected');
 await m.keyboard.press('Escape');await phase(m,'map');assert.equal(await m.evaluate(()=>scrollY),scroll);let stable=0,previousFrames=-1;for(let i=0;i<80&&stable<4;i++){await m.waitForTimeout(300);const snapshot=await read(f);stable=snapshot.garden.frames===previousFrames?stable+1:0;previousFrames=snapshot.garden.frames;}assert(stable>=4,'Hidden scene did not settle');const idle=await read(f);await m.waitForTimeout(1200);const still=await read(f);assert.equal(still.water.active,false);assert.equal(still.water.animationTicks,idle.water.animationTicks);assert.equal(still.garden.frames,idle.garden.frames);
 checks.push({check:'Actual mobile touch, normal zoom/fade transitions, scroll/focus restoration and explicit hidden-water suspension; forged self-sourced activity message rejected',transitionEvents,beforeReturn,idle,still});
 f=await enter(m);await ready(f,null);samePose(beforeReturn,await read(f));
 await m.emulateMedia({reducedMotion:'reduce'});await ready(f,null);await f.getByTestId('view-waterside').click();await ready(f,'waterside');await f.getByTestId('time-night').click();await f.waitForFunction(()=>window.__WATER__?.period==='night');await m.setViewportSize({width:390,height:844});await ready(f,'waterside');await shot(m,'mobile-garden-night');await noOverflow(m);assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await m.keyboard.press('Escape');await phase(m,'map');await shot(m,'mobile-returned-map');await m.setViewportSize({width:320,height:844});await m.addStyleTag({content:'html{font-size:200%!important}'});await noOverflow(m);f=await enter(m);await ready(f);await f.addStyleTag({content:'html{font-size:200%!important}'});assert(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const link=await f.getByTestId('return-map').boundingBox();assert(link.width>=44&&link.height>=44);await m.keyboard.press('Escape');await phase(m,'map');checks.push({check:'Retained mobile view and night screenshot; reduced-motion, 320px/200% text and 44px return control remain usable',passed:true});await phone.context.close();
 const cancelled=await open();let unblock;const hold=new Promise(resolve=>{unblock=resolve;});await cancelled.context.route('**/craft-stone.glb',async route=>{await hold;return route.continue();});await cancelled.page.locator('#garden-shizilin').click();await phase(cancelled.page,'entering');await cancelled.page.locator('#journey-back').click();await phase(cancelled.page,'map');unblock();f=garden(cancelled.page);await ready(f);assert.equal(await cancelled.page.evaluate(()=>document.body.dataset.journey),'map');assert.equal((await read(f)).water.active,false);f=await enter(cancelled.page);await ready(f);checks.push({check:'Cancel cold loading, finish in the background without reopening, then reuse the ready garden',passed:true});await cancelled.context.close();
 const broken=await open();fault=true;await broken.context.route('**/craft-stone.glb',route=>route.abort());await broken.page.locator('#garden-shizilin').click();await phase(broken.page,'error');await broken.page.locator('#journey-retry').waitFor({state:'visible'});await shot(broken.page,'desktop-load-error');await broken.context.unroute('**/craft-stone.glb');await broken.page.locator('#journey-retry').click();await phase(broken.page,'garden');f=garden(broken.page);await ready(f);fault=false;checks.push({check:'Actual GLB load failure surfaces retry/map/standalone fallback; retry successfully replaces the failed iframe',passed:true});
 let resumeAudio;const audioGate=new Promise(resolve=>{resumeAudio=resolve;});await broken.context.route('**/*.mp3',async route=>{await audioGate;return route.continue();});await f.getByTestId('music-toggle').click();await f.getByTestId('return-map').click();await phase(broken.page,'map');resumeAudio();await broken.page.waitForTimeout(700);assert.equal((await read(f)).audio.paused,true);f=await enter(broken.page);assert.equal((await read(f)).audio.paused,true);await f.getByTestId('music-toggle').click();await f.waitForFunction(()=>!document.querySelector('audio').paused&&document.querySelector('audio').currentTime>0);await f.getByTestId('music-toggle').click();checks.push({check:'Returning during an actual delayed MP3 load cannot restart audio; later user gesture resumes correctly',passed:true});await broken.context.close();
 const deep=await open({hash:'#garden=shizilin&view=garden'});await phase(deep.page,'garden');f=garden(deep.page);await ready(f);await f.getByTestId('return-map').click();await phase(deep.page,'map');assert.equal(new URL(deep.page.url()).hash,'#garden=shizilin');checks.push({check:'Direct garden hash/refresh enters the local garden; return safely replaces an unowned history entry',passed:true});await deep.context.close();
 const plain=await open({scripts:false});assert.equal(await plain.page.locator('iframe').count(),0);assert.equal(await plain.page.locator('.garden-marker').count(),5);assert((await plain.page.locator('#garden-shizilin').getAttribute('href')).includes('shizilin-miniature.jggagi.chatgpt.site'));await plain.context.close();checks.push({check:'JavaScript-disabled map retains native five-garden anchors; no embedding or loading lock',passed:true});
 assert.deepEqual(errors.filter(x=>!x.fault),[]);assert.deepEqual(failures.filter(x=>!x.fault),[]);assert.deepEqual(external,[]);
 const result={date:new Date().toISOString().slice(0,10),browser:browser.version(),origin,passed:true,checks,shots,errors,failures,external,requests,limits:'Actual local final static production output on Chromium/SwiftShader with CDP touch. No physical phone, Safari, GPU FPS/heat or mainland network verification. Native Sites deployment success is separate from platform iframe-header behavior.'};
 fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:true,groups:checks.length,screenshots:shots.length}));
}catch(error){const p=browser.contexts().at(-1)?.pages().at(-1);if(p){await p.screenshot({path:path.join(root,'.sites-runtime/seam-failed.jpg'),type:'jpeg',quality:80}).catch(()=>{});console.error(JSON.stringify({state:await p.evaluate(()=>({phase:document.body.dataset.journey,url:location.href})).catch(()=>null)}));}console.error(JSON.stringify({errors,failures,external}));throw error;}finally{await browser.close();}
