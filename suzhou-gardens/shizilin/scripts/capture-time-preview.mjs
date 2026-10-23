import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.TIME_ORIGIN||'http://127.0.0.1:4206/shizilin/';
const output=path.resolve(import.meta.dirname,'../docs/reviews/time-1');fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(120000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));assert.equal((await page.goto(origin)).status(),200);
 await page.waitForFunction(()=>window.__GARDEN__?.ready&&window.__GARDEN__.view==='overview'&&window.__WATER__?.period==='dawn'&&window.__WATER__.captures>0);
 await page.locator('canvas').screenshot({path:path.join(output,'overview-dawn-canvas.jpg'),type:'jpeg',quality:88});
 await page.screenshot({path:path.join(output,'desktop-overview-dawn.jpg'),type:'jpeg',quality:88,fullPage:true});assert.deepEqual(errors,[]);
 const bytes=fs.readFileSync(path.join(output,'overview-dawn-canvas.jpg'));
 fs.writeFileSync(path.join(output,'preview-results.json'),JSON.stringify({browser:browser.version(),viewport:[1440,1000],dpr:1,reducedMotion:true,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,actual:await page.evaluate(()=>({garden:window.__GARDEN__,water:window.__WATER__})),errors},null,2)+'\n');console.log(JSON.stringify({passed:true,bytes:bytes.length}));
}finally{await browser.close();}
