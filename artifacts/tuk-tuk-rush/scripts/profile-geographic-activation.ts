/** Matched CPU activation profile; no source rebuild or device FPS claim. */
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as T from 'three';
import { decodeCompiledChunk } from '../src/game/bangkok/geographic/compiledBuildings';
import { buildGeographicChunk, geographicMaterials, disposeGeographicChunk } from '../src/game/bangkok/geographic/rendering';
import { buildingObstacles } from '../src/game/bangkok/geographic/buildings';
import { setStreamedPhysicsObstacles } from '../src/game/bangkok/clearanceIndex';
const dir = new URL('../public/assets/geography/', import.meta.url);
const metadata = JSON.parse(gunzipSync(fs.readFileSync(new URL('gameplay.v2.json.gz',dir))).toString());
const material = geographicMaterials(metadata), water = new T.MeshBasicMaterial();
const records = [], groups: any[] = [], district = {obstacles: []} as any;
for(const ref of metadata.chunks.filter((c:any)=>Math.abs(c.origin[0]-3072)<=1024 && Math.abs(c.origin[1])<=1024)) {
 const file=new URL(`compiled/${ref.id.replace(':','_')}.bin.pack`,dir);
 const bytes=gunzipSync(fs.readFileSync(fs.existsSync(file)?file:new URL(file.href.replace('.pack','.gz'))));
 const raw=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 const start=performance.now(), chunk=decodeCompiledChunk(raw,ref), decoded=performance.now();
 const root=buildGeographicChunk(chunk,material,water), built=performance.now();
 const colliders=buildingObstacles(chunk.buildings??[],chunk.origin), collided=performance.now();
 groups.push(colliders);setStreamedPhysicsObstacles(district,groups);
 records.push({id:ref.id,buildings:chunk.buildings?.length,decodeMs:decoded-start,geometryMs:built-decoded,colliderMs:collided-built,indexMs:performance.now()-collided,batches:root.children.length,gpuBytes:chunk.buildingGeometry?.gpuBytes});
 disposeGeographicChunk(root);
}
console.log(JSON.stringify({environment:'Node CPU; no GPU, not physical iPhone',records},null,2));
