/** Regenerate after intentional road graph edits. No reference photography. */
import fs from 'node:fs';
import clipping from 'polygon-clipping';
import {createBangkokWorld} from '../src/game/bangkok/world';
import {roadEnvelopes,roadGraphKey} from '../src/game/bangkok/roadSurfaceGraph';
const d=createBangkokWorld(),road=roadEnvelopes(d,0,true),curb=roadEnvelopes(d,.32,true),outer=roadEnvelopes(d,6,true);
const result={key:roadGraphKey(d),road,curb:clipping.difference(curb,road),sidewalk:clipping.difference(outer,curb)};
fs.writeFileSync(new URL('../src/game/bangkok/roadSurfaces.generated.json',import.meta.url),JSON.stringify(result)+'\n');
console.log({key:result.key,bytes:JSON.stringify(result).length});
