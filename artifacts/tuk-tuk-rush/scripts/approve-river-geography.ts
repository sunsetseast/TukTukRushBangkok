/** Explicit offline approval command. Runtime construction still enforces the
 * committed graph. Inspect the exported delta before committing this file. */
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {createBangkokWorld} from '../src/game/bangkok/world';
import {roadGraphKey,cityGraphApprovalKey} from '../src/game/bangkok/roadIdentity';
const d=createBangkokWorld({authoring:true}),p=new URL('../src/game/bangkok/cityData.v1.json',import.meta.url),data=JSON.parse(fs.readFileSync(p,'utf8'));
const before=JSON.parse(gunzipSync(fs.readFileSync(new URL('../../../docs/qa/chao-phraya/before-world.json.gz',import.meta.url))).toString());
const oldNodes=new Map<string,any>(before.nodes.map((n:any)=>[n.id,n]));
const changedNodes=d.nodes.filter(n=>{const q=oldNodes.get(n.id);return !q||Math.hypot(q.x-n.x,q.z-n.z)>.001;});
const oldRoads=new Set(before.roads.map((r:any)=>JSON.stringify(r))),newRoads=new Set(d.roads.map(r=>JSON.stringify(r)));
const delta={version:data.waterApproval.version,baseCommit:'9cfac02c7ccc960b2e153f407e0a6543d44b5a19',oldApproval:JSON.parse(execFileSync('git',['show','9cfac02c7ccc960b2e153f407e0a6543d44b5a19:artifacts/tuk-tuk-rush/src/game/bangkok/cityData.v1.json'],{encoding:'utf8'})).roadBaseline,newApproval:{key:roadGraphKey(d),fullGraphKey:cityGraphApprovalKey(d),roads:d.roads.length,nodes:d.nodes.length},changedNodes,addedRoads:d.roads.filter(r=>!oldRoads.has(JSON.stringify(r))),removedRoads:before.roads.filter((r:any)=>!newRoads.has(JSON.stringify(r)))};
// This PR permits only Asiatique's translated arrival. Never approve an
// unrelated graph change merely by recomputing a hash.
if(changedNodes.some(n=>!n.id.startsWith('arrival:asiatique:')))throw Error('Unreviewed node relocation');
if([...delta.addedRoads,...delta.removedRoads].some((r:any)=>r.corridor!=='arrival:asiatique'))throw Error('Unreviewed road delta');
Object.assign(data.roadBaseline,delta.newApproval,{version:2,status:'approved-river-v2-local-arrival-network',sourceStages:[...new Set([...data.roadBaseline.sourceStages,'river-v2-asiatique-arrival'])]});
fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n');
fs.writeFileSync(new URL('../../../docs/qa/chao-phraya/graph-approval-delta.json',import.meta.url),JSON.stringify(delta,null,2)+'\n');
console.log(delta.newApproval,changedNodes.length,'Asiatique nodes');
