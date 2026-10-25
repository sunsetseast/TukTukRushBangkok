import assert from 'node:assert/strict';import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
import type {District} from '../src/game/types';
import migration from '../src/game/bangkok/bangRakCompletionMigration.v1.json';
import {BANG_RAK_DESTINATIONS} from '../src/game/bangkok/bangRakDestinations';
import {bangRakCompletionState,completionBodyKey,completionRoadKey} from '../src/game/bangkok/bangRakCompletion';
const checked=new WeakMap<District,District>();
export function beforeBangRakCompletion(d:District):District {
 if(!bangRakCompletionState(d))return d;
 const cached=checked.get(d);if(cached)return cached;
 const old=JSON.parse(gunzipSync(fs.readFileSync(new URL('../../../docs/qa/bang-rak-completion/validation/pr43-world.json.gz',import.meta.url))).toString()) as District;
 const live=JSON.parse(JSON.stringify(d)) as District;
 const retiredNodes=new Set(migration.retiredNodes.map(n=>n.id));
 assert.deepEqual(live.nodes.filter(n=>!n.id.startsWith('brc:')),old.nodes.filter(n=>!retiredNodes.has(n.id)), 'Only the explicitly retired chord’s orphan nodes are removed');
 const replaced=new Set([...migration.retiredRoads,...migration.splitRoads].map(completionRoadKey));
 const additions=new Set(migration.roads.map(completionRoadKey));
 assert.deepEqual(live.roads.filter(r=>!additions.has(completionRoadKey(r))),old.roads.filter(r=>!replaced.has(completionRoadKey(r))),'Every road outside the precise migration remains identical');
 assert.equal(live.roads.length,old.roads.length-replaced.size+migration.roads.length);
 const retired=new Set(migration.retired.map(r=>completionBodyKey(r.body as any)));
 const keys=new Set(live.buildings.map(completionBodyKey));
 for(const body of old.buildings)assert(keys.has(completionBodyKey(body))||retired.has(completionBodyKey(body)),'Every prior building retained or explicitly ledgered '+body.environmentId);
 const ids=new Set(BANG_RAK_DESTINATIONS.map(s=>s.id));
 for(const change of migration.approaches) {
  const l=live.landmarks.find(l=>l.id===change.landmark)!;
  assert.equal(l.accessNode,change.nextNode,'Explicit corrected curbside destination');
  l.accessNode=change.previousNode;
 }
 assert.deepEqual(live.landmarks.filter(l=>!ids.has(l.id!)),old.landmarks,'No inherited named landmark moved');
 for(const k of ['river','riverPolygon','riverStructures','canals','transit','spawn','authoredSites'] as const)assert.deepEqual(live[k],old[k],`Preserve ${k}`);
 checked.set(d,old);return old;
}
