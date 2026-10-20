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
