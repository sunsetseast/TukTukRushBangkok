import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {startQaServer} from './browser-vite.mjs';
const out=new URL('../../../docs/qa/historic-bangkok/',import.meta.url).pathname;
const all=JSON.parse(await fs.readFile(out+'visibility.json','utf8'));
const actualFeatures={
 'historic:swing:1':[-5.5,17,-58.65],
 'historic:democracy:0':[-7.071,12,-7.071], 'historic:democracy:1':[7.071,12,7.071],
 'historic:golden:0':[8.6,37,0], 'historic:golden:1':[-8.6,37,0],
};
const selected=all.filter(v=>['historic:palace:0','historic:pho:0','historic:pho:1','historic:swing:0','historic:swing:1','historic:golden:0','historic:golden:1','historic:democracy:0','historic:democracy:1','historic:hua:0','historic:traimit:0','historic:gate:0'].includes(v.id));
const server=await startQaServer(24332),browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={renderer:'Chromium SwiftShader; actual rendered meshes',physicalIPhone:false,hiddenCityObjects:false,rays:[],errors:[]};
try{
 const p=await browser.newPage({viewport:{width:640,height:360}});p.setDefaultTimeout(300000);p.on('pageerror',e=>report.errors.push(e.message));
 await p.goto('http://127.0.0.1:24332/?qa=1');await p.waitForFunction(()=>window.__graphics?.frameId>1);await p.getByTestId('button-free-roam').click();
 await p.evaluate(()=>{const e=window.__graphics.engine;e.pause();e.setQuality('low');e.model.traffic.length=0;});
 for(const original of selected){
  const line=structuredClone(original),feature=actualFeatures[line.id];
  if(feature){const r=JSON.parse(await fs.readFile(out+'registry-after.json','utf8')).find(r=>r.id===line.landmarkId),p=r.modelOrigin??r.world;line.target={x:p.x+feature[0],y:feature[1],z:p.z+feature[2]};}
  await p.evaluate(line=>{const g=window.__graphics,e=g.engine;Object.assign(e.model.player,{x:line.from.x,z:line.from.z,speed:0,heading:0});e.cameraRevision++;window.__artCamera={position:[line.from.x,line.from.y,line.from.z],look:[line.target.x,line.target.y,line.target.z]};},line);
  const f=await p.evaluate(()=>window.__graphics.frameId);await p.waitForFunction(f=>window.__graphics.frameId>f+1,f);
  const result=await p.evaluate(line=>{
   const g=window.__graphics,T=g.three;g.scene.updateMatrixWorld(true);
   const a=new T.Vector3(line.from.x,line.from.y,line.from.z),b=new T.Vector3(line.target.x,line.target.y,line.target.z),v=b.clone().sub(a),len=v.length();
   const ray=new T.Raycaster(a,v.normalize(),.1,len+3),visible=o=>{for(let q=o;q;q=q.parent)if(!q.visible)return false;return true;};
   const hit=ray.intersectObjects(g.scene.children,true).find(h=>visible(h.object));
   let owner=hit?.object,landmark;
   while(owner){if(owner.name?.startsWith('BangkokLandmark:')){landmark=owner.name.slice(16);break;}owner=owner.parent;}
   return {id:line.id,landmarkId:line.landmarkId,approach:line.approach,from:line.from,target:line.target,firstObject:hit?.object.name,firstLandmark:landmark,featureDistance:hit?hit.point.distanceTo(b):null,heroIsFirstHit:landmark===line.landmarkId,actualSurfaceWithinOneMetreOfFeature:!!hit&&hit.point.distanceTo(b)<1,rootVisible:g.scene.getObjectByName(`BangkokLandmark:${line.landmarkId}`)?.visible};
  },line);
  report.rays.push(result);console.log(result.id,result.heroIsFirstHit,result.featureDistance);
  await fs.writeFile(out+'rendered-visibility.json',JSON.stringify(report,null,2));
 }
}finally{await browser.close();server.kill();}
if(report.errors.length)throw Error(report.errors.join('\n'));
