import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as T from 'three';
import {decodeCompiledChunk} from '../src/game/bangkok/geographic/compiledBuildings';
import {prepareGeographicChunk,chunkTransferables} from '../src/game/bangkok/geographic/chunkPreparation';
import {buildGeographicChunk,disposeGeographicChunk,geographicMaterials} from '../src/game/bangkok/geographic/rendering';
import {buildingObstacles} from '../src/game/bangkok/geographic/buildings';
const dir=new URL('../public/assets/geography/',import.meta.url);
const meta=JSON.parse(gunzipSync(fs.readFileSync(new URL('gameplay.v2.json.gz',dir))).toString());
const m=geographicMaterials(meta),water=new T.MeshBasicMaterial();
const records=[];
for(const ref of meta.chunks.filter((r:any)=>Math.abs(r.origin[0]-3072)<=1024 && Math.abs(r.origin[1])<=1024)) {
 const file=new URL(`compiled/${ref.id.replace(':','_')}.bin.pack`,dir);
 const bytes=gunzipSync(fs.readFileSync(fs.existsSync(file)?file:new URL(file.href.replace('.pack','.gz'))));
 const c=decodeCompiledChunk(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),ref);
 const before=buildGeographicChunk(structuredClone(c),m,water);
 const start=performance.now();prepareGeographicChunk(c);const prepared=performance.now();
 assert.deepEqual(c.preparedColliders,buildingObstacles(c.buildings??[],c.origin));
 const buffers=chunkTransferables(c),copied=structuredClone(c,{transfer:buffers});
 assert(buffers.every(b=>b.byteLength===0),'Transfer detaches original buffer rather than copying geometry');
 const attached=performance.now(),after=buildGeographicChunk(copied,m,water),done=performance.now();
 const geometries=(root:T.Group)=>{const a:any[]=[];root.traverse(o=>{if(o instanceof T.Mesh)a.push(o.geometry)});return a;};
 const a=geometries(before),b=geometries(after);assert.equal(a.length,b.length);
 for(let i=0;i<a.length;i++)for(const name of Object.keys(a[i].attributes))assert.deepEqual(a[i].getAttribute(name).array,b[i].getAttribute(name).array);
 records.push({id:ref.id,workerPreparationMs:prepared-start,mainAttachmentMs:done-attached,gpuBytes:copied.buildingGeometry?.gpuBytes,buildings:copied.buildings?.length});
 disposeGeographicChunk(before);disposeGeographicChunk(after);
}
console.log(JSON.stringify({pass:true,environment:'Node CPU, no GPU; transfer and geometry equivalence',records},null,2));
