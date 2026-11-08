import fs from 'node:fs';
import {chromium} from 'playwright';
const mode=process.env.QA_MODE||'baseline',port=Number(process.env.QA_PORT||24862);
const out=new URL('../../../docs/qa/yaowarat-renaissance/',import.meta.url);fs.mkdirSync(new URL('views/',out),{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true});page.setDefaultTimeout(120000);
const report={mode,environment:'Linux Chromium / SwiftShader, 844x390 DPR1. Physical iPhone untested.',errors:[],views:[]};page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|ERROR: 0:/.test(m.text()))report.errors.push(m.text())});
const shot=async(name,pose)=>{await page.waitForTimeout(700);await page.screenshot({path:new URL(`views/${mode}-${name}.png`,out).pathname});report.views.push({name,pose,stats:await page.evaluate(()=>window.__geography?{calls:window.__geography.drawCalls,triangles:window.__geography.triangles,geometries:window.__geography.geometries,textures:window.__geography.textures,activation:window.__geography.activationMs}:window.__graphics.stats)});console.log(mode,name)};
try{
const start=performance.now();await page.goto(`http://127.0.0.1:${port}/?${mode==='original'?'qa=1':'world=geographic&geographyQA&geoTime=day'}`);
await page.getByTestId('button-free-roam').click();
if(mode==='original'){
 await page.waitForFunction(()=>window.__graphics?.frameId>3);
 await page.evaluate(()=>{const e=window.__graphics.engine;e.update=()=>{};e.model.snapshot.phase='playing';e.setQuality('medium');const d=e.model.district,byId=new Map(d.nodes.map(n=>[n.id,n])),roads=d.roads.filter(r=>r.corridor==='yaowarat'||r.name?.includes('Yaowarat')),rank=roads.map(r=>({r,a:byId.get(r.a),b:byId.get(r.b)})).filter(r=>r.a&&r.b).sort((p,q)=>Math.hypot((p.a.x+p.b.x)/2+80,(p.a.z+p.b.z)/2+188)-Math.hypot((q.a.x+q.b.x)/2+80,(q.a.z+q.b.z)/2+188));const road=rank[0];if(!road)throw Error('Missing current condensed Yaowarat road');const {a,b}=road,h=Math.atan2(b.x-a.x,b.z-a.z);Object.assign(e.model.player,{x:(a.x+b.x)/2+Math.cos(h)*2,z:(a.z+b.z)/2-Math.sin(h)*2,heading:h,speed:0});e.cameraRevision++;e.publish();});
 await page.addStyleTag({content:'.tt-ui,.tt-controls,.tt-hud,.tt-street-banner{visibility:hidden!important}'});
 // The original world starts at sunset and has no daylight preset. Retain its actual production lighting and label this limitation.
 for(const [time,elapsed]of [['golden',0],['night',240]]){await page.evaluate(el=>{window.__graphics.engine.model.snapshot.elapsed=el},elapsed);await shot(time,{elapsed});await page.evaluate(()=>{const g=window.__graphics,p=g.engine.model.player,fx=Math.sin(p.heading),fz=Math.cos(p.heading);window.__artCamera={position:[p.x+fx*6+fz*4,3.5,p.z+fz*6-fx*4],look:[p.x+fx*15-fz*11,5.1,p.z+fz*15+fx*11]}});await shot(`shop-${time}`,{elapsed,streetHeight:3.5});await page.evaluate(()=>delete window.__artCamera);}
}else{
 await page.waitForFunction(()=>window.__geography?.snapshot.phase==='playing'&&window.__geography?.stream.settled&&window.__geography.stream.active>=9);report.startupMs=performance.now()-start;report.initial=await page.evaluate(()=>window.__geography);
 const fixtures=JSON.parse(fs.readFileSync(new URL('./yaowarat-alive-views.json',import.meta.url)));
 const settings=async(time,quality)=>{await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByLabel('Time of day').selectOption(time);await page.getByLabel('Graphics quality').selectOption(quality);await page.getByRole('button',{name:'Close settings',exact:true}).click();await page.getByRole('button',{name:'Resume drive',exact:true}).click();await page.evaluate(q=>{clearInterval(window.__holdQuality);window.__holdQuality=setInterval(()=>window.__geographyQA.session.setQuality(q),500)},quality)};
 const select=process.env.QA_SELECT?.split(',');
 const all=[...fixtures,{...fixtures[0],name:'21-yaowarat-golden',time:'dusk'}];
 for(const v of all){if(select&&!select.includes(v.name.slice(0,2)))continue;await settings(v.time,v.quality);await page.evaluate(v=>{const q=window.__geographyQA;q.move(v.lon,v.lat,v.heading??0);q.view(v.camera,v.target)},v);await page.waitForFunction(()=>window.__geography.stream.settled);await page.waitForTimeout(600);await page.waitForFunction(()=>window.__geography.stream.settled);const hide=v.hud?null:await page.addStyleTag({content:'.geo-toolbar,.geo-street-banner,.geo-status,.geo-speed,.tt-controls{visibility:hidden!important}'});await shot(v.name,v);await hide?.evaluate(e=>e.remove());}
}
if(report.errors.length)throw Error(JSON.stringify(report.errors));
}finally{fs.writeFileSync(new URL(`${mode}-captures.json`,out),JSON.stringify(report,null,2));await browser.close();}
