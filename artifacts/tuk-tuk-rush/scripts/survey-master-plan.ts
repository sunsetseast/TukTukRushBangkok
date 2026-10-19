import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { validateSpatialVolumes,obstacleVolume,pieceVolume } from "../src/game/bangkok/spatialValidation";
const checkout=process.env.CITY_CHECKOUT??new URL("../../../",import.meta.url).pathname;
const source=`${checkout}/artifacts/tuk-tuk-rush/src/game/bangkok`,load=(file:string)=>import(pathToFileURL(`${source}/${file}.ts`).href);
const [{createBangkokWorld,toMap},{GEOGRAPHIC_REFERENCES,geographicOffset},{REAL_PLACES},{default:layout}]=await Promise.all([load("world"),load("geography"),load("realPlaces"),import(pathToFileURL(`${source}/layout.json`).href,{with:{type:"json"}})]);
const d=createBangkokWorld(),decoration:any[]=[];
for(const [file,fn] of [["destinationArt","emitDestinationGrounds"],["environmentArt","emitEnvironment"],["authoredGrounds","emitAuthoredGrounds"],["landscape","emitLandscape"]]){
  const m=await load(file!);m[fn!](d,(p:any)=>decoration.push(pieceVolume(p,`${file}:${decoration.length}`)));
}
const conflicts=validateSpatialVolumes({...d,transit:undefined},[...d.obstacles.map(obstacleVolume),...decoration]);
const inventory={base:process.env.CITY_LABEL??"after",projection:{worldX:"(designX-500)*4",worldZ:"(designY-600)*4",north:"negative Z",exactGps:false},
  coordinateReferences:GEOGRAPHIC_REFERENCES.map((r:any)=>({...r,residual:geographicOffset(r)})),
  river:{centerline:d.river,width:d.riverWidth},canals:d.canals,regions:d.regions,
  nodes:d.nodes,roads:d.roads,bridges:d.roads.filter((r:any)=>["taksin","memorial","pinklao"].includes(r.corridor)),
  landmarks:d.landmarks.map((l:any)=>({id:l.id,name:l.name,kind:l.kind,design:toMap(l.plot??l),world:l.plot??l,yaw:l.yaw??0,publicStop:l.accessNode,footprints:d.obstacles.filter((o:any)=>o.landmarkId===l.id),reference:GEOGRAPHIC_REFERENCES.find((r:any)=>r.id===l.id)?.sources??REAL_PLACES.find((r:any)=>r.id===l.id)?.references??[],classification:["emporium","emquartier","emsphere","benchasiri","chatuchak-park"].includes(l.id)?"Approximately correct but needing refinement":"Approximately correct but needing refinement",note:["emporium","emquartier","emsphere","benchasiri","chatuchak-park"].includes(l.id)?"New researched miniature interpretation; full survey fidelity is not claimed":"Retained or refined existing asset; see audit.md for remaining geographic/art limitations"})),
  publicSpaces:d.publicSpaces,sites:d.authoredSites,transit:d.transit?.lines.map((l:any)=>({id:l.id,stations:l.stations,centerline:l.samples})),
  layoutControlNodes:Object.keys(layout.road_nodes).length,layoutPrincipalCorridors:layout.road_corridors.length,buildings:d.buildings.length,obstacles:d.obstacles.length,
  severeLaneConflicts:conflicts,
};
const label=process.env.CITY_LABEL??"after",dir=new URL("../../../docs/qa/master-plan/",import.meta.url);fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(new URL(`master-plan-${label}.json`,dir),JSON.stringify(inventory,null,2));
fs.writeFileSync(new URL(`conflicts-${label}-survey.json`,dir),JSON.stringify(conflicts,null,2));
console.log(JSON.stringify({label,nodes:d.nodes.length,roads:d.roads.length,buildings:d.buildings.length,landmarks:d.landmarks.length,parks:d.publicSpaces.length,laneConflicts:conflicts.length}));
