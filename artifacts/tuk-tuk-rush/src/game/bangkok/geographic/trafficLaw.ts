/** Bangkok traffic-law reference layer — provenance-separated from OSM signs.
 * Reference: Bangkok Metropolitan Police Bureau regulation effective 2024-12-24
 * reported by Thailand Public Relations Department and Thai PBS.
 * 60 km/h on covered Bangkok roads; 50 km/h on ten royal precinct roads;
 * 13 named trunk routes are EXEMPT from the 60 km/h rule. An exemption
 * is NOT a new unlimited-speed law and never generates a numeric sign.
 *
 * https://www.prd.go.th/th/content/category/detail/id/39/iid/350263
 * https://www.thaipbs.th/news/content/347523
 *
 * Context is the generic car/arcade advisory policy. Different vehicle
 * classes, temporarily posted orders, construction and sign-specific speed
 * rules can supersede this reference and require authoritative local data.
 */
import type { RuntimeTurnRestriction } from "./controlImport";

export type SpeedPolicy = {
  limitKph?: number;
  source: "metropolitan-order-50" | "metropolitan-order-60" |
    "named-exemption-unresolved" | "no-source-name";
  noHornZone: boolean;
  /** Not equivalent to a physical roadside speed-limit sign. */
  postedSignVerified: false;
};
const normalize=(s:string)=>s.toLowerCase()
  .normalize("NFKC").replace(/\b(?:road|avenue|rd|ave|thanon|ถนน)\b/gu,"")
  .replace(/[\s\-–—().,]+/g,"").trim();
const palaceRoads = [
  ["ratchadamnoennai","ราชดำเนินใน"],
  ["naphathat","หน้าพระธาตุ","naphra that","หน้าพระธาตุ"],
  ["phrachan","พระจันทร์"],
  ["naphralan","หน้าพระลาน"],
  ["sanamchai","สนามไชย"],
  ["kalyanamaitri","กัลยาณไมตรี","kanlayanamitri"],
  ["thaiwang","ท้ายวัง"],
  ["maharat","มหาราช","maharaj"],
  ["rachini","ราชินี","rajini","ratchini"],
  ["setthakan","เศรษฐการ"],
].map(names=>names.map(normalize));
const exemptTrunks=[
  ["vibhavadirangsit","วิภาวดีรังสิต"],
  ["bangnatrat","เทพรัตน","debaratna","bangnatrad"],
  ["srinagarindra","ศรีนครินทร์","sinakharin","srinakarin"],
  ["phahonyothin","พหลโยธิน","phaholyothin"],
  ["ramintra","รามอินทรา","raminthra"],
  ["ratchaphruek","ราชพฤกษ์","ratchapruek"],
  ["borommaratchachonnani","บรมราชชนนี","baromratchonnanee"],
  ["kanlapaphruek","กัลปพฤกษ์","kalpapruek"],
  ["romklao","ร่มเกล้า"],
  ["suwinthawong","สุวินทวงศ์"],
  ["chaengwatthana","แจ้งวัฒนะ","chaengwattana"],
  ["rama3","พระราม3","rama iii","phraram3"],
  ["newsrinagarindraromklao","ศรีนครินทร์ร่มเกล้า","srinagarindraromklao"],
].map(names=>names.map(normalize));
/** Fail conservatively where a way name is missing or could identify a
 * generic small "Rama III Soi" rather than a named through-road. Normalized
 * exact matching avoids putting the 50 kph/exception policy on adjacent sois.
 */
function named(name:string|undefined,thai:string|undefined,rows:string[][]){
  const inputs=[name,thai].filter((s):s is string=>!!s).map(normalize);
  return rows.some(aliases=>inputs.some(value=>aliases.includes(value)));
}
export function bangkokSpeedPolicy(name?:string,thai?:string):SpeedPolicy {
  if(!name?.trim()&&!thai?.trim())return {
    source:"no-source-name",noHornZone:false,postedSignVerified:false,
  };
  if(named(name,thai,palaceRoads))return {
    limitKph:50,source:"metropolitan-order-50",
    noHornZone:true,postedSignVerified:false,
  };
  if(named(name,thai,exemptTrunks))return {
    source:"named-exemption-unresolved",noHornZone:false,
    postedSignVerified:false,
  };
  return {
    limitKph:60,source:"metropolitan-order-60",
    noHornZone:false,postedSignVerified:false,
  };
}
export type TurnIndex = Map<string,ReadonlyArray<RuntimeTurnRestriction>>;
export function indexVerifiedTurnRestrictions(
  rules:ReadonlyArray<RuntimeTurnRestriction>,
):TurnIndex {
  const index=new Map<string,RuntimeTurnRestriction[]>();
  for(const r of rules){
    if(!Number.isInteger(r.via)||r.via<0||
      !Number.isInteger(r.fromWay)||r.fromWay<0||
      !Number.isInteger(r.toWay)||r.toWay<0||
      (r.type!=="no"&&r.type!=="only"))throw Error("Bad source turn restriction");
    const key=`${r.via}:${r.fromWay}`;
    const list=index.get(key)??[];
    list.push(r);
    index.set(key,list);
  }
  return index;
}
export function turnAllowed(
  restrictions:TurnIndex,at:number,incomingWay:number|undefined,
  outgoingWay:number,
):boolean {
  if(incomingWay===undefined)return true; // start at an actual junction
  const rows=restrictions.get(`${at}:${incomingWay}`)??[];
  if(rows.some(r=>r.type==="no"&&r.toWay===outgoingWay))return false;
  const only=rows.filter(r=>r.type==="only");
  return !only.length||only.some(r=>r.toWay===outgoingWay);
}
/** Universal default: only enforce source-verified maneuvers. A law exists
 * without a physical sign, but a made-up sign or legal speed is not allowed.
 */
export const ROAD_LAW_COVERAGE_REQUIREMENTS=[
  "osm-oneway","osm-motor-access","osm-turn-restrictions",
  "bangkok-metropolitan-speed-order","posted-speed-signs",
  "conditional-access-and-time","bus-only-lanes","marked-crosswalks",
  "pedestrian-priority","parking-and-stopping-controls",
  "lane-turn-and-bus-designation","emergency-and-vehicle-class-exemptions",
  "physical-signal-phase-timing",
] as const;
