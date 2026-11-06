/** PR59 matched runtime evidence. Headless software WebGL is not an iPhone benchmark. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {startQaServer} from './browser-vite.mjs';
const baseline=!!process.env.GEOGRAPHY_QA_BASELINE_REF;
const out=new URL('../../../docs/qa/geographic-consolidation/',import.meta.url);
fs.mkdirSync(out,{recursive:true});
const report={environment:'Linux Chromium / SwiftShader, 844x390 touch simulation; not physical iPhone',baseline,errors:[],checks:[],transitions:[]};
const server=await startQaServer(24830);let browser;
try {
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 report.browser=browser.version();
 const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true});
 page.setDefaultTimeout(45000);page.on('pageerror',e=>report.errors.push(e.message));
 const start=performance.now();
 await page.goto('http://127.0.0.1:24830/?world=geographic&geographyQA&geoPerf=1');
 await page.waitForFunction(()=>window.__geography?.stream.active>0,undefined,{timeout:90000});
 report.firstChunkMs=performance.now()-start;
 await page.getByTestId('button-free-roam').waitFor();
 await page.getByTestId('button-free-roam').tap();
 await page.waitForFunction(()=>window.__geography?.snapshot.phase==='playing');
 report.playableMs=performance.now()-start;
 await page.waitForFunction(()=>window.__geography?.stream.settled&&window.__geography.stream.active>=9,undefined,{timeout:90000});
 report.nineChunksMs=performance.now()-start;
 report.initial=await page.evaluate(()=>window.__geography);
 const frames=()=>page.evaluate(()=>new Promise(resolve=>{let last=performance.now();const a=[];const tick=now=>{a.push(now-last);last=now;if(a.length<90)requestAnimationFrame(tick);else{a.sort((a,b)=>a-b);resolve({samples:a.length,medianMs:a[44],p95Ms:a[85],worstMs:a.at(-1)});}};requestAnimationFrame(tick);}));
 report.trafficOnFrames=await frames();
 await page.getByLabel('Close performance monitor').tap();
 const settings=async()=>{if(!baseline)await page.getByRole('button',{name:'Settings',exact:true}).tap();};
 const closeSettings=async()=>{if(!baseline){await page.getByRole('button',{name:'Close settings',exact:true}).tap();await page.getByRole('button',{name:'Resume drive',exact:true}).tap();}};
 await settings();await page.getByTestId('geographic-traffic-toggle').tap();await closeSettings();
 report.trafficOffFrames=await frames();
 // Actual control input; no setInput helper bypass for steering/pedals.
 const cdp=await page.context().newCDPSession(page);
 const hold=async(id,dx=0)=>{const box=await page.getByTestId(id).boundingBox();assert(box);const x=box.x+box.width/2,y=box.y+box.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});if(dx)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx,y}]});await page.waitForTimeout(750);const input=await page.evaluate(()=>({...window.__geographyQA.session.model.input}));await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});return input;};
 if(!baseline){
  assert.equal((await hold('button-gas')).gas,true);assert.equal((await hold('button-brake')).brake,true);assert((await hold('control-steer',35)).steer>.2);
  await page.getByTestId('button-boost').tap();assert.equal(await page.evaluate(()=>window.__geographyQA.session.boost.state),'active');
  await page.getByTestId('button-horn').tap();
  await page.getByRole('button',{name:'Pause',exact:true}).tap();
  const pose=await page.evaluate(()=>({...window.__geography.position}));await page.waitForTimeout(500);
  assert.deepEqual(await page.evaluate(()=>({...window.__geography.position})),pose);
  await page.getByRole('button',{name:'Recover vehicle',exact:true}).tap();
  await page.getByRole('button',{name:'Resume drive',exact:true}).tap();
  await page.getByRole('button',{name:'Route map',exact:true}).tap();
  await page.getByTestId('geographic-map').waitFor();assert.equal(await page.evaluate(()=>window.__geographyQA.session.model.snapshot.phase),'paused');
  await page.getByLabel('Geographic destination').selectOption({index:2});
  await page.screenshot({path:new URL('route-map.png',out).pathname});
  await page.getByRole('button',{name:'Close route map',exact:true}).tap();
  await settings();await page.getByLabel('Graphics quality').selectOption('low');await closeSettings();
  await settings();await page.getByLabel('Graphics quality').selectOption('medium');await closeSettings();
  report.checks.push('touch steering/gas/brake/boost/horn','pause freezes drive; recovery/resume','map pauses; destination selection and touch close','Fast/Pretty settings');
 }
 // Same geographic QA relocations in both versions. These stress eviction, not claim an organic paid drive.
 const original=await page.evaluate(()=>({wallet:window.__geographyQA.session.career.profile.wallet,passenger:window.__geographyQA.session.model.snapshot.passenger}));
 for(const [lon,lat] of [[100.5537913,13.8025991],[100.5214619,13.7192683],[100.5537913,13.8025991],[100.5129044,13.7370463]]){
  await page.evaluate(([lon,lat])=>window.__geographyQA.move(lon,lat),[lon,lat]);
  await page.waitForFunction(()=>window.__geography.stream.settled,undefined,{timeout:90000});
  const snapshot=await page.evaluate(()=>window.__geography);
  assert(snapshot.stream.active<=25);assert(snapshot.buildings>0);assert(snapshot.stream.errors===0);
  report.transitions.push({position:snapshot.coordinate,stream:snapshot.stream,buildings:snapshot.buildings,buildingGPUBytes:snapshot.buildingGPUBytes,geometries:snapshot.geometries,activationMs:snapshot.activationMs});
 }
 const final=await page.evaluate(()=>window.__geography);assert.equal(final.snapshot.passenger,original.passenger);assert.equal(final.snapshot.wallet,original.wallet);
 report.final=final;report.checks.push('repeated eviction/revisit preserves mission and wallet');
 if(!baseline){
  await page.screenshot({path:new URL('driving-landscape.png',out).pathname});
  // LOOK uses the existing production inspection control. Reposition to its authored access.
  await page.evaluate(()=>{const {session,places,network}=window.__geographyQA;const p=network.stops[0];Object.assign(session.player,{x:p.x,z:p.z,speed:0});session.district.driving.reset(session.player);});
  await page.waitForTimeout(1000);
  if(await page.getByTestId('button-view-landmark').isVisible()){await page.getByTestId('button-view-landmark').tap();await page.waitForFunction(()=>!!window.__geographyQA.session.model.snapshot.viewingLandmark);await page.keyboard.press('Escape');report.checks.push('LOOK opens/closes inspection');}
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>window.__geographyQA.session.model.snapshot.phase==='paused');
  assert.deepEqual(await page.evaluate(()=>({...window.__geographyQA.session.model.input})),{gas:false,brake:false,steer:0});
  await page.setViewportSize({width:844,height:390});await page.getByRole('button',{name:'Resume drive',exact:true}).tap();
  await page.getByRole('button',{name:'Pause',exact:true}).tap();await page.getByRole('button',{name:'Real-Scale Bangkok menu',exact:true}).tap();
  await page.getByTestId('button-start-shift').tap();await page.waitForFunction(()=>window.__geographyQA.session.model.snapshot.mode==='shift');
  report.checks.push('orientation pauses and clears input','return to geographic menu and Start shift');
  report.fare=await page.evaluate(()=>{
    const {session}=window.__geographyQA, before=session.career.profile.wallet;
    const arrive=()=>{const target=session.model.snapshot.target;Object.assign(session.player,{x:target.x,z:target.z,speed:0});session.clearInput();session.district.driving.reset(session.player);for(let i=0;i<80;i++)session.update(1/60);};
    arrive();const boarded=session.model.snapshot.stage==='delivery';arrive();session.career.flush();
    return {method:'QA relocation to source pickup/delivery; actual production fare updates, not a no-teleport drive',boarded,deliveries:session.model.snapshot.deliveries,earnings:session.model.snapshot.earnings,before,after:session.career.profile.wallet,xp:session.career.profile.xp,storage:localStorage.getItem('tuktuk:career:v1')};
  });
  assert(report.fare.boarded);assert(report.fare.deliveries>=1);assert(report.fare.after>report.fare.before);assert(report.fare.earnings>0);assert(report.fare.storage);
  report.checks.push('shift passenger boarding, delivery, earnings, XP and saved career');

  // An actual DOM WebGL context loss event must expose a reload escape, never leave a blank trap.
  await page.evaluate(()=>document.querySelector('canvas').dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
  await page.getByRole('alert').filter({hasText:'graphics connection was lost'}).waitFor();
  report.checks.push('WebGL context loss recovery UI');
  await page.goto('http://127.0.0.1:24830/');await page.getByTestId('button-geographic-preview').waitFor({timeout:90000});
  await page.getByTestId('button-free-roam').tap();await page.waitForFunction(()=>window.__ttEngine?.model.snapshot.phase==='playing',undefined,{timeout:90000});
  report.checks.push('compact Bangkok startup and Free Roam');
 }
 assert.deepEqual(report.errors,[]);
} catch(error){report.failure=String(error);throw error;}
finally{fs.writeFileSync(new URL(baseline?'browser-before.json':'browser-after.json',out),JSON.stringify(report,null,2)+'\n');await browser?.close();server.kill();}
