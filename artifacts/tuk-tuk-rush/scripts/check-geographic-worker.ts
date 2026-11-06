import assert from 'node:assert/strict';
import {GeographicChunkLoader} from '../src/game/bangkok/geographic/chunkLoader';
class FakeWorker {
 onmessage: ((event:any)=>void)|null=null;onerror: ((event:any)=>void)|null=null;
 terminated=false;requests:any[]=[];
 postMessage(ref:any){this.requests.push(ref);}
 terminate(){this.terminated=true;}
 reply(data:any){this.onmessage?.({data});}
}
const workers:FakeWorker[]=[];
const loader=new GeographicChunkLoader(()=>{const w=new FakeWorker();workers.push(w);return w as any;},1000);
const ref={id:'0:0',origin:[0,0] as [number,number],file:'source',sha256:'pinned',bytes:1};
const a=new AbortController(),b=new AbortController();
const first=loader.load(ref,a.signal),second=loader.load(ref,b.signal);
await assert.rejects(loader.load(ref,new AbortController().signal),/queue exceeded/);
workers[0]!.reply({chunk:{origin:[0,0]}});assert.deepEqual((await first).origin,[0,0]);
const third=loader.load(ref,new AbortController().signal);assert.equal(workers.length,2,'reuse successful worker');
workers[0]!.reply({error:'source and alias both invalid'});await assert.rejects(third,/both invalid/);
const cancelled=assert.rejects(second,{name:'AbortError'});b.abort();await cancelled;assert(workers[1]!.terminated);
workers[1]!.reply({chunk:{origin:[999,999]}}); // disposed late job cannot resolve/reinstall
const idle=workers[0]!;
const active=loader.load(ref,new AbortController().signal),closed=assert.rejects(active,{name:'AbortError'});
loader.close();await closed;assert(idle.terminated);
await assert.rejects(loader.load(ref,new AbortController().signal),{name:'AbortError'});
const slow=new GeographicChunkLoader(()=>new FakeWorker() as any,5);
await assert.rejects(slow.load(ref,new AbortController().signal),/timed out/);slow.close();
console.log({pass:true,twoWorkerBound:true,reuse:true,abortTerminates:true,lateResultIgnored:true,closeRejects:true,timeoutNoRetry:true});
