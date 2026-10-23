import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const root=path.resolve(import.meta.dirname,'..'),phase=process.argv[2]||'after';
if(!['before','after'].includes(phase))throw Error('Choose before or after');
const origin=process.env.WATER_ORIGIN||'http://127.0.0.1:4186/';
const folder=path.join(root,'docs/reviews/water-1');fs.mkdirSync(folder,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'});
const page=await context.newPage(),errors=[],external=[],records=[];page.setDefaultTimeout(120000);
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(origin).origin+'/')||/^(data|blob):/.test(url))return route.continue();external.push(url);return route.abort();});
async function shot(id,device){
 await page.getByTestId('view-'+id).click();
 await page.waitForFunction(id=>window.__GARDEN__?.ready&&window.__GARDEN__.view===id&&document.querySelector('main')?.dataset.renderStatus==='ready',id,{timeout:120000});
 if(phase==='after')await page.waitForFunction(()=>window.__WATER__?.captures>0&&window.__WATER__.mode==='planar');
 await page.screenshot({path:path.join(folder,`${phase}-${device}-${id}.jpg`),type:'jpeg',quality:88,fullPage:true});
 if(phase==='after'&&device==='desktop'&&id==='overview')await page.locator('canvas').screenshot({path:path.join(folder,'after-overview-canvas.jpg'),type:'jpeg',quality:88,timeout:120000});
 const d=await page.evaluate(()=>window.__GARDEN__);records.push({device,id,position:d.position,target:d.target,zoom:d.zoom,calls:d.calls,triangles:d.triangles});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
}
try{
 const response=await page.goto(origin);assert.equal(response.status(),200);
 for(const id of ['overview','rockery','waterside','corridor'])await shot(id,'desktop');
 await page.setViewportSize({width:390,height:844});for(const id of ['overview','waterside'])await shot(id,'mobile');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 fs.writeFileSync(path.join(folder,phase+'-frames.json'),JSON.stringify({browser:browser.version(),phase,viewport:[1440,1000],phone:[390,844],dpr:1,reducedMotion:true,records,errors,external},null,2)+'\n');
 console.log(JSON.stringify({phase,frames:records.length,passed:true}));
}catch(error){
 console.error(JSON.stringify({errors,external}));
 await page.screenshot({path:path.join(root,'.sites-runtime/water-capture-failed.jpg'),type:'jpeg',quality:80,fullPage:true}).catch(()=>{});
 throw error;
}finally{await browser.close();}
