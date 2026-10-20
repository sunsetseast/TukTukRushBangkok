import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {startQaServer} from './browser-vite.mjs';

const output=process.env.CITY_PROFILE_OUTPUT;
if(!output)throw Error('Set CITY_PROFILE_OUTPUT');
const server=await startQaServer(24456),started=Date.now();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={renderer:'Chromium headless shell / SwiftShader',viewport:[640,360],quality:'medium',physicalIPhone:false,trafficDisabled:true,errors:[],locations:[]};
try{
 const page=await browser.newPage({viewport:{width:640,height:360}});page.setDefaultTimeout(300000);page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('http://127.0.0.1:24456/?qa=1');await page.waitForFunction(()=>window.__graphics?.frameId>2);report.startupMs=Date.now()-started;
 await page.getByTestId('button-free-roam').click();await page.addStyleTag({content:'.tt-ui{visibility:hidden!important}'});
 await page.evaluate(()=>{const e=window.__graphics.engine;e.pause();e.setQuality('medium');e.model.traffic.length=0;});
 for(const [id,x,y] of [['palace',295,335],['hua',602,550],['gate',550,610]]){
  const pose=await page.evaluate(({id,x,y})=>{
   const g=window.__graphics,e=g.engine,d=e.model.district,nodes=new Map(d.nodes.map(n=>[n.id,n])),wanted={x:(x-500)*4,z:(y-600)*4};
   const candidates=d.roads.filter(r=>!r.noTraffic).map(r=>{const a=nodes.get(r.a),b=nodes.get(r.b),dx=b.x-a.x,dz=b.z-a.z,t=Math.max(.1,Math.min(.9,((wanted.x-a.x)*dx+(wanted.z-a.z)*dz)/(dx*dx+dz*dz)));const p={x:a.x+t*dx,z:a.z+t*dz};return {...p,road:r.corridor,distance:Math.hypot(p.x-wanted.x,p.z-wanted.z)};}).sort((a,b)=>a.distance-b.distance);
   const p=candidates[0],l=d.landmarks.find(l=>l.id===id),target=l.plot??l;e.cameraRevision++;delete window.__artCamera;Object.assign(e.model.player,{x:p.x,z:p.z,heading:Math.atan2(target.x-p.x,target.z-p.z),speed:0,collision:0});e.model.snapshot.elapsed=40;return p;
  },{id,x,y});
  const stats=await page.evaluate(async()=>{
   const frame=()=>new Promise(r=>requestAnimationFrame(r));for(let i=0;i<40;i++)await frame();
   const samples=[];for(let i=0;i<40;i++){await frame();samples.push({...window.__graphics.stats});}return samples;
  });
  report.locations.push({id,pose,warmupFrames:40,samples:stats});console.log(id,stats.at(-1));
 }
}finally{await browser.close();server.kill();await fs.writeFile(output,JSON.stringify(report,null,2));}
if(report.errors.length)throw Error(report.errors.join('\n'));
