import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.JOURNEY_ORIGIN||'http://127.0.0.1:4216';
const output=path.resolve(import.meta.dirname,'../docs/reviews/seam-1');fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],external=[],checks=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,isMobile:true,reducedMotion:'no-preference'}),page=await context.newPage();page.setDefaultTimeout(120000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(origin+'/')||/^(data|blob):/.test(url))return route.continue();external.push(url);return route.abort();});
 assert.equal((await page.goto(origin+'/shizilin/index.html')).status(),200);
 await page.waitForFunction(()=>window.__GARDEN__?.ready&&window.__WATER__?.active&&window.__WATER__.mode==='planar');
 assert(await page.evaluate(()=>parent===window));assert.equal(await page.locator('audio').evaluate(a=>a.paused),true);checks.push({check:'Standalone default has an actual ready scene, active water and quiet music without a host handshake',passed:true});
 await page.getByTestId('time-night').click();await page.waitForFunction(()=>window.__WATER__?.period==='night');
 await page.getByTestId('music-toggle').click();await page.waitForFunction(()=>{const a=document.querySelector('audio');return !a.paused&&a.currentTime>0;});await page.getByTestId('music-toggle').click();assert(await page.locator('audio').evaluate(a=>a.paused));checks.push({check:'Standalone night selection and real music playback/pause still work',passed:true});
 await page.getByTestId('return-map').click();await page.waitForURL(origin+'/#garden=shizilin');await page.waitForFunction(()=>document.body.dataset.journey==='map');assert.equal(await page.locator('iframe').count(),0);assert.equal(await page.locator('.garden-marker.is-current').getAttribute('data-garden'),'shizilin');checks.push({check:'Unembedded return uses the native full-page anchor to the local map; no mistaken retained-host interception',passed:true});
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);fs.writeFileSync(path.join(output,'standalone-results.json'),JSON.stringify({date:new Date().toISOString().slice(0,10),browser:browser.version(),passed:true,checks,errors,external,limits:'Actual local static output, Chromium/SwiftShader and mobile emulation; no physical phone/Safari/network measurements.'},null,2)+'\n');console.log(JSON.stringify({passed:true,groups:checks.length}));
}finally{await browser.close();}
