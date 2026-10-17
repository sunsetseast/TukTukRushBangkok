import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {startQaServer} from './browser-vite.mjs';
const root=new URL('../../../docs/qa/real-bangkok-architecture/',import.meta.url).pathname,label=process.env.ART_LABEL||'after';
await fs.mkdir(`${root}/${label}`,{recursive:true});
const server=await startQaServer(24289),browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:800,height:500}}),errors=[];page.setDefaultTimeout(180000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:24289/?qa=1');await page.waitForFunction(()=>window.__graphics);await page.getByTestId('button-free-roam').click();
 await page.addStyleTag({content:'.tt-ui{visibility:hidden!important}'});
 const poses=label==='before'?JSON.parse(await fs.readFile(`${root}/after/poses.json`,'utf8')):await page.evaluate(async()=>{
  const e=window.__graphics.engine,d=e.model.district,{REAL_PLACES}=await import('/src/game/bangkok/realPlaces.ts');
  return d.landmarks.filter(l=>REAL_PLACES.some(p=>p.id===l.id)||['icon','paragon','central','mbk','terminal','mahanakhon','baiyoke'].includes(l.id)).map(l=>{
   const p=REAL_PLACES.find(p=>p.id===l.id),o=l.plot??l,n=d.nodes.find(n=>n.id===l.accessNode),height=p?.height??(l.kind==='tower'?150:l.id==='terminal'?118:34),yaw=p?.yaw??(l.id==='icon'?Math.PI/2:0);
   return {id:l.id,o,n,height,yaw,bank:p?.bank,hero:p?.tier==='hero'||['icon','mahanakhon','baiyoke'].includes(l.id),size:l.size};
  });
 });
 if(label==='after')await fs.writeFile(`${root}/after/poses.json`,JSON.stringify(poses,null,2));
 const survey=[];
 for(const p of poses.filter(p=>!process.env.ART_NAMES||process.env.ART_NAMES.split(',').includes(p.id)).sort((a,b)=>Number(b.hero)-Number(a.hero))){
  const views=p.hero?['road','front','elevated',...(p.bank||p.id==='icon'?['river']:[]),'skyline']:['road','elevated'];
  for(const view of views){
   if(label==='before'&&!['icon','mahanakhon','state','paragon','mbk','central','terminal'].includes(p.id))continue;
   const pose=await page.evaluate(async({p,view})=>{
    const e=window.__graphics.engine;e.pause();e.setQuality('medium');e.frameTime=-100000;e.model.snapshot.elapsed=40;delete window.__artCamera;
    const {o,n,height:h,yaw}=p,c=Math.cos(yaw),s=Math.sin(yaw),world=([x,y,z])=>[o.x+c*x+s*z,y,o.z-s*x+c*z];
    Object.assign(e.model.player,{x:n.x,z:n.z,heading:Math.atan2(o.x-n.x,o.z-n.z),speed:0,collision:0});
    if(view==='road')return {normalChaseCamera:true,player:{...e.model.player}};
    const r=Math.max(90,h*1.6),position=view==='front'?[0,h*.32,r]:view==='river'?[25,Math.max(10,h*.22),r*1.15]:view==='skyline'?[-h*.6,h*.47,r*2.05]:[r*.74,Math.max(105,h*.95),r*.8];
    const artCamera={position:world(position),look:world([0,h*.42,0])};
    const {cameraSceneEnvelopes,clearInspectionSightline,avoidInspectionObstacles}=await import('/src/game/inspection.ts');const obs=cameraSceneEnvelopes(e.model.district);clearInspectionSightline(artCamera.position,artCamera.look,obs,p.id);avoidInspectionObstacles(artCamera.position,artCamera.look,obs,p.id);window.__artCamera=artCamera;return {qaCamera:artCamera};
   },{p,view});
   await page.evaluate(pose=>{clearInterval(window.__qaCameraTimer);if(pose.qaCamera){const value=pose.qaCamera;window.__artCamera=structuredClone(value);window.__qaCameraTimer=setInterval(()=>{window.__artCamera=structuredClone(value);},1000);}},pose);
   const f=await page.evaluate(()=>window.__graphics.frameId);await page.waitForFunction(f=>window.__graphics.frameId>=f+2,f);await page.screenshot({path:`${root}/${label}/${p.id}-${view}.jpg`,type:'jpeg',quality:85,timeout:180000});
   survey.push({id:p.id,view,pose,stats:await page.evaluate(()=>window.__graphics.stats)});console.log(label,p.id,view);
  }
 }
 let previous=[];try{previous=JSON.parse(await fs.readFile(`${root}/${label}/survey.json`,'utf8')).survey??[];}catch{}
 const combined=[...previous.filter(p=>!survey.some(s=>s.id===p.id&&s.view===p.view)),...survey];
 await fs.writeFile(`${root}/${label}/survey.json`,JSON.stringify({survey:combined,errors,renderer:'Chromium SwiftShader; QA cameras explicitly distinguished from normal chase camera'},null,2));if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();server.kill();}
