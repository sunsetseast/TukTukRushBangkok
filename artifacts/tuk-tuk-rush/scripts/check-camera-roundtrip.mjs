import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {startQaServer} from './browser-vite.mjs';
const out=path.resolve(process.env.QA_OUT||'../../docs/qa/colorful-bangkok');
if(process.env.APP_ROOT)process.chdir(process.env.APP_ROOT);
const server=await startQaServer(24265),browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const p=await browser.newPage({viewport:{width:844,height:390},reducedMotion:'reduce'});p.setDefaultTimeout(90000);
 const errors=[];p.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message);});p.on('response',r=>{if(r.status()>=400)console.error('HTTP',r.status(),r.url());});await p.goto('http://127.0.0.1:24265');await p.waitForFunction(()=>window.__graphics).catch(async e=>{console.error('PAGE BODY',await p.locator('body').innerText());throw e;});await p.getByTestId('button-free-roam').click();
 const frames=async()=>{const f=await p.evaluate(()=>window.__graphics.frameId);await p.waitForFunction(f=>window.__graphics.frameId>f+3,f);};
 await p.evaluate(()=>{const e=window.__graphics.engine,d=e.model.district,n=d.nodes.find(n=>n.id===d.destinations.find(a=>a.id==='icon').arrivalNode);e.update=()=>{};e.setQuality('low');Object.assign(e.model.player,{x:n.x,z:n.z,heading:0,speed:0,collision:0});e.publish();});await frames();
 assert(await p.evaluate(()=>window.__graphics.engine.viewLandmark('icon')));// Wait for the actual authored LOOK preset to finish blending. ICONSIAM's
 // facade view is now lower; the regression must not depend on the old 40 m cutoff.
 await p.waitForFunction(()=>{const g=window.__graphics,e=g.engine,out={position:[0,0,0],target:[0,0,0]};return e.inspection.update(0,out,e.model.district)&&Math.hypot(g.camera.position.x-out.position[0],g.camera.position.y-out.position[1],g.camera.position.z-out.position[2])<.1;});await frames();
 const inspectionHeight=await p.evaluate(()=>window.__graphics.camera.position.y);assert(inspectionHeight>10);
 await p.getByTestId('inspection-return').click();await p.waitForFunction(()=>window.__graphics.camera.position.y<6);await frames();
 const returnHeight=await p.evaluate(()=>window.__graphics.camera.position.y);assert(returnHeight<6);
 await p.getByTestId('button-open-map').click();await p.getByTestId('world-map').waitFor();await p.getByTestId('button-close-map').click();await frames();
 const afterMap=await p.evaluate(()=>window.__graphics.camera.position.y);
 await p.evaluate(()=>window.__graphics.engine.restart());await frames();
 const afterRestart=await p.evaluate(()=>window.__graphics.camera.position.y);
 const baselineBug=!!process.env.EXPECT_BASELINE_BUG;
 if(baselineBug){assert(afterMap>10,'Reproduce the old LOOK pose replay after map clock reset');assert(afterRestart>10,'Old restart retains the bad blend');}
 else {assert(afterMap<6,'Map closure must not replay an earlier LOOK pose');assert(afterRestart<6,'Restart must restore local chase after map/LOOK transitions');}
 assert.deepEqual(errors,[]);await fs.mkdir(out,{recursive:true});
 const result={baselineBug,inspectionHeight,returnHeight,afterMap,afterRestart,errors,physicalIPhone:false};
 await fs.writeFile(`${out}/camera-${baselineBug?'main':'pr'}.json`,JSON.stringify(result,null,2)+'\n');console.log('PASS',JSON.stringify(result));
}finally{await browser.close();server.kill();}
