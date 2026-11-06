import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
import {GeographicNetwork} from '../src/game/bangkok/geographic/network';
import {createGameplayDistrict} from '../src/game/bangkok/geographic/places';
import {buildMigratedArt,disposeMigratedArt} from '../src/game/bangkok/geographic/migratedArt';
const dir=new URL('../public/assets/geography/',import.meta.url),raw=gunzipSync(fs.readFileSync(new URL('navigation.v2.bin.gz',dir)));
const n=new GeographicNetwork(JSON.parse(gunzipSync(fs.readFileSync(new URL('gameplay.v2.json.gz',dir))).toString()),raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
for(const p of createGameplayDistrict(n).places){const t=performance.now(),a=buildMigratedArt(p);console.log(p.landmark.id,performance.now()-t);disposeMigratedArt(a.root);}
