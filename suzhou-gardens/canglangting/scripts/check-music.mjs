import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
const { PNG } = createRequire(import.meta.url)('pngjs');
const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'docs/reviews/music-1');
const asset = JSON.parse(fs.readFileSync(path.join(output, 'audio-asset.json'), 'utf8'));
const garden = asset.id.split('-')[0];
const origin = process.env.MUSIC_TEST_ORIGIN || 'http://127.0.0.1:4194';
const checks = [], errors = [], external = [], failures = [];
let faultTest = false;
const browser = await chromium.launch({ executablePath:'/usr/bin/chromium', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce' });
await context.addInitScript(() => {
 const Native = window.AudioContext;
 window.__audioAudit = { gains:[], contexts:[] };
 window.AudioContext = class extends Native {
  constructor(...args) { super(...args); window.__audioAudit.contexts.push(this); }
  createGain() {
   const gain = super.createGain();
   const analyser = this.createAnalyser(); analyser.fftSize=2048;
   gain.connect(analyser);
   window.__audioAudit.gains.push({gain,analyser}); return gain;
  }
 };
});
await context.route('**/*', route => {
 const url=route.request().url();
 if(url.startsWith(origin+'/')||/^(data|blob|about):/.test(url)) return route.continue();
 external.push(url); return route.abort();
});
const page=await context.newPage();
page.on('pageerror', e=>errors.push(e.message));
page.on('requestfailed',r=>failures.push({url:r.url(),faultTest,error:r.failure()?.errorText}));
let musicRequests=0;
page.on('request',r=>{if(r.url().endsWith('.mp3'))musicRequests++;});
const noOverflow=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');
async function ready() {
 await page.waitForFunction(()=>(window.__LIUYUAN__||window.__GARDEN__)?.ready && (window.__LIUYUAN__||window.__GARDEN__).triangles>1000,null,{timeout:60000});
}
async function audible() {
 await page.waitForFunction(()=>{
  const a=document.querySelector('audio');
  const audit=window.__audioAudit;
  if(!a || a.paused || a.currentTime<1 || !audit.gains.length || audit.contexts[0].state!=='running')return false;
  const values=new Float32Array(2048);audit.gains[0].analyser.getFloatTimeDomainData(values);
  const rms=Math.sqrt(values.reduce((sum,x)=>sum+x*x,0)/values.length);
  window.__audioAudit.rms=rms;return rms>.0001;
 },null,{timeout:20000});
 return await page.evaluate(()=>({time:document.querySelector('audio').currentTime,rms:window.__audioAudit.rms,context:window.__audioAudit.contexts[0].state,gain:window.__audioAudit.gains[0].gain.gain.value}));
}
try {
 let response=await page.goto(origin+'/'+garden+'/');assert.equal(response.status(),200);await ready();await noOverflow();
 const toggle=page.getByTestId('music-toggle'), slider=page.getByTestId('music-volume');
 assert.equal(await toggle.getAttribute('aria-pressed'),'false');
 assert.deepEqual(await page.locator('audio').evaluate(a=>({paused:a.paused,preload:a.preload,loop:a.loop,time:a.currentTime})),{paused:true,preload:'none',loop:true,time:0});
 assert.equal(musicRequests,0,'Music fetched before opt-in');
 for(const element of [toggle,slider]) {const rect=await element.boundingBox();assert(rect.width>=44&&rect.height>=44);}
 checks.push({check:'Silent initial entry and lazy local music',musicRequests:0,touchTargets44:true});
 // Changing level before first playback must not apply both element and node gain.
 await slider.focus();await page.keyboard.press('ArrowRight');assert.equal(await slider.inputValue(),'35');
 await toggle.focus();await page.keyboard.press('Space');
 const sound=await audible();assert(Math.abs(sound.gain-.35)<.01);
 assert.equal(await page.locator('audio').evaluate(a=>a.volume),1);
 checks.push({check:'Keyboard opt-in, real MP3 decode and nonzero routed audio',...sound});
 await page.screenshot({path:path.join(output,'mobile-music.jpg'),type:'jpeg',quality:84,fullPage:true});
 const bytes=await page.locator('canvas').screenshot({type:'png'});const png=PNG.sync.read(bytes);
 let sum=0,square=0;for(let i=0;i<png.data.length;i+=4){const v=(png.data[i]+png.data[i+1]+png.data[i+2])/3;sum+=v;square+=v*v;}
 const n=png.width*png.height;assert(square/n-(sum/n)**2>80,'Empty WebGL canvas');
 const last=page.locator('[data-testid^="view-"]').last();const view=(await last.getAttribute('data-testid')).slice(5);await last.click();
 await page.waitForFunction(id=>(window.__LIUYUAN__||window.__GARDEN__)?.view===id,view,{timeout:30000});
 assert.equal(await page.locator('audio').evaluate(a=>a.paused),false);await page.getByTestId('reset-view').click();await ready();
 checks.push({check:'Real garden rendering, view change and reset while playing',view,canvasVariance:Math.round(square/n-(sum/n)**2)});
 await toggle.click();const at=await page.locator('audio').evaluate(a=>a.currentTime);await page.waitForTimeout(400);
 assert.equal(await page.locator('audio').evaluate(a=>a.paused),true);assert(Math.abs((await page.locator('audio').evaluate(a=>a.currentTime))-at)<.1);
 await toggle.click();await audible();
 // Advance the real media to its final fraction and observe its own loop.
 await page.locator('audio').evaluate(a=>{assertFinite(a.duration);a.currentTime=a.duration-.3;function assertFinite(x){if(!Number.isFinite(x))throw Error('Unknown duration');}});
 await page.waitForFunction(()=>document.querySelector('audio').currentTime<2&&!document.querySelector('audio').paused,null,{timeout:10000});
 checks.push({check:'Pause/resume and actual end-to-start media loop',passed:true});
 await slider.focus();await page.keyboard.press('Home');
 await page.waitForFunction(()=>window.__audioAudit.gains[0].gain.gain.value<.001);
 await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
 assert.equal(await slider.inputValue(),'10');
 checks.push({check:'Keyboard volume reaches silent gain and changes audibly',passed:true});
 // Probe native visibility first. Headless Chromium may keep every tab visible;
 // in that case drive the visibility input explicitly, keeping real audio.
 const other=await context.newPage();await other.goto('about:blank');await other.bringToFront();
 const nativeHidden=await page.evaluate(()=>document.hidden);
 if(!nativeHidden) await page.evaluate(()=>{
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
  document.dispatchEvent(new Event('visibilitychange'));
 });
 await page.waitForFunction(()=>document.hidden&&document.querySelector('audio').paused,null,{timeout:10000});
 await page.bringToFront();await other.close();
 if(!nativeHidden) await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 assert.equal(await page.locator('audio').evaluate(a=>a.paused),true);assert.equal(await toggle.getAttribute('aria-pressed'),'false');
 await toggle.click();await audible();checks.push({check:'Visibility guard pauses real media; foreground needs explicit resume',passed:true,verification:nativeHidden?'Native tab visibility':'Controlled visibility input; native headless tabs stay visible'});
 await page.setViewportSize({width:320,height:700});await noOverflow();
 const font=await page.addStyleTag({content:'html {font-size:200%}'});await noOverflow();
 for(const element of [toggle,slider]){const r=await element.boundingBox();assert(r.x>=0&&r.x+r.width<=320&&r.height>=44);}
 await page.screenshot({path:path.join(output,'mobile-text-200.jpg'),type:'jpeg',quality:84,fullPage:true});
 await font.evaluate(e=>e.remove());await page.setViewportSize({width:1440,height:1000});await noOverflow();
 await page.screenshot({path:path.join(output,'desktop-music.jpg'),type:'jpeg',quality:84,fullPage:true});
 checks.push({check:'390/320 phone, 200% text and desktop layout',noOverflow:true});
 // Reload retains only volume, with no automatic download or playback.
 const requestsBefore=musicRequests;response=await page.reload();assert.equal(response.status(),200);await ready();
 assert.equal(await slider.inputValue(),'10');assert.equal(await toggle.getAttribute('aria-pressed'),'false');assert.equal(musicRequests,requestsBefore);
 await toggle.click();await audible();await page.getByTestId('return-map').click();await page.waitForURL(origin+'/#garden='+garden);
 await page.locator(`[data-garden="${garden}"]`).click();await page.waitForURL(origin+'/'+garden+'/');await ready();
 assert.equal(await toggle.getAttribute('aria-pressed'),'false');checks.push({check:'Reload and map round trip retain volume but stop music',passed:true});
 // One explicitly induced failed request: real media failure and recovery UI.
 faultTest=true;await page.route('**/*.mp3',route=>route.abort());await toggle.click();
 await page.getByRole('button',{name:'重试音乐'}).waitFor();assert((await page.locator('.music-message').textContent()).includes('无法播放'));
 await page.unroute('**/*.mp3');faultTest=false;await page.getByRole('button',{name:'重试音乐'}).click();await audible();
 // Two user gestures in immediate succession must leave playback stopped.
 await toggle.click();await toggle.evaluate(b=>{b.click();b.click();});
 await page.waitForFunction(()=>document.querySelector('audio').paused&&document.querySelector('[data-testid="music-toggle"]').getAttribute('aria-pressed')==='false');
 checks.push({check:'Induced media error, successful retry and rapid on/off',passed:true});
 await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('Storage blocked');};Storage.prototype.setItem=()=>{throw Error('Storage blocked');};window.AudioContext=undefined;});
 await page.reload();await ready();assert.equal(await slider.inputValue(),'30');await toggle.click();
 await page.waitForFunction(()=>!document.querySelector('audio').paused&&document.querySelector('audio').currentTime>1,null,{timeout:15000});
 assert(Math.abs((await page.locator('audio').evaluate(a=>a.volume))-.3)<.01);
 checks.push({check:'Blocked storage and unavailable Web Audio still play via native media',passed:true});
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(failures.every(x=>x.faultTest),'Unexpected request failure');
 const result={date:new Date().toLocaleDateString('en-CA',{timeZone:'America/Los_Angeles'}),garden,track:asset.id,browser:browser.version(),passed:true,checks,scriptErrors:errors,externalRequests:external,expectedFaultRequests:failures,limits:'Local final output, real media decoding, Web Audio analyser and SwiftShader rendering. No physical listening device, iOS/Safari, mainland network, or real mobile audio interruption verified.'};
 fs.writeFileSync(path.join(output,'check-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({garden,passed:true,checks:checks.length,scriptErrors:errors.length,externalRequests:external.length}));
} finally {await browser.close();}
