import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {startQaServer} from './browser-vite.mjs';
import {playableDrive} from './playable-drive.mjs';
const out=process.env.QA_OUTPUT||new URL('../../../docs/graphics/definitive-world/evidence/',import.meta.url).pathname;
await fs.mkdir(out,{recursive:true});const port=24200,server=await startQaServer(port);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true}),page=await context.newPage();page.setDefaultTimeout(120000);
const errors=[],failures=[],survey=[],drives=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)failures.push(`${r.status()} ${r.url()}`);});
const frames=async(n=3)=>{const id=await page.evaluate(()=>window.__graphics.frameId);await page.waitForFunction(({id,n})=>window.__graphics.frameId>=id+n,{id,n});};
try{
  const started=performance.now();await page.goto(`http://127.0.0.1:${port}/`);await page.waitForFunction(()=>window.__graphics);const loadMs=performance.now()-started;
  await page.getByTestId('button-free-roam').click();await frames();
  const scenes=[['yaowarat','gate',0],['yaowarat-night','gate',240],['gate','gate',240],['talatnoi','hua',120],['pho-road','pho',240],['arun','arun',120],['paknam','paknam',240],['icon','icon',240],['siam','paragon',120],['sathorn','mahanakhon',240],['baiyoke','baiyoke',240],['state','state',240],['khaosan','khaosan',240],['residential','victory',120],['riverfront','arun',240]];
  for(const [name,id,elapsed] of scenes.filter(s=>!process.env.QA_SCENES||process.env.QA_SCENES.split(',').includes(s[0]))){
    const pose=await page.evaluate(({name,id,elapsed})=>{
      const e=window.__graphics.engine,d=e.model.district,l=d.landmarks.find(l=>l.id===id);e.restart();e.pause();e.setQuality('medium');e.frameTime=-100000;delete window.__artCamera;
      const nearest=(x,z)=>d.nodes.reduce((best,n)=>Math.hypot(n.x-x,n.z-z)<Math.hypot(best.x-x,best.z-z)?n:best);
      let n=d.nodes.find(n=>n.id===l.accessNode);
      if(name.startsWith('yaowarat'))n=nearest(d.spawn.x,d.spawn.z);
      if(name==='talatnoi')n=nearest(160,360);
      if(name==='residential')n=nearest(-1600,-1000);
      if(name==='khaosan')n=nearest(-740,-1580);
      if(name==='sathorn')n=nearest(440,1370);
      if(name==='baiyoke')n=nearest(1024,-1240);
      if(name==='state')n=nearest(160,1470);
      if(['sathorn','baiyoke','state'].includes(name)){
        const height={sathorn:154,baiyoke:157,state:137}[name],plot=l.plot;
        const blocked=(n,y)=>d.buildings.some(b=>{
          const yaw=b.yaw??0,c=Math.cos(yaw),s=Math.sin(yaw),dx=plot.x-n.x,dz=plot.z-n.z;
          const px=c*(n.x-b.x)-s*(n.z-b.z),pz=s*(n.x-b.x)+c*(n.z-b.z),vx=c*dx-s*dz,vz=s*dx+c*dz;
          let lo=0,hi=1;for(const [p,v,r] of [[px,vx,b.w/2],[pz,vz,b.d/2]]){if(Math.abs(v)<1e-7){if(Math.abs(p)>r)return false;}else{let a=(-r-p)/v,z=(r-p)/v;if(a>z)[a,z]=[z,a];lo=Math.max(lo,a);hi=Math.min(hi,z);if(lo>hi)return false;}}
          return lo<.99&&hi>.01&&3.3+Math.max(0,lo)*(y-3.3)<b.height;
        });
        const candidates=d.nodes.filter(n=>{const dist=Math.hypot(n.x-plot.x,n.z-plot.z);return dist>300&&dist<520;});
        n=candidates.sort((a,b)=>{
          const score=q=>[height*.45,height*.7,height].filter(y=>blocked(q,y)).length*1000+Math.abs(Math.hypot(q.x-plot.x,q.z-plot.z)-370);
          return score(a)-score(b);
        })[0]??n;
      }
      const r=d.roads.find(r=>r.a===n.id&&!r.shortcut&&!r.bridge)||d.roads.find(r=>(r.a===n.id||r.b===n.id)&&!r.shortcut),next=d.nodes.find(q=>q.id===(r.a===n.id?r.b:r.a));
      let heading=Math.atan2(next.x-n.x,next.z-n.z);
      if(!['yaowarat','yaowarat-night','talatnoi','residential','khaosan'].includes(name))heading=Math.atan2(l.plot.x-n.x,l.plot.z-n.z);
      Object.assign(e.model.player,{x:n.x,z:n.z,heading,speed:0,steer:0,collision:0});e.model.snapshot.elapsed=elapsed;return {x:n.x,z:n.z,heading,landmark:id,elapsed};
    },{name,id,elapsed});
    await page.addStyleTag({content:'.tt-ui{visibility:hidden!important}'});await frames(5);
    const samples=[];for(let i=0;i<5;i++){await frames(1);samples.push(await page.evaluate(()=>({...window.__graphics.stats})));}
    await page.screenshot({path:`${out}/${name}.jpg`,type:'jpeg',quality:88});survey.push({name,pose,samples});console.log('Survey',name);
  }
  if(process.env.QA_SURVEY_ONLY){await fs.writeFile(`${out}/final-survey.json`,JSON.stringify({loadMs,survey,errors,failures},null,2));assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);process.exitCode=0;}
  if(!process.env.QA_SURVEY_ONLY){
  await page.evaluate(()=>document.querySelectorAll('style').forEach(s=>{if(s.textContent.includes('.tt-ui{visibility:hidden'))s.remove();}));
  await page.evaluate(()=>{const e=window.__graphics.engine,l=e.model.district.landmarks.find(l=>l.id==='pho'),n=e.model.district.nodes.find(n=>n.id===l.accessNode);Object.assign(e.model.player,{x:n.x,z:n.z,speed:0});e.resume();});
  await page.getByTestId('button-view-pho').click();await frames(4);await page.getByTestId('pho-inspection').waitFor();
  const paused=await page.evaluate(()=>{const e=window.__graphics.engine,before={time:e.model.snapshot.elapsed,shift:e.model.snapshot.shiftTime,trip:e.model.snapshot.tripTime,boost:e.boost.active};for(let i=0;i<100;i++)e.update(.05);return {before,after:{time:e.model.snapshot.elapsed,shift:e.model.snapshot.shiftTime,trip:e.model.snapshot.tripTime,boost:e.boost.active}};});assert.deepEqual(paused.before,paused.after);
  await page.screenshot({path:`${out}/reclining-buddha.jpg`,type:'jpeg',quality:90});await page.getByRole('button',{name:'RETURN TO TUK-TUK'}).click();
  const cdp=await context.newCDPSession(page),center=async id=>{const b=await page.getByTestId(id).boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2};};
  await page.evaluate(()=>window.__graphics.engine.restart());await frames();
  const steer=await center('control-steer'),gas=await center('button-gas'),boost=await center('button-boost'),brake=await center('button-brake');
  const touches=[{id:1,...steer},{id:2,...gas},{id:3,...boost}];await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touches});touches[0].x+=24;await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:touches});await frames(3);
  const multi=await page.evaluate(()=>{const e=window.__graphics.engine;return {gas:e.model.input.gas,steer:e.model.input.steer,state:e.boost.state};});assert(multi.gas&&multi.steer>.2&&multi.state==='active');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:touches.slice(0,2)});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touches[0],touches[1],{id:4,...brake}]});assert(await page.evaluate(()=>window.__graphics.engine.model.input.brake));await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  assert.deepEqual(await page.evaluate(()=>({gas:window.__graphics.engine.model.input.gas,brake:window.__graphics.engine.model.input.brake,steer:window.__graphics.engine.model.input.steer})),{gas:false,brake:false,steer:0});
  await page.evaluate(()=>window.__graphics.engine.pause());const b=await page.evaluate(()=>window.__graphics.engine.boost.active);await frames(3);assert.equal(await page.evaluate(()=>window.__graphics.engine.boost.active),b);
  await page.evaluate(()=>window.__graphics.engine.resume());await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await page.evaluate(()=>window.__graphics.engine.model.snapshot.phase),'paused');
  const viewports=[];for(const [width,height] of [[844,390],[932,430],[1280,800],[375,812],[430,932]]){
    await page.setViewportSize({width,height});await page.evaluate(()=>window.__graphics.engine.restart());await frames(3);
    if(width>height){for(const id of ['button-boost','button-gas','button-brake','control-steer']){const p=await center(id);assert(p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height);}await page.getByTestId('button-open-map').click();await page.getByTestId('world-map').waitFor();await page.getByTestId('button-close-map').click();}
    else assert(await page.getByTestId('hint-rotate').isVisible());viewports.push({width,height,pass:true});
  }
  await page.setViewportSize({width:844,height:390});
  for(const spec of [['yaowarat',110,-50,-240,-250,240,3],['paknam',-1680,450,-1680,520,240,3],['khaosan',-900,-1580,-600,-1580,240,3],['riverfront',-1450,-900,-1370,-590,240,3]]){
    const result=await playableDrive(page,spec,Date.now());assert(result.metres>8);assert.equal(result.collisionFrames,0);drives.push(result);console.log('Driven',result.name,Math.round(result.metres),'m');
  }
  const lifecycle=[];for(let i=0;i<3;i++){await page.evaluate(()=>window.__graphics.engine.restart());await frames(3);lifecycle.push(await page.evaluate(()=>({...window.__graphics.stats})));}
  const result={pass:errors.length===0&&failures.length===0,loadMs,survey,viewports,multitouch:multi,inspectionTimers:paused,drives,lifecycle,errors,failures,environment:'Chromium 142 / SwiftShader; keyboard/pointer drives use normal chase camera. Repositioned stills are surveys. No physical iPhone certification.'};
  await fs.writeFile(`${out}/qa.json`,JSON.stringify(result,null,2));assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);console.log(JSON.stringify({pass:true,scenes:survey.length,drives:drives.length,viewports:viewports.length}));
  }
}finally{await browser.close();server.kill();}
