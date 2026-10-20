import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {startQaServer} from './browser-vite.mjs';
const out=process.env.CITY_OUTPUT??new URL('../../../docs/qa/world-blueprint/',import.meta.url).pathname;
const label=process.env.CITY_LABEL??'after',port=+(process.env.CITY_PORT??24601);
const scenes=[
 {id:'gate-drive',at:[144,-4],road:'odeon',heading:Math.PI},
 {id:'yaowarat-entry',at:[70,-70],road:'yaowarat'},
 {id:'yaowarat-gold-row',at:[-95,-150],road:'yaowarat'},
 {id:'yaowarat-curve',at:[-320,-280],road:'yaowarat'},
 {id:'yaowarat-elevated',at:[-120,-160],road:'yaowarat',camera:[80,110,70],look:[-170,6,-200]},
 {id:'tha-tien-drive',at:[-940,-880],road:'old_w',heading:Math.PI},
 {id:'tha-tien-river',at:[-900,-730],road:'old_w',camera:[-1040,3.4,-735],look:[-900,5,-720]},
 {id:'tha-tien-elevated',at:[-940,-810],road:'old_w',camera:[-1050,95,-610],look:[-960,3,-795]},
];
await fs.mkdir(`${out}/${label}`,{recursive:true});
const server=await startQaServer(port),browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={label,viewport:[768,432],quality:'medium',renderer:'Chrome 138 / SwiftShader',physicalIPhone:false,cityObjectsHidden:false,trafficDisabled:true,records:[],errors:[]};
try {
 const p=await browser.newPage({viewport:{width:768,height:432}});p.setDefaultTimeout(300000);p.on('pageerror',e=>report.errors.push(e.message));
 await p.goto(`http://127.0.0.1:${port}/?qa=1`);await p.waitForFunction(()=>window.__graphics?.frameId>1);await p.getByTestId('button-free-roam').click();
 await p.addStyleTag({content:'.tt-ui,[data-testid=button-city-inspector]{visibility:hidden!important}'});
 await p.evaluate(()=>{const e=window.__graphics.engine;e.pause();e.setQuality('medium');e.model.traffic.length=0;});
 for(const s of scenes)for(const light of ['sunset','night']) {
  const pose=await p.evaluate(({s,light})=>{
   const g=window.__graphics,e=g.engine,d=e.model.district,nodes=new Map(d.nodes.map(n=>[n.id,n]));
   const near=d.roads.filter(r=>r.corridor===s.road).map(r=>{const a=nodes.get(r.a),b=nodes.get(r.b),dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((s.at[0]-a.x)*dx+(s.at[1]-a.z)*dz)/(dx*dx+dz*dz))),x=a.x+t*dx,z=a.z+t*dz;return {x,z,heading:Math.atan2(dx,dz),distance:Math.hypot(x-s.at[0],z-s.at[1]),road:r.corridor};}).sort((a,b)=>a.distance-b.distance)[0];
   Object.assign(e.model.player,{x:near.x,z:near.z,heading:s.heading??near.heading,speed:0,collision:0});e.model.snapshot.elapsed=light==='night'?720:40;e.cameraRevision++;e.frameTime=-100000;
   delete window.__artCamera;if(s.camera)window.__artCamera={position:s.camera,look:s.look};
   return {player:{x:near.x,z:near.z,heading:e.model.player.heading},camera:s.camera?{position:s.camera,look:s.look}:null,publicRoad:near.road,normalDriving:!s.camera};
  },{s,light});
  const f=await p.evaluate(()=>window.__graphics.frameId);await p.waitForFunction(f=>window.__graphics.frameId>f+2,f);await p.evaluate(()=>window.__graphics.gl.getContext().finish());
  const file=`${s.id}-${light}.jpg`;await p.screenshot({path:`${out}/${label}/${file}`,type:'jpeg',quality:88,timeout:180000});
  report.records.push({id:s.id,light,file,pose,stats:await p.evaluate(()=>({...window.__graphics.stats}))});
  await fs.writeFile(`${out}/${label}/capture.json`,JSON.stringify(report,null,2));console.log(label,file);
 }
} finally {await browser.close();server.kill();}
if(report.errors.length)throw Error(report.errors.join('\n'));
