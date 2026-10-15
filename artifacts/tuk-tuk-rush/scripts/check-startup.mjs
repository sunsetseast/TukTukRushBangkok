import assert from 'node:assert/strict';
import {build,createServer} from 'vite';

process.env.PORT ||= '24218';
process.env.BASE_PATH ||= '/';
const browserSmoke=process.env.STARTUP_BROWSER==='1';
const packages=['polygon-clipping','splaytree','robust-predicates'];
// Fail even on a fully installed checkout if authoring leaks into the browser.
// This reproduces the user's missing-package startup environment without
// moving or deleting anyone's node_modules directory.
const denyAuthoring=()=>({name:'deny-offline-road-dependencies',enforce:'pre',resolveId(id){
 if(packages.some(p=>id===p||id.startsWith(`${p}/`)||id.includes(`/node_modules/${p}/`)))
  throw new Error(`Offline road dependency reached the browser: ${id}`);
}});
const configFile=new URL('../vite.config.ts',import.meta.url).pathname;
await build({configFile,logLevel:'warn',plugins:[denyAuthoring()],build:{write:false}});
console.log('PASS production build with polygon-clipping and its dependencies unavailable');
if(browserSmoke){
 // Vite's build API sets NODE_ENV=production; the following dev-server smoke
 // intentionally needs the development diagnostics used by gameplay QA.
 process.env.NODE_ENV='development';
 const {chromium}=await import('playwright');
 const server=await createServer({configFile,plugins:[denyAuthoring()],optimizeDeps:{exclude:packages},server:{host:'127.0.0.1',port:24218,strictPort:true}});
 let browser;
 try{
  await server.listen();
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true}),errors=[],http=[];page.setDefaultTimeout(120000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)http.push(`${r.status()} ${r.url()}`);});
  const modes=[];
  for(const mode of ['bangkok','chinatown']){
   await page.goto(`http://127.0.0.1:24218/${mode==='chinatown'?'?world=chinatown':''}`);
   await page.waitForFunction(()=>window.__graphics);await page.getByTestId('button-free-roam').click();
   const start=await page.evaluate(()=>({...window.__graphics.engine.model.player}));
   await page.keyboard.down('ArrowUp');
   await page.waitForFunction(p=>{const q=window.__graphics.engine.model.player;return Math.hypot(q.x-p.x,q.z-p.z)>2;},start);
   await page.keyboard.up('ArrowUp');
   const result=await page.evaluate(()=>{const e=window.__graphics.engine;return {world:e.model.district.worldId||'chinatown',speed:e.model.player.speed,phase:e.model.snapshot.phase};});
   assert.equal(result.phase,'playing');assert(result.speed>0);assert.equal(result.world,mode);
   await page.evaluate(()=>{const e=window.__graphics.engine;e.pause();const t=e.model.snapshot.elapsed;e.update(.05);if(e.model.snapshot.elapsed!==t)throw Error('Pause failed');e.resume();e.restart();});
   if(mode==='bangkok'){await page.getByTestId('button-open-map').click();await page.getByTestId('world-map').waitFor();await page.getByTestId('button-close-map').click();}
   modes.push({mode,pass:true,driving:true,pauseResumeRestart:true});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(http,[]);
  console.log(JSON.stringify({pass:true,missingPackages:packages,modes,browserErrors:errors,httpErrors:http,physicalIPhone:false,recordings:0}));
 }finally{await browser?.close();await server.close();}
}
