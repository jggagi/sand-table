import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
const {PNG}=createRequire(import.meta.url)('pngjs');
const root=path.resolve(import.meta.dirname,'..');
const key=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).name.split('-')[0];
const origin=process.env.CRAFT_ORIGIN||'http://127.0.0.1:4195';
const folder=path.join(root,'docs/reviews/craft-1');fs.mkdirSync(folder,{recursive:true});
const records=[],errors=[],external=[],failures=[];let fault=false;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,reducedMotion:'reduce'});
await context.addInitScript(()=>{
 const targets=new WeakMap();window.__craftDraws={offscreen:0,screen:0};
 const p=WebGL2RenderingContext.prototype,bind=p.bindFramebuffer;
 p.bindFramebuffer=function(target,buffer){if(target===this.FRAMEBUFFER||target===this.DRAW_FRAMEBUFFER)targets.set(this,buffer);return bind.call(this,target,buffer);};
 for(const name of ['drawElements','drawArrays']){
  const draw=p[name];p[name]=function(...args){window.__craftDraws[targets.get(this)?'offscreen':'screen']++;return Reflect.apply(draw,this,args);};
 }
});
await context.route('**/*',route=>{const u=route.request().url();if(u.startsWith(origin+'/')||/^(data|blob):/.test(u))return route.continue();external.push(u);return route.abort();});
const page=await context.newPage();page.setDefaultTimeout(120000);
page.on('pageerror',e=>errors.push({message:e.message,fault}));
page.on('console',m=>{if(m.type()==='error')errors.push({message:m.text(),fault});});
page.on('requestfailed',r=>failures.push({url:r.url(),error:r.failure()?.errorText,fault}));
const ready=async(expected)=>page.waitForFunction(id=>{const s=window.__LIUYUAN__||window.__GARDEN__;return s?.ready&&s.triangles>1000&&(id===undefined||s.view===id)&&document.querySelector('main').dataset.renderStatus==='ready';},expected,{timeout:120000});
const state=()=>page.evaluate(()=>window.__LIUYUAN__||window.__GARDEN__);
const noOverflow=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');
try {
 const response=await page.goto(origin+'/'+key+'/');assert.equal(response.status(),200);await ready();await noOverflow();
 const info=await state();const pixels=PNG.sync.read(await page.locator('canvas').screenshot({type:'png',timeout:120000}));
 let sum=0,squared=0;for(let i=0;i<pixels.data.length;i+=4){const v=(pixels.data[i]+pixels.data[i+1]+pixels.data[i+2])/3;sum+=v;squared+=v*v;}
 const count=pixels.width*pixels.height,variance=squared/count-(sum/count)**2;assert(variance>80,'Blank canvas');
 records.push({check:'Real refined scene, shader compilation and nonempty pixels',calls:info.calls,triangles:info.triangles,pixelVariance:Math.round(variance)});
 const initial=await page.evaluate(()=>({...window.__craftDraws}));assert(initial.offscreen>0,'Shadow map was never generated');
 const last=page.locator('[data-testid^="view-"]').last();const lastId=(await last.getAttribute('data-testid')).slice(5);await last.click();await ready(lastId);await page.getByTestId('reset-view').click();await ready('overview');
 const changed=await page.evaluate(()=>({...window.__craftDraws}));assert.equal(changed.offscreen,initial.offscreen,'Static shadows redrawn on camera change');assert(changed.screen>initial.screen);
 records.push({check:'Camera presets reuse actual static shadow framebuffer',initial,afterCamera:changed});
 const cdp=await context.newCDPSession(page),canvas=await page.locator('canvas').boundingBox();
 const x=canvas.x+canvas.width*.5,y=canvas.y+canvas.height*.5;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+55,y:y+10}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await ready(null);assert.equal((await state()).view,null);
 await page.getByTestId('reset-view').click();await ready('overview');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-35,y},{x:x+35,y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-65,y},{x:x+65,y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await ready();
 const zoomed=await state();assert(zoomed.zoom>=zoomed.minZoom-.01&&zoomed.zoom<=zoomed.maxZoom+.01);
 await page.getByTestId('reset-view').click();await ready('overview');records.push({check:'Real one-finger orbit, two-finger zoom and reset',zoom:zoomed.zoom,min:zoomed.minZoom,max:zoomed.maxZoom});
 const atRest=(await state()).frames;await page.waitForTimeout(500);assert((await state()).frames-atRest<=2);records.push({check:'Demand rendering sleeps at rest',passed:true});
 const audio=page.locator('audio');assert.equal(await audio.evaluate(a=>a.paused),true);
 await page.getByTestId('music-toggle').click();await page.waitForFunction(()=>!document.querySelector('audio').paused&&document.querySelector('audio').currentTime>.5,null,{timeout:30000});
 await page.getByTestId('music-volume').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.getByTestId('music-volume').inputValue(),'35');
 await page.getByTestId('music-toggle').click();assert.equal(await audio.evaluate(a=>a.paused),true);records.push({check:'Existing opt-in music, actual media playback, pause and volume',passed:true});
 await page.setViewportSize({width:320,height:700});const font=await page.addStyleTag({content:'html{font-size:200%}'});await noOverflow();
 const rect=await page.getByTestId('return-map').boundingBox();assert(rect.width>=44&&rect.height>=44);await font.evaluate(e=>e.remove());
 await page.setViewportSize({width:844,height:390});await ready();await noOverflow();
 await page.setViewportSize({width:390,height:844});await ready();records.push({check:'320px and 200% text, landscape and portrait resize',passed:true});
 await page.getByTestId('return-map').click();await page.waitForURL(origin+'/#garden='+key);assert.equal(await page.locator('.garden-marker.is-current').getAttribute('data-garden'),key);
 await page.locator(`[data-garden="${key}"]`).click();await ready();assert.equal(await page.locator('audio').evaluate(a=>a.paused),true);
 records.push({check:'Map round trip restores garden selection and keeps music paused',passed:true});
 if(['liuyuan','shizilin'].includes(key)){
  fault=true;await page.route('**/craft-stone.glb',route=>route.abort());await page.reload();await page.getByRole('alert').waitFor();
  assert((await page.getByRole('alert').textContent()).includes('重试')||(await page.getByRole('alert').textContent()).includes('加载'));
  await page.unroute('**/craft-stone.glb');await page.locator('.retry-button').click();await ready();fault=false;
  records.push({check:'Real GLB failure feedback and successful retry after clearing rejected loader cache',passed:true});
 }
 assert.deepEqual(errors.filter(e=>!e.fault),[]);assert.deepEqual(failures.filter(e=>!e.fault),[]);assert.deepEqual(external,[]);
 const result={date:'2026-10-22',garden:key,browser:browser.version(),passed:true,checks:records,errors,failures,externalRequests:external,limits:'Final local output, Chromium/SwiftShader, actual WebGL/media and CDP touch. No real iPhone/Android, Safari, mobile GPU frame-rate/heat or mainland network verification.'};
 fs.writeFileSync(path.join(folder,'browser-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({garden:key,passed:true,checks:records.length}));
}finally{await browser.close();}
