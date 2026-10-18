import { reviewedLandmark } from './landmarkSites';
import * as T from 'three';
import type { Landmark } from '../types';
import { LandmarkBuilder } from './landmarkBuilder';
import { buildCommercialDistrictModel } from './commercialDistrictArt';
export const COMMERCIAL_ASSETS=['icon','paragon','central','mbk','terminal'];
/** Purpose-built retail silhouettes. The documented footprint contract is shared
 * with authored reservations; no runtime photos, hotlinks or per-window meshes. */
export function realCommercial(l:Landmark){
 if(!COMMERCIAL_ASSETS.includes(l.id!))return;
 // Preserve the existing folded riverfront ICONSIAM model.
 if(l.id==='icon'){const root=reviewedLandmark(l)!;for(const level of root.levels)level.object.rotation.y=Math.PI/2;root.userData.authoredAsset='real-icon-river-oriented-v5';return root;}
 const lod=new T.LOD();
 for(const detail of [true,false]){
  const b=new LandmarkBuilder();buildCommercialDistrictModel(l.id!,b,detail);
  lod.addLevel(b.finish(`real-${l.id}-district-v6-${detail?'near':'far'}`),detail?0:300,.12);
 }
 lod.userData.authoredAsset=`real-${l.id}-district-v6`;
 lod.userData.nightMaterials=lod.levels.flatMap(l=>l.object.userData.nightMaterials);return lod;
}
