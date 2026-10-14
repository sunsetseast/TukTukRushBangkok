/** Small browser-input evidence sequence. Stills are sampled at actual simulation times. */
import {chromium} from 'playwright';import fs from 'node:fs/promises';import {startQaServer} from './browser-vite.mjs';
const out=new URL('../../../docs/graphics/definitive-world/evidence/',import.meta.url).pathname,raw=process.env.DEMO_RAW||'/workspace/scratch/cab704b74542/demo';await fs.mkdir(raw,{recursive:true});
const server=await startQaServer(24204),browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true});page.setDefaultTimeout(120000);await page.goto('http://127.0.0.1:24204');await page.waitForFunction(()=>window.__graphics);await page.getByTestId('button-free-roam').click();
 await page.evaluate(()=>{const e=window.__graphics.engine,d=e.model.district,r=d.roads.find(r=>r.corridor==='sukhumvit'),a=d.nodes.find(n=>n.id===r.a),b=d.nodes.find(n=>n.id===r.b),h=Math.atan2(b.x-a.x,b.z-a.z);e.restart();e.frameTime=-100000;Object.assign(e.model.player,{x:a.x+Math.sin(h)*12+Math.cos(h)*3,z:a.z+Math.cos(h)*12-Math.sin(h)*3,heading:h});e.model.traffic=[];e.model.snapshot.elapsed=240;});
 const samples=[];const capture=async name=>{const s=await page.evaluate(()=>({time:window.__graphics.engine.model.snapshot.elapsed,state:window.__graphics.engine.boost.state,active:window.__graphics.engine.boost.active,recharge:window.__graphics.engine.boost.recharge,speed:window.__graphics.engine.model.player.speed,collision:window.__graphics.engine.model.player.collision,position:{x:window.__graphics.engine.model.player.x,z:window.__graphics.engine.model.player.z}}));await page.screenshot({path:`${raw}/${name}.png`});samples.push({name,...s});};
 await capture('ready');await page.keyboard.down('ArrowUp');await page.getByTestId('button-boost').tap();await capture('active-start');
 await page.waitForFunction(()=>window.__graphics.engine.boost.active<3);await capture('active-middle');
 await page.keyboard.up('ArrowUp');await page.waitForFunction(()=>window.__graphics.engine.boost.state==='recharging');await capture('recharging');
 await page.waitForFunction(()=>window.__graphics.engine.boost.recharge<5);await capture('recharge-middle');await page.waitForFunction(()=>window.__graphics.engine.boost.state==='ready');await capture('ready-again');
 await fs.writeFile(`${out}/boost-demo.json`,JSON.stringify({input:'Touch BOOST + keyboard throttle, normal chase camera, no pose edits after setup; traffic disabled for this isolated boost demonstration',samples},null,2));
 await page.evaluate(()=>{
   const e=window.__graphics.engine,d=e.model.district,r=d.roads.find(r=>r.corridor==='silom'),a=d.nodes.find(n=>n.id===r.a),b=d.nodes.find(n=>n.id===r.b),len=Math.hypot(b.x-a.x,b.z-a.z),ux=(b.x-a.x)/len,uz=(b.z-a.z)/len;
   e.restart();e.frameTime=-100000;e.model.snapshot.elapsed=240;Object.assign(e.model.player,{x:a.x+ux*2+uz*3,z:a.z+uz*2-ux*3,heading:Math.atan2(ux,uz)});
   e.model.traffic=[{id:1000,from:a.id,to:b.id,x:a.x+ux*len*.75+uz*3,z:a.z+uz*len*.75-ux*3,heading:Math.atan2(ux,uz),speed:9,kind:'taxi',color:'#e36c9a',wait:0,nearMissCooldown:0},{id:1001,from:b.id,to:a.id,x:b.x-ux*len*.65-uz*3,z:b.z-uz*len*.65+ux*3,heading:Math.atan2(-ux,-uz),speed:9,kind:'taxi',color:'#51b69c',wait:0,nearMissCooldown:0}];
 });
 const trafficSamples=[];
 for(let i=0;i<4;i++){
   if(i)await page.waitForFunction(t=>window.__graphics.engine.model.snapshot.elapsed>=t,240+i*.7);
   trafficSamples.push(await page.evaluate(()=>({elapsed:window.__graphics.engine.model.snapshot.elapsed,cars:window.__graphics.engine.model.traffic.map(c=>({...c}))})));
   await page.screenshot({path:`${raw}/traffic-${i}.png`});
 }
 await fs.writeFile(`${out}/traffic-demo.json`,JSON.stringify({setup:'Two diagnostic vehicles start on an actual Silom road, then move through the normal TrafficSystem. Player is stationary; normal chase camera.',samples:trafficSamples},null,2));
 console.log({pass:true,samples:samples.length,collisions:samples.map(s=>s.collision)});
}finally{await browser.close();server.kill();}
