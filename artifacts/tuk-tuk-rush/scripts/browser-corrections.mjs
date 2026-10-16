import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { startQaServer } from './browser-vite.mjs';
const out=path.resolve(process.env.QA_OUT||'../../docs/qa/colorful-bangkok/after');
if(process.env.APP_ROOT)process.chdir(process.env.APP_ROOT);
await fs.mkdir(out,{recursive:true});
const server=await startQaServer(24260), browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={errors:[],checks:[],physicalIPhone:false};
try{
 const p=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,reducedMotion:'reduce'});p.setDefaultTimeout(120000);p.on('pageerror',e=>{report.errors.push(e.message);console.error(e.message);});
 await p.addInitScript(()=>localStorage.setItem('ttr-lessons-v1',JSON.stringify(['accelerate','steer','brake','pickup','map','boost'])));
 await p.goto('http://127.0.0.1:24260');await p.waitForFunction(()=>window.__graphics?.frameId>2);
 const frames=async()=>{const f=await p.evaluate(()=>window.__graphics.frameId);await p.waitForFunction(f=>window.__graphics.frameId>f+3,f);};
 const shot=async name=>{if(process.env.CAPTURE_ONLY&&process.env.CAPTURE_ONLY!==name)return;await frames();await p.evaluate(()=>window.__graphics.gl.getContext().finish());await p.screenshot({path:`${out}/${name}.jpg`,type:'jpeg',quality:85,animations:'disabled'});};
 if(!process.env.CHECK_ONLY)await shot('title');await p.getByTestId('button-free-roam').click();
 await p.evaluate(()=>{const e=window.__graphics.engine;window.__normalUpdate=e.update.bind(e);e.update=()=>{};e.setQuality('low');e.model.traffic.length=0;});
 for(const [id,name] of [['icon','waterfront'],['paknam','paknam']]){
  await p.evaluate(async id=>{const e=window.__graphics.engine,d=e.model.district,a=d.destinations.find(a=>a.landmarkId===id),arrival=d.nodes.find(n=>n.id===a.arrivalNode),l=d.landmarks.find(l=>l.id===id),journey=(await import('/scripts/access-controller.mjs')).accessJourney(d,a),n=id==='paknam'?[...journey.inbound].sort((p,q)=>Math.abs(Math.hypot(p.x-l.plot.x,p.z-l.plot.z)-170)-Math.abs(Math.hypot(q.x-l.plot.x,q.z-l.plot.z)-170))[0]:arrival;Object.assign(e.model.player,{x:n.x,z:n.z,heading:Math.atan2(l.plot.x-n.x,l.plot.z-n.z),speed:0});Object.assign(e.model.snapshot,{elapsed:145,viewingLandmark:undefined,phase:'playing',stage:'delivery',target:{...arrival,name:l.name+' · visitor drop-off'},distance:Math.hypot(n.x-arrival.x,n.z-arrival.z),boarding:0,message:''});e.publish();},id);
  if(!process.env.CHECK_ONLY)await shot(name);
 }
 await p.evaluate(async()=>{const e=window.__graphics.engine,d=e.model.district,world=await import('/src/game/bangkok/world.ts'),nodes=new Map(d.nodes.map(n=>[n.id,n]));const r=d.roads.filter(r=>r.corridor==='pinklao').sort((r,q)=>Math.abs(world.riverDistance(d,nodes.get(r.a))-d.riverWidth/2-180)-Math.abs(world.riverDistance(d,nodes.get(q.a))-d.riverWidth/2-180))[0],a=nodes.get(r.a),b=nodes.get(r.b),h=world.riverDistance(d,a)>world.riverDistance(d,b)?Math.atan2(b.x-a.x,b.z-a.z):Math.atan2(a.x-b.x,a.z-b.z),target=d.nodes.find(n=>n.id===d.landmarks.find(l=>l.id==='arun').accessNode);Object.assign(e.model.player,{x:a.x,z:a.z,heading:h,speed:0});Object.assign(e.model.snapshot,{target:{...target,name:'Wat Arun · visitor drop-off'},distance:1500,message:''});e.publish();});if(!process.env.CHECK_ONLY)await shot('bridge-approach');
 await p.evaluate(()=>{const e=window.__graphics.engine,d=e.model.district,s=d.transit.lines.flatMap(l=>l.stations).find(s=>s.id==='charoen-nakhon'),nodes=new Map(d.nodes.map(n=>[n.id,n])),candidates=d.roads.filter(r=>!r.destinationId).flatMap(r=>[nodes.get(r.a),nodes.get(r.b)]).filter(n=>Math.hypot(n.x-s.x,n.z-s.z)>35);const n=candidates.sort((a,b)=>Math.abs(Math.hypot(a.x-s.x,a.z-s.z)-60)-Math.abs(Math.hypot(b.x-s.x,b.z-s.z)-60))[0];Object.assign(e.model.player,{x:n.x,z:n.z,heading:Math.atan2(s.x-n.x,s.z-n.z),speed:0});e.model.snapshot.distance=Math.hypot(e.model.snapshot.target.x-n.x,e.model.snapshot.target.z-n.z);e.publish();});if(!process.env.CHECK_ONLY)await shot('gold-line');
 await p.evaluate(()=>{const e=window.__graphics.engine;e.model.snapshot.discoveredDistricts=e.model.district.regions.slice(0,6).map(r=>r.id);e.publish();});
 await p.getByTestId('button-open-map').click();await p.getByTestId('world-map').waitFor();await p.waitForTimeout(350);if(!process.env.CHECK_ONLY&&(!process.env.CAPTURE_ONLY||process.env.CAPTURE_ONLY==='map'))await p.screenshot({path:`${out}/map.jpg`,type:'jpeg',quality:85,animations:'disabled'});
 if(!process.env.APP_ROOT){
  await p.getByTestId('button-close-map').click();
  for(const id of ['icon','asiatique','paknam']){
   await p.evaluate(id=>{const e=window.__graphics.engine,d=e.model.district,a=d.destinations.find(a=>a.landmarkId===id),n=d.nodes.find(n=>n.id===a.arrivalNode);Object.assign(e.model.player,{x:n.x,z:n.z,heading:.4,speed:0,collision:0});e.model.snapshot.phase='playing';e.model.snapshot.viewingLandmark=undefined;e.publish();},id);await frames();
   const pose=await p.evaluate(()=>{const g=window.__graphics,p=g.engine.model.player,v=new g.three.Vector3(p.x,1,p.z).project(g.camera);return {height:g.camera.position.y,visible:Math.abs(v.x)<1&&Math.abs(v.y)<1};});assert(pose.height<6&&pose.visible,'Arrival keeps the tuk tuk in the chase frame');
   assert(await p.evaluate(id=>window.__graphics.engine.viewLandmark(id),id));await frames();
   await p.getByTestId('inspection-return').click();await frames();assert((await p.evaluate(()=>window.__graphics.camera.position.y))<6,'LOOK exit restores ground-level camera');
   await p.evaluate(()=>{window.__artCamera={position:[1000,160,1000],look:[0,50,0]};window.__graphics.engine.restart();});await frames();
   assert(await p.evaluate(()=>{const g=window.__graphics,p=g.engine.model.player;return !window.__artCamera&&g.camera.position.y<6&&Math.hypot(g.camera.position.x-p.x,g.camera.position.z-p.z)<15;}));
  }
  report.checks.push('ICONSIAM/Asiatique/Wat Paknam arrival, LOOK return and restart restore visible ground-level chase');
  await p.evaluate(()=>{window.__artCamera={position:[2000,200,2000],look:[0,30,0]};});await frames();assert.equal(await p.evaluate(()=>!!window.__artCamera),false,'Ordinary preview ignores unapproved art camera');
  const names=await p.evaluate(()=>window.__graphics.engine.model.district.landmarks.map(l=>l.name).sort((a,b)=>b.length-a.length).slice(0,6));
  for(const name of names){
   await p.evaluate(name=>{const e=window.__graphics.engine,d=e.model.district,n=d.nodes.find(n=>n.id===d.landmarks.find(l=>l.id==='paknam').accessNode);Object.assign(e.model.player,d.spawn,{speed:0});Object.assign(e.model.snapshot,{phase:'playing',target:{...n,name:name+' · visitor drop-off'},distance:2000,stage:'pickup'});e.publish();},name);
   await p.getByTestId('destination-banner').evaluate(async el=>{await new Promise(r=>setTimeout(r,150));});
   await p.waitForFunction(()=>document.querySelector('[data-testid="destination-banner"]').dataset.mode==='compact');
   const fit=await p.getByTestId('text-destination').evaluate(el=>{const r=el.getBoundingClientRect(),button=el.closest('button').getBoundingClientRect(),pause=document.querySelector('[data-testid="button-pause"]').getBoundingClientRect();return r.bottom<=button.bottom&&r.right<=pause.left-6&&el.scrollWidth<=el.clientWidth;});assert(fit,`Long place name must fit: ${name}`);
  }
  report.checks.push('Six longest current landmark names fit the compact sign and clear pause');
  await p.getByTestId('button-pause').click();await p.getByTestId('button-pause-settings').click();await p.screenshot({path:`${out}/settings.jpg`,type:'jpeg',quality:85,animations:'disabled'});
 }
 report.resources=await p.evaluate(()=>{const buffers=new Set(),materials=new Set();const add=a=>{const array=a?.array??a?.data?.array;if(array)buffers.add(array.buffer);};window.__graphics.scene.traverse(o=>{if(o.geometry){Object.values(o.geometry.attributes).forEach(add);add(o.geometry.index);}add(o.instanceMatrix);add(o.instanceColor);if(o.material)[o.material].flat().forEach(m=>materials.add(m));});return {geometryBytes:[...buffers].reduce((s,b)=>s+b.byteLength,0),materials:materials.size};});
 assert.deepEqual(report.errors,[]);
 await fs.writeFile(`${out}/checks.json`,JSON.stringify(report,null,2));
 console.log('PASS focused gameplay captures',out);
}finally{await browser.close();server.kill();}
