import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {execFileSync} from 'node:child_process';
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const out=new URL('../../../docs/qa/bang-rak-completion/validation/tests/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const results=[];
for(const [name,cmd] of Object.entries(pkg.scripts).filter(([name])=>name.startsWith('test:'))){
 const began=Date.now();const r=spawnSync(cmd,{shell:true,encoding:'utf8',maxBuffer:32*1024*1024,env:process.env});
 fs.writeFileSync(new URL(name.replaceAll(':','-')+'.log',out),(r.stdout??'')+(r.stderr??''));
 results.push({name,command:cmd,exitCode:r.status,ms:Date.now()-began});
 fs.writeFileSync(new URL('../tests.json',out),JSON.stringify({sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),results},null,2)+'\n');
 console.log(name,r.status,Date.now()-began);
}
process.exitCode=results.some(r=>r.exitCode!==0)?1:0;
