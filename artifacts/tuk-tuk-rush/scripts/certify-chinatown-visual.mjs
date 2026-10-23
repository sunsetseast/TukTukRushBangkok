import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const out=new URL('../../../docs/qa/chinatown-visual/validation/suite/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const queue=Object.entries(pkg.scripts).filter(([k])=>k.startsWith('test:')&&(!process.env.CERTIFY_GROUPS||process.env.CERTIFY_GROUPS.split(',').includes(k)));
const results=[];
async function worker(){for(;;){const job=queue.shift();if(!job)return;const [name,command]=job,start=Date.now(),file=new URL(name.replace(':','-')+'.log',out),fd=fs.openSync(file,'w');
 const status=await new Promise(resolve=>{const p=spawn(command,{shell:true,stdio:['ignore',fd,fd],env:process.env});p.on('exit',(code,signal)=>resolve({code,signal}));});fs.closeSync(fd);
 results.push({name,status:status.code,signal:status.signal,durationMs:Date.now()-start,pass:status.code===0,logSha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')});
 fs.writeFileSync(new URL('summary.json',out),JSON.stringify({pass:results.every(r=>r.pass),groups:results.length,workers:3,results},null,2)+'\n');console.log(name,status.code,Math.round((Date.now()-start)/1000)+'s');
}}
await Promise.all([worker(),worker(),worker()]);if(results.some(r=>!r.pass))process.exitCode=1;
