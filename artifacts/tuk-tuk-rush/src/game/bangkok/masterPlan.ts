import {CITY_MODEL} from './cityModel';
import type { Point } from "../types";
import type { CivicSegment } from "./civicRoads";

/** Authoritative local design controls. All consumers convert with the same
 * north-up 4:1 transform. WGS84 observations stay in geography.ts; these are
 * explicit miniature-city adjustments, not purported surveyed coordinates. */
export const MASTER_PLAN = {...CITY_MODEL.compression.masterPlan, phromPhong:CITY_MODEL.compression.masterPlan.phromPhong as [number,number]};
export const planPoint = (p: readonly number[]): Point => ({x:(p[0]!-500)*4,z:(p[1]!-600)*4});

/** Runs BEFORE intersection splitting, rendering, collision, traffic and route
 * generation. A crossing consequently cannot become a decorative dead road. */
export function reconstructMasterPlanRoads(segments: CivicSegment[], controls: Record<string,Point>) {
  const add=(points: readonly (readonly number[])[], corridor:string, name:string, width:number, oneWay=false)=>{
    for(let i=1;i<points.length;i++) segments.push({a:planPoint(points[i-1]!),b:planPoint(points[i]!),cuts:[0,1],
      road:{a:"",b:"",width,name,corridor,oneWay}});
  };
  // One shared northern boulevard; Saphan Khwai and Sanam Pao no longer have
  // rail anchors floating beside a different straight Phahonyothin chord.
  for(let i=segments.length-1;i>=0;i--){const s=segments[i]!;
    if(s.road.corridor==="phaya" && Math.min(s.a.z,s.b.z)<planPoint([0,230]).z) segments.splice(i,1);
    else if(s.road.corridor==="phaya" && Math.max(s.a.z,s.b.z)>planPoint([0,400]).z)segments.splice(i,1);
  }
  add([...MASTER_PLAN.north,[717,230]],"phaya","Phahonyothin / Phaya Thai",20);
  // Phaya Thai meets Rama I west of the Siam retail parcels. The inherited
  // diagonal entered beside Siam Center and forced trains through its roof.
  add([[680,340],[640,455]],"phaya","Phaya Thai Road",20);
  add(MASTER_PLAN.sukhumvit.slice(2),"sukhumvit-east","Sukhumvit — Phrom Phong",22);
  // Odd numbered sois north, even numbered sois south. Shorter arcade loops
  // retain street identity; they are not a claim of exact real-world junctions.
  add([[875,490],[883,425],[920,417],[940,400]],"soi-11","Sukhumvit Soi 11 / north local connection",9);
  add([[990,580],[977,677],[945,695]],"soi-22","Sukhumvit Soi 22",10);
  add([[1070,636.666666667],[1085,724],[945,772]],"soi-24","Sukhumvit Soi 24 / Rama IV local approach",12);
  add([[1010,595],[1008,489],[940,460]],"soi-31","Sukhumvit Soi 31 / north local connection",9);
  add([[1055,610+25*2/3],[1080,546],[1008,489]],"soi-39","Sukhumvit Soi 39 / local connection",10);
  add([[1085,724],[1095,697],[1090,650]],"phrom-phong-service","Phrom Phong southern access",12);
  add([[435,270],[421,340],[405,405]],"dinso","Dinso Road",12);
  add([[405,405],[389,405],[384,468],[395,520]],"ti-thong","Ti Thong / historic connector",10);
  add([[350,335],[365,378],[367,473],[340,535]],"atsadang","Atsadang / old-city canal edge",10);
  add([[475,490],[468,524],[460,555]],"mangkon","Mangkon Road",9);
  add([[443,502],[438,530],[432,520+37*35/65]],"plaeng-nam","Plaeng Nam Road",7);
  // Expose endpoints for downstream audits without giving them legacy IDs.
  controls.phrom_phong=planPoint(MASTER_PLAN.phromPhong);
}

export type MrtSpecification={id:string;name:string;thai:string;code:string;design:number[];interchange?:string;introduced:number;district:string;sources:string[]};
export const MRT_ENTRANCES:MrtSpecification[] = CITY_MODEL.infrastructure.mrt;
