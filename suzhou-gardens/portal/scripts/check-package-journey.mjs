import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
if(!path.isAbsolute(process.argv[2]||''))throw Error('Pass the absolute installed Playwright index.mjs path.');
const {chromium}=await import(process.argv[2]);
const origin=process.env.JOURNEY_ORIGIN||'http://127.0.0.1:4226',output=path.resolve(import.meta.dirname,'../docs/reviews/seam-1');fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const errors=[],failures=[],external=[],checks=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(120000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('requestfailed',r=>failures.push({url:r.url(),error:r.failure()?.errorText}));
 await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(origin+'/')||/^(data|blob):/.test(url))return route.continue();external.push(url);return route.abort();});
 assert.equal((await page.goto(origin+'/')).status(),200);await page.evaluate(()=>window.__packageMap={retained:true});
 const links=await page.locator('.garden-marker').evaluateAll(es=>es.map(e=>({id:e.dataset.garden,url:e.href})));
 for(const link of links){assert.equal(link.url,origin+'/'+link.id+'/');assert.equal((await context.request.get(link.url+'index.html')).status(),200);}
 checks.push({check:'All five package links stay on this origin and all five independent entry documents return HTTP200',links});
 await page.locator('#garden-shizilin').click();await page.waitForFunction(()=>document.body.dataset.journey==='garden');const frame=page.frames().find(f=>f.url().startsWith(origin+'/shizilin/index.html?map=1'));assert(frame);await frame.waitForFunction(()=>window.__GARDEN__?.ready&&window.__WATER__?.captures>0);
 await frame.getByTestId('view-rockery').click();await frame.waitForFunction(()=>window.__GARDEN__?.ready&&window.__GARDEN__.view==='rockery');await frame.getByTestId('time-dusk').click();await frame.waitForFunction(()=>window.__WATER__?.period==='dusk');const before=await frame.evaluate(()=>({position:window.__GARDEN__.position,target:window.__GARDEN__.target,zoom:window.__GARDEN__.zoom,water:window.__WATER__}));
 await page.screenshot({path:path.join(output,'package-garden.jpg'),type:'jpeg',quality:86});await frame.getByTestId('return-map').click();await page.waitForFunction(()=>document.body.dataset.journey==='map');assert(await page.evaluate(()=>window.__packageMap.retained));assert.equal(await page.locator('#garden-shizilin').getAttribute('aria-hidden'),null);
 await page.locator('#garden-shizilin').click();await page.waitForFunction(()=>document.body.dataset.journey==='garden');await frame.waitForFunction(()=>window.__GARDEN__?.ready);const after=await frame.evaluate(()=>({position:window.__GARDEN__.position,target:window.__GARDEN__.target,zoom:window.__GARDEN__.zoom,period:window.__WATER__.period}));assert.deepEqual(after.position,before.position);assert.deepEqual(after.target,before.target);assert(Math.abs(after.zoom-before.zoom)<1e-6);assert.equal(after.period,'dusk');assert.equal(await page.locator('iframe').count(),1);checks.push({check:'Final packaged same-origin entry/return/re-entry retains the actual ready garden, camera and dusk state',before,after});
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);assert.deepEqual(external,[]);fs.writeFileSync(path.join(output,'package-browser-results.json'),JSON.stringify({date:new Date().toISOString().slice(0,10),browser:browser.version(),passed:true,checks,errors,failures,external,limits:'Final local complete CloudBase upload output, not an actual Tencent Cloud upload; other four gardens entry documents checked but WebGL was not rerun.'},null,2)+'\n');console.log(JSON.stringify({passed:true,groups:checks.length}));
}finally{await browser.close();}
