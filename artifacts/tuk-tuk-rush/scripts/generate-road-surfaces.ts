/** Regenerate after intentional road graph edits. No reference photography. */
import fs from 'node:fs';
import clipping from 'polygon-clipping';
import {createBangkokWorld} from '../src/game/bangkok/world';
import {roadEnvelopes} from './road-surface-authoring';
import {roadGraphKey} from '../src/game/bangkok/roadSurfaceGraph';
import {integerBoolean} from './integer-road-clipping';
import {waterTerrainKey} from '../src/game/bangkok/waterGeometry';
const d=createBangkokWorld(),road=roadEnvelopes(d,0,true),curb=roadEnvelopes(d,.32,true),outer=roadEnvelopes(d,6,true);
const waterways=d.canals??[];
const waterNodes=waterways.flatMap((c,i)=>c.points.map((p,j)=>({...p,id:`water:${i}:${j}`})));
const waterRoads=waterways.flatMap((c,i)=>c.points.slice(1).map((_,j)=>({a:`water:${i}:${j}`,b:`water:${i}:${j+1}`,width:c.width,name:'water'})));
const waterDistrict={nodes:waterNodes,roads:waterRoads,buildings:[],obstacles:[],landmarks:[]};
const river=[d.riverPolygon!.map(r=>r.map(p=>[p.x,p.z] as [number,number]))];
const water=clipping.union(river,roadEnvelopes(waterDistrict,0,true));
// Cut actual channels out of terrain. Water can now sit below the banks instead
// of needing to float just above one unbroken ground plane.
const land=integerBoolean([[[[-7000,-7000],[7000,-7000],[7000,7000],[-7000,7000],[-7000,-7000]]]],water,true);
// Riverbanks are authoritative. Ordinary pavement is clipped to shore; bridge
// decks alone retain their surface over water. No parallel visual water stroke.
const bridges={...d,roads:d.roads.filter(r=>r.bridge)};
const bridgeDeck=roadEnvelopes(bridges,0,true);
const dryRoad=clipping.union(clipping.difference(road,water),bridgeDeck);
const dryCurb=clipping.difference(integerBoolean(curb,road,true),water);
const drySidewalk=clipping.difference(integerBoolean(outer,curb,true),water);
const result={key:roadGraphKey(d),waterKey:waterTerrainKey(d),road:dryRoad,curb:dryCurb,sidewalk:drySidewalk,water,land};
fs.writeFileSync(new URL('../src/game/bangkok/roadSurfaces.generated.json',import.meta.url),JSON.stringify(result)+'\n');
console.log({key:result.key,bytes:JSON.stringify(result).length});
