import data from './cityData.v1.json';
import type {District,Point} from '../types';
import {roadGraphKey} from './roadIdentity';

/** Versioned approval data, not a second generated world or landmark registry.
 * Facts, compression and model origins have separate contracts. Existing road,
 * parcel, arrival and registry builders remain the only runtime producers. */
export type GeographicFact = {
 coordinate:{lat:number;lon:number}|null;
 accuracy:'approximate-site-center'|'approximate-station-center'|'not-verified';
 district:string;bank:'east'|'west'|'not-verified';
 sources:string[];confidence:'operator-and-map'|'inherited'|'research-needed';
};
export type CityGeometryKind='street-corridor'|'intersection'|'district'|'parcel'|'landmark-footprint'|'entrance'|'transit-station'|'bridge'|'pier'|'public-space'|'waterway';
export type CityGeometryContract = {
 id:string;kind:CityGeometryKind;geometry:Point[];
 coordinates:'game-world';provenance:string;approvalVersion:string;
};
export type ApprovedSite = typeof data.features[number];
export const CITY_MODEL=data;
const sites=new Map(data.features.map(p=>[p.id,p]));
export function approvedSite(id:string){return sites.get(id);}
export function approvedOrigin(id:string):Point|undefined {
 const p=sites.get(id);return p?{...p.model.origin}:undefined;
}
export function approvedDesign(id:string):[number,number] {
 const p=sites.get(id);if(!p)throw Error('Unapproved city placement: '+id);
 return [p.model.design[0]!,p.model.design[1]!];
}
export function canonicalFeaturePoint(id:string,origin:Point,yaw=0):Point {
 const o=sites.get(id)?.featureOffset??{x:0,z:0},c=Math.cos(yaw),s=Math.sin(yaw);
 return {x:origin.x+c*o.x+s*o.z,z:origin.z-s*o.x+c*o.z};
}
/** A change to geography must update an approval, never silently refit a site.
 * This guard is intentionally independent of subjective visual grades. */
export function assertApprovedCityGeometry(d:District) {
 if(roadGraphKey(d)!==data.roadBaseline.key)throw Error('City road baseline changed without an explicit versioned approval');
 for(const p of data.features) {
  const l=d.landmarks.find(l=>l.id===p.id),q=l?.plot??l;
  if(!q||Math.hypot(q.x-p.model.origin.x,q.z-p.model.origin.z)>1e-6)
   throw Error('City placement differs from approved model origin: '+p.id);
 }
}
