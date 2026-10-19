/** Regenerate after intentional road graph edits. No reference photography. */
import fs from 'node:fs';
import clipping from 'polygon-clipping';
import {createBangkokWorld} from '../src/game/bangkok/world';
import {roadEnvelopes} from './road-surface-authoring';
import {roadGraphKey} from '../src/game/bangkok/roadSurfaceGraph';
import {integerBoolean} from './integer-road-clipping';
const d=createBangkokWorld(),road=roadEnvelopes(d,0,true),curb=roadEnvelopes(d,.32,true),outer=roadEnvelopes(d,6,true);
const waterways=[{points:d.river!,width:d.riverWidth!},...(d.canals??[])];
const waterNodes=waterways.flatMap((c,i)=>c.points.map((p,j)=>({...p,id:`water:${i}:${j}`})));
const waterRoads=waterways.flatMap((c,i)=>c.points.slice(1).map((_,j)=>({a:`water:${i}:${j}`,b:`water:${i}:${j+1}`,width:c.width,name:'water'})));
const waterDistrict={nodes:waterNodes,roads:waterRoads,buildings:[],obstacles:[],landmarks:[]};
const water=roadEnvelopes(waterDistrict,0,true);
// Cut actual channels out of terrain. Water can now sit below the banks instead
// of needing to float just above one unbroken ground plane.
const land=integerBoolean([[[[-7000,-7000],[7000,-7000],[7000,7000],[-7000,7000],[-7000,-7000]]]],water,true);
const result={key:roadGraphKey(d),road,curb:integerBoolean(curb,road,true),sidewalk:integerBoolean(outer,curb,true),water,land};
fs.writeFileSync(new URL('../src/game/bangkok/roadSurfaces.generated.json',import.meta.url),JSON.stringify(result)+'\n');
console.log({key:result.key,bytes:JSON.stringify(result).length});
