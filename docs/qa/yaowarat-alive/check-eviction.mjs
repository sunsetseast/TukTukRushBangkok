import fs from 'node:fs';import assert from 'node:assert/strict';import {chromium}from'../../../artifacts/tuk-tuk-rush/node_modules/playwright/index.mjs';import{startQaServer}from'../../../artifacts/tuk-tuk-rush/scripts/browser-vite.mjs';
const out=new URL('./',import.meta.url),server=await startQaServer(24862),report={physicalIPhone:false,environment:'Linux Chromium SwiftShader',samples:[],errors:[]};let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('http://127.0.0.1:24862/?world=geographic&geographyQA&geoTime=night');await page.getByTestId('button-free-roam').tap({timeout:120000});await page.waitForFunction(()=>window.__geography?.stream.settled,undefined,{timeout:120000});
 await page.evaluate(()=>{window.__keepQuality=setInterval(()=>window.__geographyQA.session.setQuality('medium'),250);});
 const home=JSON.parse(fs.readFileSync(new URL('../../../artifacts/tuk-tuk-rush/scripts/yaowarat-alive-views.json',import.meta.url),'utf8'))[0];
 for(let cycle=0;cycle<3;cycle++)for(const away of [true,false]){
  const v=away?{lon:100.5537913,lat:13.8025991}:home;
  await page.evaluate(({v,away})=>{const q=window.__geographyQA;q.move(v.lon,v.lat,v.heading??0);const p=q.session.player;q.view(away?[p.x,12,p.z-20]:v.camera,away?[p.x,0,p.z]:v.target);},{v,away});
  await page.waitForFunction(({v})=>window.__geography.stream.settled&&Math.abs(window.__geography.coordinate.lon-v.lon)<.0003&&Math.abs(window.__geography.coordinate.lat-v.lat)<.0003,{v},{timeout:90000});await page.waitForTimeout(1500);
  report.samples.push({cycle,away,...await page.evaluate(()=>({ids:[...window.__geography.stream.ids].sort(),chunks:window.__geography.stream.active,geometries:window.__geography.geometries,ownedMeshes:window.__geography.activeMeshes,buildingGPUBytes:window.__geography.buildingGPUBytes,decorativeBytes:window.__geography.chinatown.bytes,facades:window.__geography.chinatown.facades.length,errors:window.__geography.stream.errors,disposed:window.__geography.stream.disposed}))});
 }
 const away=report.samples.filter(s=>s.away),homeSamples=report.samples.filter(s=>!s.away);
 assert(away.every(s=>s.decorativeBytes===0&&s.facades===0));assert(away.every(s=>s.geometries<=away[0].geometries+5),'Uploaded GPU resources return to the same away baseline');
 for(const s of homeSamples){assert.equal(s.ownedMeshes,homeSamples[0].ownedMeshes);assert.equal(s.decorativeBytes,homeSamples[0].decorativeBytes);assert.equal(s.buildingGPUBytes,homeSamples[0].buildingGPUBytes);assert.deepEqual(s.ids,homeSamples[0].ids);assert.equal(s.facades,357);assert(s.geometries<=s.ownedMeshes+100);}
 assert(report.samples.every(s=>s.errors===0));assert.deepEqual(report.errors,[]);report.pass=true;
}catch(e){report.failure=String(e);throw e;}finally{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(new URL('eviction-browser.json',out),JSON.stringify(report,null,2)+'\n');await browser?.close();server.kill();}
