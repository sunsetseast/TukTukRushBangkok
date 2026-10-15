import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {startQaServer} from './browser-vite.mjs';
const out=new URL('../../../docs/graphics/open-bangkok/evidence/',import.meta.url).pathname;
await fs.mkdir(out,{recursive:true});const server=await startQaServer(24215);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true}),page=await context.newPage();page.setDefaultTimeout(120000);
const errors=[],http=[],drives=[],stations=[],viewports=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)http.push(`${r.status()} ${r.url()}`);});
const frames=async(n=3)=>{const id=await page.evaluate(()=>window.__graphics.frameId);await page.waitForFunction(({id,n})=>window.__graphics.frameId>=id+n,{id,n});};
const shot=async name=>{const style=await page.addStyleTag({content:'.tt-ui{visibility:hidden!important}'});await page.screenshot({path:`${out}/${name}.jpg`,type:'jpeg',quality:85});await style.evaluate(s=>s.remove());};
try{
 await page.goto('http://127.0.0.1:24215');await page.waitForFunction(()=>window.__graphics);await page.getByTestId('button-free-roam').click();await frames();
 await page.evaluate(async()=>{window.__access=await import('/scripts/access-controller.mjs');});
 for(const id of ['pho','arun','paknam','icon','paragon']){
  const setup=await page.evaluate(id=>{const e=window.__graphics.engine,d=e.model.district,a=d.destinations.find(a=>a.id===id),j=window.__access.accessJourney(d,a);e.restart();e.model.traffic.length=0;e.setQuality('low');e.frameTime=-100000;delete window.__artCamera;const p=e.model.player,start=j.inbound[0],next=j.inbound[1];Object.assign(p,{x:start.x,z:start.z,heading:Math.atan2(next.x-start.x,next.z-start.z),speed:0,collision:0});e.model.snapshot.elapsed=240;e.triggerBoost();window.__journey={...j,id,metres:0,collisions:0,frames:0,leg:'inbound',state:{index:1,done:false},start:{...p}};e.pause();return {start:j.inbound[0],arrival:a.arrivalNode};},id);
  for(const leg of ['inbound','outbound']){
   await page.evaluate(leg=>{const j=window.__journey;j.leg=leg;j.state={index:1,done:false};},leg);
   for(let batch=0;batch<500;batch++){
    const done=await page.evaluate(()=>{const e=window.__graphics.engine,j=window.__journey;e.model.snapshot.phase='playing';for(let i=0;i<120&&!j.state.done;i++){Object.assign(e.model.input,window.__access.driveControl(e,j[j.leg],j.state));const p=e.model.player,x=p.x,z=p.z;e.update(1/60);j.metres+=Math.hypot(p.x-x,p.z-z);j.frames++;if(p.collision>.01)j.collisions++;}e.pause();e.frameTime=-100000;return j.state.done;});
    if(done)break;if(batch===499)throw Error(`${id} ${leg} stuck`);
   }
   await frames(5);if(leg==='inbound'){await shot(`${id}-arrival`);if(id==='pho'){
    const paused=await page.evaluate(()=>{const e=window.__graphics.engine;e.resume();if(!e.viewPho())throw Error('Pho view unavailable at arrival');const before=JSON.stringify({s:e.model.snapshot,boost:e.boost,rail:e.railService.trains});for(let i=0;i<20;i++)e.update(.05);return {before,after:JSON.stringify({s:e.model.snapshot,boost:e.boost,rail:e.railService.trains})};});assert.equal(paused.before,paused.after);await frames();await shot('pho-inspection');await page.getByRole('button',{name:'RETURN TO TUK-TUK'}).click();await page.evaluate(()=>window.__graphics.engine.pause());
   }}
  }
  const result=await page.evaluate(()=>{const j=window.__journey;return {id:j.id,metres:j.metres,frames:j.frames,collisionFrames:j.collisions,start:j.start,end:{...window.__graphics.engine.model.player},controllerOnly:true,acceleratedSimulation:true};});assert.equal(result.collisionFrames,0);drives.push(result);console.log('Drive',id,Math.round(result.metres));
 }
 for(const id of ['siam','chong-nonsi','asok','saphan-taksin','charoen-nakhon','national-stadium','sala-daeng']){
  const pose=await page.evaluate(id=>{const e=window.__graphics.engine,d=e.model.district,s=d.transit.lines.flatMap(l=>l.stations).find(s=>s.id===id);e.restart();e.pause();e.setQuality('medium');e.frameTime=-100000;const target={x:s.x-Math.sin(s.yaw)*65,z:s.z-Math.cos(s.yaw)*65};const n=d.nodes.filter(n=>!n.id.startsWith('arrival:')).reduce((a,n)=>Math.hypot(n.x-target.x,n.z-target.z)<Math.hypot(a.x-target.x,a.z-target.z)?n:a);Object.assign(e.model.player,{x:n.x,z:n.z,heading:Math.atan2(s.x-n.x,s.z-n.z),speed:0});e.model.snapshot.elapsed=323;e.railService.update(323);return {id,x:n.x,z:n.z};},id);await frames(6);await shot(`station-${id}`);stations.push(pose);
 }
 const moving=await page.evaluate(()=>{const e=window.__graphics.engine,before=e.railService.trains.map(t=>({id:t.id,distance:t.distance}));e.model.snapshot.elapsed+=3;e.railService.update(e.model.snapshot.elapsed);return {before,after:e.railService.trains.map(t=>({id:t.id,distance:t.distance}))};});assert(moving.before.some((t,i)=>Math.abs(t.distance-moving.after[i].distance)>5));await frames();
 // Real CDP multitouch uses the existing controls, including pointer cancellation.
 await page.evaluate(()=>{const e=window.__graphics.engine;e.restart();e.frameTime=-100000;});await frames();
 const center=async id=>{const b=await page.getByTestId(id).boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2};},cdp=await context.newCDPSession(page);
 const steer=await center('control-steer'),gas=await center('button-gas'),boost=await center('button-boost'),brake=await center('button-brake'),touches=[{id:1,...steer},{id:2,...gas},{id:3,...boost}];
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touches});touches[0].x+=24;await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:touches});await frames();
 const multi=await page.evaluate(()=>{const e=window.__graphics.engine;return {gas:e.model.input.gas,steer:e.model.input.steer,boost:e.boost.state};});assert(multi.gas&&multi.steer>.2&&multi.boost==='active');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:touches.slice(0,2)});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touches[0],touches[1],{id:4,...brake}]});assert(await page.evaluate(()=>window.__graphics.engine.model.input.brake));await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
 assert.deepEqual(await page.evaluate(()=>({gas:window.__graphics.engine.model.input.gas,brake:window.__graphics.engine.model.input.brake,steer:window.__graphics.engine.model.input.steer})),{gas:false,brake:false,steer:0});
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await page.evaluate(()=>window.__graphics.engine.model.snapshot.phase),'paused');
 for(const [width,height] of [[844,390],[932,430],[1280,800],[375,812],[430,932]]){await page.setViewportSize({width,height});await page.evaluate(()=>window.__graphics.engine.restart());await frames();if(width>height){await page.getByTestId('button-open-map').click();const map=page.getByTestId('world-map');await map.waitFor();assert.equal(await map.locator('[data-testid^="map-rail-"]').count(),3);await page.getByTestId('button-transit-layer').click();assert.equal(await map.locator('[data-testid^="map-rail-"]').count(),0);await page.getByTestId('button-close-map').click();for(const id of ['button-boost','button-gas','button-brake','control-steer']){const p=await center(id);assert(p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height);}}else assert(await page.getByTestId('hint-rotate').isVisible());viewports.push({width,height,pass:true});}
 const restarts=[];for(let i=0;i<3;i++){await page.evaluate(i=>{const e=window.__graphics.engine;e.restart();e.pause();e.setQuality(i%2?'medium':'low');},i);await frames(5);restarts.push(await page.evaluate(()=>({...window.__graphics.stats})));}assert.equal(restarts[0].geometries,restarts[2].geometries);assert.equal(restarts[0].textures,restarts[2].textures);
 assert.deepEqual(errors,[]);assert.deepEqual(http,[]);await fs.writeFile(`${out}/qa.json`,JSON.stringify({pass:true,drives,stations,moving,viewports,multitouch:multi,cancellation:true,focusPause:true,restarts,errors,http,environment:await browser.version(),physicalIPhone:false,videoRecorded:false},null,2));
}finally{await browser.close();server.kill();}
