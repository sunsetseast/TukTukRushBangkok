import type { District, Obstacle } from "../types";
import type { ArtPiece } from "./architecturalBatch";
import { planEnvironment } from "./environmentPlan";
import { planLandscape } from "./landscape";
import { stableHash } from "./buildingGrammar";
import { pieceVolume, validateSpatialVolumes } from "./spatialValidation";
import { emitTropicalPlant, tropicalSpecies, type TropicalSpecies } from "./tropicalVegetation";

export type TropicalPlant = { id:string; body:Obstacle; species:TropicalSpecies; seed:number; scale:number; context:string };
const cache=new WeakMap<District,TropicalPlant[]>();
export function planTropicalPlants(d:District) {
  const old=cache.get(d);if(old)return old;
  const plants:TropicalPlant[]=[];
  const add=(body:Obstacle,id:string,species:TropicalSpecies,context:string,scale=1)=>plants.push({body,id,species,seed:stableHash(id),context,scale});
  for(const site of planEnvironment(d))if(site.kind==="tree"||site.kind==="palm")add(site.body,site.id,tropicalSpecies(site.region,site.seed,site.kind==="palm"),site.region,.8);
  for(const body of planLandscape(d)){const seed=stableHash(body.environmentId!);add(body,body.environmentId!,seed%9===0?"bougainvillea":tropicalSpecies("paknam",seed,seed%3===0),"riverbank",.85);}
  for(const s of d.publicSpaces??[])s.trees.forEach((p,i)=>{
    const id=`park-tropical:${s.id}:${i}`;
    const body=d.obstacles.find(o=>o.x===p.x&&o.z===p.z&&o.environmentId?.includes("tree"));
    if(body)add(body,id,s.id==='sanam'?'tamarind':s.id==="benjakitti"?(i%5===0?"banana":"shade-tree"):(i%9===0?"royal-palm":i%7===0?"ratchaphruek":i%3===0?"shade-tree":"rain-tree"),s.id,s.id==="benjakitti"?.8:1);
  });
  for(const s of d.authoredSites??[])for(const [i,body] of (s.furniture??[]).entries())add(body,`site-tropical:${s.id}:${i}`,s.district==="riverside"||["bang-rak","khlong-san"].includes(s.district)?(i%3?"coconut":"frangipani"):tropicalSpecies("oldtown",i),s.id,.8);
  const pieces=(plant:TropicalPlant)=>{
    const result:ArtPiece[]=[];for(const detail of [true,false])emitTropicalPlant(plant.body,plant.species,plant.seed,p=>result.push(p),detail,plant.scale);return result;
  };
  // Full visible envelopes, not just trunks. Re-plan constrained planting as
  // genuinely shorter understory; render and physics agree on the result.
  const volumes=plants.flatMap(p=>pieces(p).map(q=>pieceVolume(q,p.id)));
  const rejected=new Set(validateSpatialVolumes(d,volumes).map(c=>c.objectId));
  for(const plant of plants){
    if(rejected.has(plant.id)){plant.species="understory";plant.scale=.55;}
    const art=pieces(plant);plant.body.height=Math.max(...art.map(p=>pieceVolume(p,plant.id).maxY));
  }
  cache.set(d,plants);return plants;
}
export function emitTropicalVegetation(d:District,emit:(p:ArtPiece)=>void){
  for(const plant of planTropicalPlants(d))for(const detail of [true,false])emitTropicalPlant(plant.body,plant.species,plant.seed,p=>emit({...p,siteId:plant.id,layer:detail?"near":"coarse"}),detail,plant.scale);
}
