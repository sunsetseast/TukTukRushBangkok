import baked from './roadSurfaces.generated.json';
import {stableHash} from './buildingGrammar';
import * as T from 'three';
import clipping, { type MultiPolygon, type Polygon, type Ring } from 'polygon-clipping';
import type { District, Point } from '../types';
import { asphaltMaterial } from './streetSurfaces';

/** Boolean road ribbons: one topological surface, including holes around islands.
 * Sidewalks are the DIFFERENCE of road envelopes, never independent crossing slabs. */
export function roadGraphKey(d:District){return String(stableHash(JSON.stringify({nodes:d.nodes.map(n=>[n.x,n.z]),roads:d.roads.map(r=>[r.a,r.b,r.width])})));}
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
  return clipping.union(polys[0]!,...polys.slice(1));
}
export function surfaceGeometry(polygons: MultiPolygon, y: number) {
  const positions:number[]=[], normals:number[]=[], uvs:number[]=[];
  for(const polygon of polygons) {
    const rings=polygon.map(r=>r.slice(0,-1).map(p=>new T.Vector2(Math.fround(p[0]),Math.fround(p[1]))));
    const vertices=rings.flat(), faces=T.ShapeUtils.triangulateShape(rings[0]!,rings.slice(1));
    for(const f of faces) {
      // X/Z mapping reverses normal; explicitly use upward winding.
      const a=vertices[f[0]!]!,b=vertices[f[1]!]!,c=vertices[f[2]!]!;
      const cross=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
      if(Math.abs(cross)<1e-6)continue;
      for(const p of cross>0?[a,c,b]:[a,b,c]) {positions.push(p.x,y,p.y);normals.push(0,1,0);uvs.push(p.x*.12,p.y*.12);}
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  g.computeBoundingBox();g.computeBoundingSphere();return g;
}
export function buildRoadSurfaces(d: District) {
  const cached=baked.key===roadGraphKey(d),road=cached?baked.road as MultiPolygon:roadEnvelopes(d),curb=cached?baked.curb as MultiPolygon:clipping.difference(roadEnvelopes(d,.32),road),sidewalk=cached?baked.sidewalk as MultiPolygon:clipping.difference(roadEnvelopes(d,6),roadEnvelopes(d,.32));
  const root=new T.Group();root.name='BangkokRoadGraph';
  const surfaces=[
    [road,.14,asphaltMaterial(),'asphalt'],
    [curb,.205,new T.MeshStandardMaterial({color:'#dbd0b5',roughness:1}),'curb'],
    [sidewalk,.22,new T.MeshStandardMaterial({color:'#b6afa0',roughness:1}),'sidewalk'],
  ] as const;
  for(const [p,y,m,name] of surfaces){const mesh=new T.Mesh(surfaceGeometry(p,y),m);mesh.name=`RoadSurface:${name}`;root.add(mesh);}
  root.userData.roadPolygons=road;root.userData.sidewalkPolygons=sidewalk;
  return root;
}
