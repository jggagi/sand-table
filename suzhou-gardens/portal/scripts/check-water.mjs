import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
// Supply existing browser tooling; the buildless portal has no app dependency.
if (!path.isAbsolute(process.argv[2] || '')) throw Error('Pass the absolute installed Playwright index.mjs path.');
const {chromium}=await import(process.argv[2]);
const origin=process.env.CRAFT_ORIGIN || 'http://127.0.0.1:4196';
const root=path.resolve(import.meta.dirname,'..'), output=path.join(root,'docs/reviews/water-1');
fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'});
const page=await context.newPage(),errors=[],failures=[],external=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('requestfailed',r=>failures.push({url:r.url(),error:r.failure()?.errorText}));
await context.route('**/*',route=>{const u=route.request().url();if(u.startsWith(origin+'/')||/^(data|blob):/.test(u))return route.continue();external.push(u);return route.abort();});
const images=()=>page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
async function layout(){
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const rects=await page.locator('.garden-marker').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
 assert.equal(rects.length,5);
 for(const r of rects)assert(r.w>=44&&r.h>=44);
 for(let i=0;i<5;i++)for(let j=i+1;j<5;j++){const a=rects[i],b=rects[j];assert(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y));}
 const art=await page.locator('.map-art').evaluate(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,fit:getComputedStyle(e).objectFit}));
 assert(Math.abs(art.w-art.h)<1);assert.equal(art.fit,'contain');
}
try{
 const response=await page.goto(origin+'/');assert.equal(response.status(),200);await images();await layout();
 for(const key of ['liuyuan','wangshiyuan','zhuozhengyuan','shizilin','canglangting']){
  const marker=page.locator('#garden-'+key);assert.equal(await marker.getAttribute('href'),'./'+key+'/');
  await marker.focus();await images();
  assert((await page.locator('#preview-image').getAttribute('src')).endsWith('/'+key+'.jpg'));
  assert(await marker.evaluate(e=>e===document.activeElement));
 }
 checks.push({check:'Five unchanged package links, keyboard focus and actual updated preview images',passed:true});
 await page.locator('#garden-liuyuan').focus();await images();
 await page.screenshot({path:path.join(output,'desktop.jpg'),type:'jpeg',quality:86,fullPage:true});
 checks.push({check:'Desktop map, uncropped illustration and accessible markers',passed:true});
 await page.setViewportSize({width:390,height:844});await layout();await images();
 await page.screenshot({path:path.join(output,'mobile.jpg'),type:'jpeg',quality:86,fullPage:true});
 checks.push({check:'390px phone layout, images and 44px targets',passed:true});
 await page.setViewportSize({width:320,height:844});await page.addStyleTag({content:'html {font-size:200% !important;}'});await layout();
 checks.push({check:'320px and 200% text: no horizontal overflow or overlapping markers',passed:true});
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);assert.deepEqual(external,[]);
 fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify({date:new Date().toISOString().slice(0,10),browser:browser.version(),passed:true,checks,errors,failures,external,limits:'Final local upload output; no production fetching, mainland network or physical mobile verification. This round verifies the updated Shizilin preview; the actual Shizilin map round trip is recorded in its water-1 browser results. Other gardens were not reimplemented or revalidated this round.'},null,2)+'\n');
 console.log(JSON.stringify({passed:true,checks:checks.length}));
}finally{await browser.close();}
