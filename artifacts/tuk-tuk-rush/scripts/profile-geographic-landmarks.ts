import * as T from 'three';
import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
import {GeographicNetwork} from '../src/game/bangkok/geographic/network';
import {createGameplayDistrict} from '../src/game/bangkok/geographic/places';
import {buildMigratedArt,disposeMigratedArt} from '../src/game/bangkok/geographic/migratedArt';
const dir=new URL('../public/assets/geography/',import.meta.url),raw=gunzipSync(fs.readFileSync(new URL('navigation.v2.bin.gz',dir)));
const n=new GeographicNetwork(JSON.parse(gunzipSync(fs.readFileSync(new URL('gameplay.v2.json.gz',dir))).toString()),raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
for(const p of createGameplayDistrict(n).places){const t=performance.now(),a=buildMigratedArt(p);let bytes=0,meshes=0;const buffers=new Set<ArrayBufferLike>();a.root.traverse(o=>{if(o instanceof T.Mesh){meshes++;for(const attr of Object.values(o.geometry.attributes))buffers.add(attr.array.buffer);if(o.geometry.index)buffers.add(o.geometry.index.array.buffer);}});for(const buffer of buffers)bytes+=buffer.byteLength;console.log(JSON.stringify({id:p.landmark.id,buildMs:performance.now()-t,geometryBufferBytes:bytes,meshes}));disposeMigratedArt(a.root);}
