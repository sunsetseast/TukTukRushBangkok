/** Offline polygon authoring only. Never import this module from the game. */
import clipping, {type MultiPolygon,type Polygon,type Ring} from 'polygon-clipping';
import type {District,Point} from '../src/game/types';
import baked from '../src/game/bangkok/roadSurfaces.generated.json';
import {roadGraphKey} from '../src/game/bangkok/roadSurfaceGraph';
import {integerBoolean} from './integer-road-clipping';

export function roadEnvelopes(d: District, extra = 0, force=false): MultiPolygon {
  if(!force&&extra===0&&baked.key===roadGraphKey(d))return baked.road as MultiPolygon;
  const nodes = new Map(d.nodes.map(n => [n.id, n]));
  const polys: Polygon[] = [];
  const caps = new Map<string, { p: Point; radius: number }>();
  for (const r of d.roads) {
    const a = nodes.get(r.a)!, b = nodes.get(r.b)!, len = Math.hypot(b.x-a.x,b.z-a.z);
    const ux=(b.x-a.x)/len, uz=(b.z-a.z)/len, w=r.width/2+extra;
    const ring: Ring = [[a.x+uz*w,a.z-ux*w],[b.x+uz*w,b.z-ux*w],
      [b.x-uz*w,b.z+ux*w],[a.x-uz*w,a.z+ux*w],[a.x+uz*w,a.z-ux*w]];
    polys.push([ring]);
    for (const p of [a,b]) if (!caps.has(p.id) || caps.get(p.id)!.radius<w) caps.set(p.id,{p,radius:w});
  }
  for (const {p,radius} of caps.values()) {
    const ring: Ring = Array.from({length:17},(_,i)=>[p.x+Math.cos(i*Math.PI/8)*radius,p.z+Math.sin(i*Math.PI/8)*radius]);
    ring[16]=ring[0]!;polys.push([ring]);
  }
  // Millimetre snapping removes near-coincident sampled endpoints before the sweep.
  for(const polygon of polys)for(const ring of polygon)for(const p of ring){p[0]=Math.round(p[0]*1000)/1000;p[1]=Math.round(p[1]*1000)/1000;}
  return integerBoolean(polys);
}
