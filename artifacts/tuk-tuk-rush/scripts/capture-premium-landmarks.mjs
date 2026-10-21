import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import {startQaServer} from './browser-vite.mjs';
const out=new URL('../../../docs/qa/premium-landmarks/',import.meta.url).pathname,label=process.env.HERO_LABEL??'after',port=+(process.env.HERO_PORT??24635);
await fs.mkdir(`${out}/${label}`,{recursive:true});const server=await startQaServer(port),browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={label,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),viewport:[768,432],quality:'medium',renderer:`Chromium ${browser.version()} / SwiftShader`,physicalIPhone:false,cityObjectsHidden:false,records:[],errors:[]};
try{
 const p=await browser.newPage({viewport:{width:768,height:432}});p.setDefaultTimeout(300000);p.on('pageerror',e=>report.errors.push(e.message));await p.goto(`http://127.0.0.1:${port}/?qa=1`);await p.waitForFunction(()=>window.__graphics?.frameId>1);await p.getByTestId('button-free-roam').click();await p.addStyleTag({content:'.tt-ui,[data-testid=button-city-inspector]{visibility:hidden!important}'});await p.evaluate(()=>{const e=window.__graphics.engine;e.pause();e.setQuality('medium');e.model.traffic.length=0;e.frameTime=-100000;});
 const scenes=JSON.parse(await fs.readFile(`${out}/scenes.json`,'utf8'));
 for(const s of scenes.filter(s=>!process.env.HERO_SCENES||process.env.HERO_SCENES.split(',').includes(s.id)))for(const light of ['sunset','night']){
  await p.evaluate(({s,light})=>{const e=window.__graphics.engine;Object.assign(e.model.player,{...s.pose,speed:0,collision:0});e.model.snapshot.elapsed=light==='night'?720:40;e.model.snapshot.target={x:2000,z:-2000};e.cameraRevision++;e.frameTime=-100000;delete window.__artCamera;if(s.camera)Object.defineProperty(window,'__artCamera',{configurable:true,get:()=>({position:[...s.camera],look:[...s.look]})});},{s,light});
  const f=await p.evaluate(()=>window.__graphics.frameId);await p.waitForFunction(f=>window.__graphics.frameId>f+2,f);await p.evaluate(()=>window.__graphics.gl.getContext().finish());const stats=await p.evaluate(()=>{const g=window.__graphics;return{...g.stats,camera:g.camera.position.toArray(),fov:g.camera.fov,elapsed:g.engine.model.snapshot.elapsed,quality:g.engine.model.snapshot.quality,glError:g.gl.getContext().getError()};});
  if(stats.glError||stats.quality!=='medium'||stats.elapsed!==(light==='night'?720:40))throw Error('Render state drift');
  const file=`${s.id}-${light}.jpg`;await p.screenshot({path:`${out}/${label}/${file}`,type:'jpeg',quality:88,timeout:180000});report.records.push({id:s.id,light,file,scene:s,stats});await fs.writeFile(`${out}/${label}/capture.json`,JSON.stringify(report,null,2)+'\n');console.log(label,file);
 }
}finally{await browser.close();server.kill();}if(report.errors.length)throw Error(report.errors.join('\n'));
