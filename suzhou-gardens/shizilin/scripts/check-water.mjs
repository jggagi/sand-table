import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
const {PNG}=createRequire(import.meta.url)('pngjs');
const root=path.resolve(import.meta.dirname,'..'),origin=process.env.WATER_ORIGIN||'http://127.0.0.1:4186/';
const review=process.env.WATER_REVIEW_DIR||'water-1';if(!/^[a-z0-9-]+$/.test(review))throw Error('Invalid review directory');
const resultsFile=process.env.WATER_RESULTS_FILE||'browser-results.json';if(!/^[a-z0-9-]+\.json$/.test(resultsFile))throw Error('Invalid result filename');
const folder=path.join(root,'docs/reviews',review);fs.mkdirSync(folder,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],external=[],failures=[],records=[],limitations=[];let fault=false;
async function setup({mobile=false,blockReflection=false,throwReflection=false}={}){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},deviceScaleFactor:1,hasTouch:mobile,isMobile:mobile,reducedMotion:'reduce'});
 await context.addInitScript(({blockReflection,throwReflection})=>{
  const state=new WeakMap();window.__waterDraws={screen:0,offscreen:{},blocked:0};
  const p=WebGL2RenderingContext.prototype,bind=p.bindFramebuffer,viewport=p.viewport;
  p.bindFramebuffer=function(target,buffer){const s=state.get(this)||{};if(target===this.FRAMEBUFFER||target===this.DRAW_FRAMEBUFFER)s.buffer=buffer;state.set(this,s);return bind.call(this,target,buffer);};
  p.viewport=function(x,y,width,height){const s=state.get(this)||{};s.width=width;s.height=height;state.set(this,s);return viewport.call(this,x,y,width,height);};
  for(const key of ['drawElements','drawArrays']){
   const draw=p[key];p[key]=function(...args){const s=state.get(this)||{},size=s.width+'x'+s.height;
    const reflection=s.buffer&&(s.width===512||s.width===256)&&s.width===s.height;
    if(reflection&&throwReflection)throw Error('Injected reflection draw failure');
    if(reflection&&blockReflection){window.__waterDraws.blocked++;return;}
    if(s.buffer)window.__waterDraws.offscreen[size]=(window.__waterDraws.offscreen[size]||0)+1;else window.__waterDraws.screen++;
    return Reflect.apply(draw,this,args);
   };
  }
 },{blockReflection,throwReflection});
 await context.route('**/*',route=>{const u=route.request().url();if(u.startsWith(new URL(origin).origin+'/')||/^(data|blob):/.test(u))return route.continue();external.push(u);return route.abort();});
 const page=await context.newPage();page.setDefaultTimeout(120000);
 page.on('pageerror',e=>errors.push({message:e.message,fault}));page.on('console',m=>{if(m.type()==='error')errors.push({message:m.text(),fault});});
 page.on('requestfailed',r=>failures.push({url:r.url(),error:r.failure()?.errorText,fault}));
 await page.goto(origin);await ready(page,'overview');return {context,page};
}
async function ready(page,id){await page.waitForFunction(id=>window.__GARDEN__?.ready&&(id===undefined||window.__GARDEN__.view===id)&&document.querySelector('main')?.dataset.renderStatus==='ready',id,{timeout:120000});}
const water=page=>page.evaluate(()=>({...window.__WATER__}));
const draws=page=>page.evaluate(()=>JSON.parse(JSON.stringify(window.__waterDraws)));
const pixels=async page=>PNG.sync.read(await page.locator('canvas').screenshot({type:'png',timeout:120000}));
function difference(a,b){assert.equal(a.data.length,b.data.length);let count=0,sum=0;for(let i=0;i<a.data.length;i+=4){const d=Math.abs(a.data[i]-b.data[i])+Math.abs(a.data[i+1]-b.data[i+1])+Math.abs(a.data[i+2]-b.data[i+2]);if(d>12)count++;sum+=d;}return {changedPixels:count,meanDifference:sum/(a.width*a.height)};}
const noOverflow=async page=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
try{
 const {context,page}=await setup();
 assert.equal((await water(page)).mode,'planar');assert.equal((await water(page)).reflectionSize,512);
 const before=await draws(page),captures=(await water(page)).captures;
 for(const id of ['rockery','waterside','corridor','overview']){await page.getByTestId('view-'+id).click();await ready(page,id);}
 const after=await draws(page);assert((await water(page)).captures>captures);
 assert(after.offscreen['512x512']>before.offscreen['512x512']);
 for(const [size,count] of Object.entries(before.offscreen))if(size!=='512x512')assert.equal(after.offscreen[size],count,'Static shadow framebuffer redrawn: '+size);
 records.push({check:'Actual orthographic reflection captures refresh on camera change; existing shadow framebuffers stay cached',before,after});
 const stopped=await page.evaluate(()=>({frames:window.__GARDEN__.frames,water:{...window.__WATER__}}));
 await page.waitForTimeout(700);assert.equal((await water(page)).captures,stopped.water.captures);assert.equal((await water(page)).active,false);
 assert((await page.evaluate(()=>window.__GARDEN__.frames))-stopped.frames<=2);
 records.push({check:'Reduced-motion pond and camera at rest stop drawing and reusing reflection',passed:true});
 await page.getByTestId('view-waterside').click();await ready(page,'waterside');const normal=await pixels(page);
 const blocked=await setup({blockReflection:true});await blocked.page.getByTestId('view-waterside').click();await ready(blocked.page,'waterside');
 const blankReflection=await pixels(blocked.page),changed=difference(normal,blankReflection);
 assert((await draws(blocked.page)).blocked>0);assert(changed.changedPixels>250,'Reflection does not affect actual visible water pixels');
 records.push({check:'Actual reflection pixels differ from a control with only reflection draws blocked',...changed});await blocked.context.close();
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>window.__WATER__?.active);
 const start=await page.evaluate(()=>({time:performance.now(),frames:window.__GARDEN__.frames,water:{...window.__WATER__}}));
 await page.waitForTimeout(1300);
 const end=await page.evaluate(()=>({time:performance.now(),frames:window.__GARDEN__.frames,water:{...window.__WATER__}}));
 assert(end.water.animationTicks>start.water.animationTicks);assert(end.frames>start.frames);assert.equal(end.water.captures,start.water.captures);
 assert(end.water.animationTicks-start.water.animationTicks<=(end.time-start.time)/1000*24+3);
 records.push({check:'Real visible water animation advances main frames, obeys 24Hz scheduling cap and does not recapture reflection',start,end});
 await page.evaluate(()=>{document.body.style.paddingBottom='200vh';scrollTo(0,document.body.scrollHeight);});
 await page.waitForFunction(()=>!window.__WATER__.active);
 const offscreen=(await water(page)).animationTicks;await page.waitForTimeout(450);assert.equal((await water(page)).animationTicks,offscreen);
 await page.evaluate(()=>{scrollTo(0,0);document.body.style.paddingBottom='';});await page.waitForFunction(()=>window.__WATER__.active);
 records.push({check:'Actual IntersectionObserver pauses offscreen water and resumes on return',passed:true});
 const other=await context.newPage();await other.goto('about:blank');await other.bringToFront();
 const hidden=await page.evaluate(()=>document.hidden);
 if(hidden){await page.waitForFunction(()=>!window.__WATER__.active);records.push({check:'Actual background tab pauses water',passed:true});}
 else limitations.push('This headless browser keeps document.hidden false; actual background-tab pause not verified.');
 await other.close();await page.bringToFront();await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>!window.__WATER__.active);
 await page.getByTestId('reset-view').click();await ready(page,'overview');await context.close();
 const phone=await setup({mobile:true}),mobile=phone.page;
 assert.equal((await water(mobile)).reflectionSize,256);await noOverflow(mobile);
 const box=await mobile.locator('canvas').boundingBox(),cdp=await phone.context.newCDPSession(mobile);
 const x=box.x+box.width*.5,y=box.y+box.height*.5;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+45,y:y+12}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await ready(mobile,null);
 await mobile.getByTestId('reset-view').click();await ready(mobile,'overview');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-30,y},{x:x+30,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-60,y},{x:x+60,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await ready(mobile);
 const pose=await mobile.evaluate(()=>window.__GARDEN__);assert(pose.zoom>=pose.minZoom-.01&&pose.zoom<=pose.maxZoom+.01);
 await mobile.getByTestId('reset-view').click();await ready(mobile,'overview');
 records.push({check:'Actual mobile touch orbit, pinch bounds and reset with 256px reflection',passed:true});
 await mobile.emulateMedia({reducedMotion:'no-preference'});await mobile.waitForFunction(()=>window.__WATER__.active);
 const mobileStart=await mobile.evaluate(()=>({time:performance.now(),ticks:window.__WATER__.animationTicks}));await mobile.waitForTimeout(1100);
 const mobileEnd=await mobile.evaluate(()=>({time:performance.now(),ticks:window.__WATER__.animationTicks}));
 assert(mobileEnd.ticks>mobileStart.ticks);assert(mobileEnd.ticks-mobileStart.ticks<=(mobileEnd.time-mobileStart.time)/1000*12+3);
 await mobile.emulateMedia({reducedMotion:'reduce'});await mobile.waitForFunction(()=>!window.__WATER__.active);
 records.push({check:'Mobile water scheduling obeys 12Hz cap',mobileStart,mobileEnd});
 await mobile.getByTestId('music-toggle').click();await mobile.waitForFunction(()=>!document.querySelector('audio').paused&&document.querySelector('audio').currentTime>.5,null,{timeout:30000});
 await mobile.getByTestId('music-toggle').click();assert(await mobile.locator('audio').evaluate(a=>a.paused));records.push({check:'Actual existing music playback and pause',passed:true});
 if(new URL(origin).pathname.endsWith('/shizilin/')){
  await mobile.getByTestId('music-toggle').click();await mobile.waitForFunction(()=>!document.querySelector('audio').paused);
  await mobile.getByTestId('return-map').click();await mobile.waitForURL(new URL('/#garden=shizilin',origin).href);
  assert.equal(await mobile.locator('.garden-marker.is-current').getAttribute('data-garden'),'shizilin');
  await mobile.locator('[data-garden="shizilin"]').click();await ready(mobile,'overview');
  assert(await mobile.locator('audio').evaluate(a=>a.paused));assert.equal((await water(mobile)).mode,'planar');
  records.push({check:'Actual packaged map round trip restores Shizilin selection, pond and paused music',passed:true});
 }
 await mobile.setViewportSize({width:320,height:700});const font=await mobile.addStyleTag({content:'html{font-size:200%}'});await noOverflow(mobile);
 const link=await mobile.getByTestId('return-map').boundingBox();assert(link.width>=44&&link.height>=44);await font.evaluate(e=>e.remove());
 await mobile.setViewportSize({width:844,height:390});await ready(mobile);await noOverflow(mobile);records.push({check:'320px/200% text and landscape resize retain layout',passed:true});
 for(const asset of ['craft-stone.glb','stone-normal.png']){
  fault=true;await mobile.route('**/'+asset,r=>r.abort());await mobile.reload();await mobile.getByRole('alert').waitFor();
  await mobile.unroute('**/'+asset);await mobile.locator('.retry-button').click();await ready(mobile);assert.equal((await water(mobile)).mode,'planar');fault=false;
  records.push({check:'Real asset failure and successful retry: '+asset,passed:true});
 }
 await phone.context.close();
 fault=true;const fallback=await setup({throwReflection:true});assert.equal((await water(fallback.page)).mode,'surface');
 const fallbackPixels=await pixels(fallback.page);let dark=0;for(let i=0;i<fallbackPixels.data.length;i+=4)if(fallbackPixels.data[i]<150)dark++;
 assert(dark>fallbackPixels.width*fallbackPixels.height*.01);records.push({check:'Injected reflection draw exception restores renderer state and retains an actual nonempty main scene',passed:true});await fallback.context.close();fault=false;
 assert.deepEqual(errors.filter(e=>!e.fault),[]);assert.deepEqual(failures.filter(e=>!e.fault),[]);assert.deepEqual(external,[]);
 fs.writeFileSync(path.join(folder,resultsFile),JSON.stringify({date:'2026-10-23',browser:browser.version(),passed:true,checks:records,errors,failures,externalRequests:external,limitations,limits:'Local final production output, Chromium/SwiftShader and actual CDP touch. Scheduling cap is not measured GPU FPS. No physical phone, Safari, thermal or mainland-network verification.'},null,2)+'\n');
 console.log(JSON.stringify({passed:true,checks:records.length}));
}catch(error){console.error(JSON.stringify({errors,failures,external}));throw error;}finally{await browser.close();}
