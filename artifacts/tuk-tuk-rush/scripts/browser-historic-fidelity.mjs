import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {startQaServer} from './browser-vite.mjs';
const out=process.env.CITY_OUTPUT??new URL('../../../docs/qa/historic-visual-fidelity/',import.meta.url).pathname;
const label=process.env.CITY_LABEL??'after',port=+(process.env.CITY_PORT??24503);
const all=JSON.parse(await fs.readFile(out+'/feature-rays.json','utf8'));
const six=['historic:palace:1','historic:pho:0','historic:swing:2','historic:golden:2','historic:hua:1','historic:traimit:2'];
const lines=label==='before'?all.filter(v=>six.includes(v.id)):all;
await fs.mkdir(`${out}/${label}-features`,{recursive:true});
const server=await startQaServer(port),browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={label,renderer:'Chrome 138 headless / SwiftShader',viewport:[768,432],physicalIPhone:false,cityObjectsHidden:false,trafficDisabled:true,rays:[],errors:[]};
try {
 const p=await browser.newPage({viewport:{width:768,height:432}});p.setDefaultTimeout(300000);p.on('pageerror',e=>report.errors.push(e.message));
 await p.goto(`http://127.0.0.1:${port}/?qa=1`);await p.waitForFunction(()=>window.__graphics?.frameId>1);await p.getByTestId('button-free-roam').click();
 await p.addStyleTag({content:'.tt-ui{visibility:hidden!important}'});
 await p.evaluate(()=>{const e=window.__graphics.engine;e.pause();e.setQuality('medium');e.model.traffic.length=0;e.model.snapshot.elapsed=40;});
 for(const line of lines) {
  await p.evaluate(line=>{const g=window.__graphics,e=g.engine;Object.assign(e.model.player,{x:line.from.x,z:line.from.z,speed:0});e.cameraRevision++;window.__artCamera={position:[line.from.x,line.from.y,line.from.z],look:[line.target.x,line.target.y,line.target.z]};},line);
  const f=await p.evaluate(()=>window.__graphics.frameId);await p.waitForFunction(f=>window.__graphics.frameId>f+1,f);
  const result=await p.evaluate(line=>{
   const g=window.__graphics,T=g.three;g.scene.updateMatrixWorld(true);
   const a=new T.Vector3(line.from.x,line.from.y,line.from.z),b=new T.Vector3(line.target.x,line.target.y,line.target.z),v=b.clone().sub(a),length=v.length();
   const ray=new T.Raycaster(a,v.normalize(),.1,length+2),visible=o=>{for(let q=o;q;q=q.parent)if(!q.visible)return false;return true;};
   const hits=ray.intersectObjects(g.scene.children,true).filter(h=>visible(h.object)),hit=hits[0];
   let owner=hit?.object,landmark;
   while(owner){if(owner.name?.startsWith('BangkokLandmark:')){landmark=owner.name.slice(16);break;}owner=owner.parent;}
   const hero=landmark===line.landmarkId,featureDistance=hit?hit.point.distanceTo(b):null;
   return {...line,firstObject:hit?.object.name,firstLandmark:landmark,firstHitDistance:hit?.distance,featureDistance,landmarkVisible:hero,
    // A hit elsewhere on the roof/compound never certifies the named entrance.
    namedFeatureVerified:hero&&featureDistance<2.5,classification:!hit?'no rendered surface at target':!hero?'foreground obstruction':featureDistance<2.5?'named feature visible':'landmark surface visible; named feature not certified',stats:g.stats};
  },line);
  if(six.includes(line.id)||line.feature==='entrance'||line.viewpoint==='river') {
   result.file=line.id.replaceAll(':','-')+'.jpg';
   await p.screenshot({path:`${out}/${label}-features/${result.file}`,type:'jpeg',quality:86,timeout:180000});
  }
  report.rays.push(result);await fs.writeFile(`${out}/${label}-rendered-visibility.json`,JSON.stringify(report,null,2));console.log(line.id,result.classification);
 }
} finally {await browser.close();server.kill();}
if(report.errors.length)throw Error(report.errors.join('\n'));
