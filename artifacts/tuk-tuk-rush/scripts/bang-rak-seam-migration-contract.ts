import migration from "../src/game/bangkok/bangRakSeamMigration.v1.json";
import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import assert from "node:assert/strict";
import type { District } from "../src/game/types";
import { bangRakSeamState, retiredBangRakIds } from "../src/game/bangkok/bangRakSeam";
export function beforeBangRakSeam(d: District): District {
  const state=bangRakSeamState(d);
  if(!state)return d;
  const old=JSON.parse(gunzipSync(fs.readFileSync(new URL('../../../docs/qa/bang-rak-geography/validation/pr42-world.json.gz',import.meta.url))).toString()) as District;
  const live=JSON.parse(JSON.stringify(d)) as District;
  assert.deepEqual(live.nodes.filter(n=>!n.id.startsWith('brg:')),old.nodes,'Every preexisting node preserved');
  assert.deepEqual(live.roads.filter(r=>!r.a.startsWith('brg:')&&!r.b.startsWith('brg:')).map(r=>r.corridor==='charoen-krung-30'?{...r,oneWay:undefined}:r).map(r=>JSON.parse(JSON.stringify(r))),old.roads,'Only researched Captain Bush direction changes on old edges');
  for(const t of migration.ownerTransfers){
    const rear=live.buildings.find(b=>b.environmentId===t.id)!;
    assert.equal(rear.chinatown?.owner,t.toOwner,'Explicit retained rear ownership migration');
    rear.chinatown!.owner=t.fromOwner;
  }
  assert.deepEqual(live.buildings.filter(b=>!b.environmentId?.startsWith('brg:')),old.buildings.filter(b=>!retiredBangRakIds.has(b.environmentId??'')),'Exact preservation outside the explicit lot migration');
  assert.deepEqual(JSON.parse(JSON.stringify(state.retired)),old.obstacles.filter(b=>retiredBangRakIds.has(b.environmentId??'')),'Every retired physical body is present in the immutable PR42 baseline');
  for(const k of ['landmarks','authoredSites','transit','river','riverPolygon','riverStructures','canals','spawn'] as const)assert.deepEqual(live[k],old[k],`Preserve ${k}`);
  return old;
}
