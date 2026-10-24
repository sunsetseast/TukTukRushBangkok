/** PR43 additive authoring. A future non-additive migration must explicitly
 * advance the baseline; never silently re-snap the approved city asphalt. */
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import clipping from 'polygon-clipping';
import {createBangkokWorld} from '../src/game/bangkok/world';
import {bangRakSeamState} from '../src/game/bangkok/bangRakSeam';
import {roadEnvelopes} from './road-surface-authoring';
import {roadGraphKey} from '../src/game/bangkok/roadSurfaceGraph';
import {waterTerrainKey} from '../src/game/bangkok/waterGeometry';
const d=createBangkokWorld(),seam=bangRakSeamState(d)!;
const read=(name:string)=>JSON.parse(gunzipSync(fs.readFileSync(new URL('../../../docs/qa/bang-rak-geography/validation/'+name,import.meta.url))).toString());
const old=read('pr42-world.json.gz'),approved=read('pr42-road-surfaces.json.gz');
const oldNodes=new Map<string,any>(old.nodes.map((n:any)=>[n.id,n])),liveNodes=new Map(d.nodes.map(n=>[n.id,n]));
for(const prior of old.roads){
 const road=d.roads.find(r=>r.a===prior.a&&r.b===prior.b&&r.width===prior.width);
 if(!road)throw Error('Non-additive road migration needs a new surface baseline: '+prior.a+'>'+prior.b);
 for(const id of [road.a,road.b]){const a=oldNodes.get(id)!,b=liveNodes.get(id)!;if(Math.hypot(a.x-b.x,a.z-b.z)>1e-6)throw Error('Moved node requires an explicit surface migration');}
}
if(approved.waterKey!==waterTerrainKey(d))throw Error('Changed shoreline requires a new surface baseline');
const addition={...d,roads:seam.roads},
 road=clipping.union(approved.road,clipping.difference(roadEnvelopes(addition,0,true),approved.water)),
 curb=clipping.difference(clipping.union(approved.curb,roadEnvelopes(addition,.32,true)),road,approved.water),
 sidewalk=clipping.difference(clipping.union(approved.sidewalk,roadEnvelopes(addition,6,true)),road,curb,approved.water);
const result={key:roadGraphKey(d),waterKey:approved.waterKey,road,curb,sidewalk,water:approved.water,land:approved.land};
fs.writeFileSync(new URL('../src/game/bangkok/roadSurfaces.generated.json',import.meta.url),JSON.stringify(result)+'\n');
console.log({key:result.key,bytes:JSON.stringify(result).length,method:'Exact PR42 surface + explicit PR43 lane envelopes; unchanged water/land'});
