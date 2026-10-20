import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
const phase=process.env.QA_PHASE??'regression';
const out=new URL('../../../docs/qa/historic-bangkok/'+phase+'/',import.meta.url);
await fs.mkdir(out,{recursive:true});
const pkg=JSON.parse(await fs.readFile(new URL('../package.json',import.meta.url),'utf8'));
const selected=Object.keys(pkg.scripts).filter(k=>k.startsWith('test:')&&k!=='test:historic-core'&&(!process.env.QA_ONLY||process.env.QA_ONLY.split(',').includes(k)));
const records=[];let next=0;
async function worker(){
 while(next<selected.length){
  const name=selected[next++],begin=Date.now();
  const child=spawn('bash',['-c',pkg.scripts[name]],{env:{...process.env,PORT:'24329',BASE_PATH:'/'},stdio:['ignore','pipe','pipe']});
  const chunks=[];child.stdout.on('data',b=>chunks.push(b));child.stderr.on('data',b=>chunks.push(b));
  const exitCode=await new Promise(r=>child.on('exit',r));
  await fs.writeFile(new URL(name.replace(':','-')+'.log',out),Buffer.concat(chunks));
  records.push({name,command:pkg.scripts[name],exitCode,elapsedMs:Date.now()-begin});
  console.log(exitCode===0?'PASS':'FAIL',name);
  await fs.writeFile(new URL('../'+phase+'-summary.json',out),JSON.stringify({pass:records.every(r=>r.exitCode===0),groups:records.length,expected:selected.length,records},null,2));
 }
}
await Promise.all([worker(),worker()]);
if(records.some(r=>r.exitCode!==0))process.exitCode=1;
