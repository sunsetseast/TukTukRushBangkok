import type {District} from '../types';
import {stableHash} from './stableHash';
export function roadGraphKey(d: District) {
  return String(
    stableHash(
      JSON.stringify({
        // Native trig differs by sub-nanometer amounts across JS engines. The
        // graph identity uses the same 0.1 mm precision as node registration.
        nodes: d.nodes.map((n) => [Math.round(n.x*1e4)/1e4, Math.round(n.z*1e4)/1e4]),
        roads: d.roads.map((r) => [r.a, r.b, r.width]),
      }),
    ),
  );
}

/** Quantized like asphalt identity: native JS trig differs in its last bit. */
export function cityGraphApprovalKey(d:District) {
 const q=(v:number)=>Math.round(v*1e4);
 return stableHash(JSON.stringify({nodes:d.nodes.map(n=>[n.id,q(n.x),q(n.z)]),roads:d.roads.map(r=>[r.a,r.b,q(r.width),r.name??'',r.corridor??'',!!r.oneWay,!!r.bridge,!!r.noTraffic,r.destinationId??'',!!r.shortcut,r.spawnTraffic!==false])}));
}
