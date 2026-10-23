import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
const {PNG}=createRequire(import.meta.url)('pngjs');
const root=path.resolve(import.meta.dirname,'..'),origin=process.env.TIME_ORIGIN||'http://127.0.0.1:4206/shizilin/';
const output=path.join(root,'docs/reviews/time-1');fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],failures=[],external=[],assets=[],checks=[],shots=[];
async function open(mobile=false){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1,reducedMotion:'reduce'});
 await context.addInitScript(()=>{
  window.__timeDraws={screen:0,offscreen:{},buffers:0,framebuffers:0};const states=new WeakMap(),p=WebGL2RenderingContext.prototype;
  for(const key of ['createBuffer','createFramebuffer']){const original=p[key];p[key]=function(...args){window.__timeDraws[key==='createBuffer'?'buffers':'framebuffers']++;return Reflect.apply(original,this,args);};}
  const bind=p.bindFramebuffer,viewport=p.viewport;
  p.bindFramebuffer=function(t,b){const s=states.get(this)||{};if(t===this.FRAMEBUFFER||t===this.DRAW_FRAMEBUFFER)s.buffer=b;states.set(this,s);return bind.call(this,t,b);};
  p.viewport=function(x,y,w,h){const s=states.get(this)||{};s.w=w;s.h=h;states.set(this,s);return viewport.call(this,x,y,w,h);};
  for(const key of ['drawElements','drawArrays']){const original=p[key];p[key]=function(...args){const s=states.get(this)||{};if(s.buffer){const k=s.w+'x'+s.h;window.__timeDraws.offscreen[k]=(window.__timeDraws.offscreen[k]||0)+1;}else window.__timeDraws.screen++;return Reflect.apply(original,this,args);};}
 });
 const page=await context.newPage();page.setDefaultTimeout(120000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('requestfailed',r=>failures.push({url:r.url(),error:r.failure()?.errorText}));
 await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(origin).origin+'/')||/^(data|blob):/.test(url)){if(/craft-stone|stone-normal/.test(url))assets.push(url);return route.continue();}external.push(url);return route.abort();});
 assert.equal((await page.goto(origin)).status(),200);await ready(page,'overview');return {context,page};
}
async function ready(page,view){await page.waitForFunction(view=>window.__GARDEN__?.ready&&(view===undefined||window.__GARDEN__.view===view)&&window.__WATER__?.captures>0,view,{timeout:120000});}
const state=page=>page.evaluate(()=>({garden:{...window.__GARDEN__},water:{...window.__WATER__},draws:JSON.parse(JSON.stringify(window.__timeDraws))}));
const pose=s=>({position:s.garden.position,target:s.garden.target,zoom:s.garden.zoom});
async function select(page,id){const before=await state(page);await page.getByTestId('time-'+id).click();await page.waitForFunction(({id,c})=>window.__WATER__?.period===id&&window.__WATER__.captures>c,{id,c:before.water.captures},{timeout:120000});await ready(page);assert.equal(await page.getByTestId('time-'+id).getAttribute('aria-pressed'),'true');return {before,after:await state(page)};}
async function shot(page,name){await page.screenshot({path:path.join(output,name+'.jpg'),type:'jpeg',quality:88,fullPage:true});const s=await state(page);shots.push({file:name+'.jpg',pose:pose(s),view:s.garden.view,period:s.water.period,captures:s.water.captures,calls:s.garden.calls,triangles:s.garden.triangles});}
async function canvasPixels(page){
 // Equal backdrop isolates real scene lighting from the page's night paper color.
 const style=await page.addStyleTag({content:':root {--paper:#f6f4ed !important;}'});
 const result=PNG.sync.read(await page.locator('canvas').screenshot({type:'png',timeout:120000}));await style.evaluate(e=>e.remove());return result;
}
function changed(a,b){assert.equal(a.data.length,b.data.length);let count=0,mean=0;for(let i=0;i<a.data.length;i+=4){const d=Math.abs(a.data[i]-b.data[i])+Math.abs(a.data[i+1]-b.data[i+1])+Math.abs(a.data[i+2]-b.data[i+2]);if(d>18)count++;mean+=d;}return {pixels:count,mean:mean/(a.width*a.height)};}
async function layout(page){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const boxes=await page.locator('.time-button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));for(const b of boxes)assert(b.w>=44&&b.h>=44);for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y));}}
try{
 const {context,page}=await open();await page.getByTestId('view-waterside').click();await ready(page,'waterside');
 await page.evaluate(()=>{window.__timeWaterIdentity=window.__WATER__;window.__timeGardenIdentity=window.__GARDEN__;});
 const baseline=await state(page),images=[],steps=[];
 for(const id of ['dawn','noon','dusk','night']){
  let step;if(id==='dawn')step={before:baseline,after:baseline};else step=await select(page,id);
  assert.deepEqual(pose(step.after),pose(baseline));assert.equal(step.after.draws.buffers,baseline.draws.buffers);assert.equal(step.after.draws.framebuffers,baseline.draws.framebuffers);
  assert(await page.evaluate(()=>window.__timeWaterIdentity===window.__WATER__&&window.__timeGardenIdentity===window.__GARDEN__));
  if(id!=='dawn'){
   assert(step.after.draws.offscreen['2048x2048']>step.before.draws.offscreen['2048x2048']);assert(step.after.draws.offscreen['512x512']>step.before.draws.offscreen['512x512']);
  }
  const idle=await state(page);await page.waitForTimeout(500);const settled=await state(page);assert.deepEqual(settled.draws.offscreen,idle.draws.offscreen);assert.equal(settled.water.captures,idle.water.captures);
  await shot(page,'desktop-waterside-'+id);images.push(await canvasPixels(page));steps.push({id,before:step.before.draws,after:step.after.draws,captures:step.after.water.captures});
 }
 const differences=[];for(let i=1;i<images.length;i++){const result=changed(images[0],images[i]);assert(result.pixels>4000);differences.push({against:'dawn',period:['noon','dusk','night'][i-1],...result});}
 checks.push({check:'Four actual lighting states change scene pixels, refresh shadow and reflection with fixed camera, then cache again; GPU buffers/targets and scene identities remain stable',steps,differences});
 for(const id of ['overview','rockery','corridor']){await page.getByTestId('view-'+id).click();await ready(page,id);await shot(page,'desktop-'+id+'-night');}
 checks.push({check:'All four original viewpoints render at night',passed:true});
 const canvas=await page.locator('canvas').boundingBox();await page.mouse.move(canvas.x+canvas.width*.5,canvas.y+canvas.height*.55);await page.mouse.down();await page.mouse.move(canvas.x+canvas.width*.62,canvas.y+canvas.height*.61,{steps:10});await page.mouse.up();await ready(page,null);
 const manual=await state(page);await select(page,'dusk');assert.deepEqual(pose(await state(page)),pose(manual));
 await page.getByTestId('time-noon').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>window.__WATER__?.period==='noon');assert.equal(await page.getByTestId('time-noon').getAttribute('aria-pressed'),'true');assert(await page.getByTestId('time-noon').evaluate(e=>e===document.activeElement));assert.deepEqual(pose(await state(page)),pose(manual));
 await page.evaluate(()=>{for(const id of ['dawn','dusk','noon','night'])document.querySelector('[data-testid="time-'+id+'"]').click();});await page.waitForFunction(()=>window.__WATER__?.period==='night');assert.equal(await page.getByTestId('time-night').getAttribute('aria-pressed'),'true');
 await page.getByTestId('reset-view').click();await ready(page,'overview');assert.equal((await state(page)).water.period,'night');checks.push({check:'Time selection retains free camera; keyboard, rapid latest selection and reset preserve time',passed:true});
 assert.equal(assets.filter(u=>u.endsWith('craft-stone.glb')).length,1);assert.equal(assets.filter(u=>u.endsWith('stone-normal.png')).length,1);checks.push({check:'No GLB/PNG reloads during time/view changes',passed:true});
 await context.close();
 const mobile=await open(true),phone=mobile.page;await layout(phone);assert.equal((await state(phone)).water.reflectionSize,256);
 await select(phone,'night');await shot(phone,'mobile-overview-night');await phone.getByTestId('view-waterside').click();await ready(phone,'waterside');await shot(phone,'mobile-waterside-night');
 await phone.getByTestId('music-toggle').click();await phone.waitForFunction(()=>{const a=document.querySelector('audio');return a&&!a.paused&&a.currentTime>0;});
 await select(phone,'dawn');assert.equal(await phone.locator('audio').evaluate(a=>a.paused),false);await phone.getByTestId('music-toggle').click();await shot(phone,'mobile-waterside-dawn');checks.push({check:'Mobile 256px reflection and time switching preserve actual music playback',passed:true});
 await phone.setViewportSize({width:320,height:844});const font=await phone.addStyleTag({content:'html {font-size:200% !important;}'});await layout(phone);await font.evaluate(e=>e.remove());await phone.setViewportSize({width:844,height:390});await layout(phone);checks.push({check:'44px time targets, 320px/200% text and landscape remain usable',passed:true});
 await phone.getByTestId('return-map').click();await phone.waitForURL(new URL('/#garden=shizilin',origin).href);assert.equal(await phone.locator('.garden-marker.is-current').getAttribute('data-garden'),'shizilin');await phone.locator('#garden-shizilin').click();await ready(phone,'overview');assert.equal((await state(phone)).water.period,'dawn');checks.push({check:'Actual same-origin map round trip preserves garden selection and returns to the default dawn entry',passed:true});await mobile.context.close();
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);assert.deepEqual(external,[]);
 fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify({date:new Date().toISOString().slice(0,10),browser:browser.version(),passed:true,checks,shots,errors,failures,external,limits:'Actual final local packaged output on Chromium/SwiftShader. No physical phone, Safari, FPS, heat or mainland-network measurements. Four manually selected artistic moods, not an astronomical clock.'},null,2)+'\n');console.log(JSON.stringify({passed:true,groups:checks.length,screenshots:shots.length}));
}catch(error){console.error(JSON.stringify({errors,failures,external}));throw error;}finally{await browser.close();}
