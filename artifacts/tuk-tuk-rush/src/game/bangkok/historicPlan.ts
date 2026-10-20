import type { CivicSegment } from './civicRoads';
import type { District, Obstacle, Point } from '../types';

/** Research observations live in geography.ts. These controls are an authored
 * arcade compression, never surveyed outlines. +x east; +z south. */
export const HISTORIC_PLAN = {
  palace: [295,365], pho: [300,425], swing: [410,365],
  golden: [480,330], democracy: [435,270], traimit: [564,574],
  hua: [600,528], gate: [535,590],
  palaceScale: 1.5,
  swingFeatureZ: -58,
  democracyRadius: 38,
  democracyWidth: 16,
} as const;
export const historicPoint = (p: readonly number[]): Point => ({x:(p[0]!-500)*4,z:(p[1]!-600)*4});
export const HISTORIC_IDS = ['palace','pho','swing','golden','democracy','hua','traimit','gate','sanam'] as const;
export function inHistoricCore(p: Point) {
  const x=p.x/4+500,y=p.z/4+600;
  return (x>=245&&x<=515&&y>=240&&y<=485)||(x>=515&&x<=625&&y>=455&&y<=610);
}
/** The narrow commercial band WEST of Maha Rat, not the temple-side pavement.
 * Two-storey masonry trading blocks are retained here (Tha Chang / Tha Tien).
 * These are bounded miniature controls, not cadastral property identifications. */
export function isHistoricWaterfront(p: Point) {
  if (p.z < -1048 || p.z > -620 || p.x < -1080) return false;
  const roadX = p.z < -780 ? -940 : p.z < -700 ? -940 + (p.z + 780) * .85 : -872;
  return p.x < roadX - 12;
}
/** Public temple-side pavement follows the existing Maha Rat bend. Protecting
 * this actual ground wedge fixes ALL infill passes, rather than one ray/object. */
export const PHO_WEST_APPROACH: Point[] = [
  {x:-930,z:-777},{x:-851,z:-777},{x:-851,z:-625},
  {x:-864,z:-625},{x:-864,z:-703},
];
// A single pier alley through the trading blocks, not a waterfront boulevard.
export const PHO_PIER_PASSAGE = {from:{x:-1062,z:-740},to:{x:-921,z:-749},width:7};
export function democracyRing() {
  const c=historicPoint(HISTORIC_PLAN.democracy);
  return Array.from({length:32},(_,i)=>{
    const a=-Math.PI/2+i*Math.PI*2/32;
    return {x:c.x+Math.cos(a)*HISTORIC_PLAN.democracyRadius,z:c.z+Math.sin(a)*HISTORIC_PLAN.democracyRadius};
  });
}
/** Runs after the existing master/public plans, before intersection splitting.
 * Only selected historic segments are replaced. Existing eastern corridors,
 * bridges, Yaowarat, BTS and destination identities remain authoritative. */
export function reconstructHistoricRoads(segments: CivicSegment[], controls: Record<string,Point>) {
  const remove = new Set(['dinso','ti-thong','atsadang']);
  for(let i=segments.length-1;i>=0;i--) {
    const s=segments[i]!,id=s.road.corridor;
    if(remove.has(id??'') || (id==='old_siam' && Math.min(s.a.x,s.b.x)<historicPoint([640,0]).x)) segments.splice(i,1);
    // Replace only the station-to-gateway chord. It previously bisected the
    // Wat Traimit neighborhood and mislabeled Tri Mit as Charoen Krung.
    else if((id==='old_w'||id==='old_e') && Math.min(s.a.z,s.b.z)>=historicPoint([0,335]).z) segments.splice(i,1);
    else if(id==='charoen_n' && Math.max(s.a.z,s.b.z)>historicPoint([0,550]).z) segments.splice(i,1);
  }
  const add=(ps:readonly (readonly number[])[],corridor:string,name:string,width=12,oneWay=false)=>{
    for(let i=1;i<ps.length;i++)segments.push({a:historicPoint(ps[i-1]!),b:historicPoint(ps[i]!),cuts:[0,1],road:{a:'',b:'',corridor,name,width,oneWay}});
  };
  // Public perimeter streets follow the compound walls. The inherited x=250 /
  // x=350 chords left entire commercial blocks between temples and their roads.
  add([[265,335],[265,405],[282,425],[282,455],[282,478],[318,515],[340,535]],'old_w','Maha Rat / Tha Tien perimeter',12);
  add([[325,335],[325,405],[322,425],[322,455],[330,495],[340,535]],'old_e','Sanam Chai perimeter',12);
  // Bamrung Mueang lies BETWEEN the civic Swing and the temple's north wall.
  // The eastern Rama I connection bends beyond the lower Wat Saket precinct.
  add([[350,335],[350,356.25],[389,356.25],[432,356.25],[450,356.25],[505,365],[540,396],[640,455]],'old_siam','Bamrung Mueang / Rama I connector',16);
  add([[435,270],[414,315],[410,340]],'dinso','Dinso Road',12);
  add([[389,340],[410,340],[432,340],[432,356.25]],'sao-chingcha','Sao Chingcha civic square perimeter',10);
  add([[389,340],[389,356.25],[389,405],[384,468],[395,520]],'ti-thong','Ti Thong Road',10);
  add([[432,356.25],[432,400],[450,430],[475,490]],'unakan','Unakan / historic commercial connection',10);
  add([[350,335],[365,378],[367,473],[340,535]],'atsadang','Atsadang canal-edge corridor',10);
  add([[265,405],[285,405],[325,405],[350,405],[389,405]],'thai-wang','Thai Wang / Chetuphon exterior connection',12);
  add([[450,356.25],[450,320],[460,300]],'maha-chai','Maha Chai / Wat Saket west approach',12);
  add([[505,365],[505,330],[505,313.3333333333]],'boripat','Boripat Road',10);
  // Endpoint is interpolated on the existing Ratchadamnoen / Lan Luang leg.
  const n=segments.find(s=>s.road.corridor==='north_old'&&s.b.x===controls.lan_luang!.x)!;
  const x=historicPoint([505,0]).x,t=(x-n.a.x)/(n.b.x-n.a.x);
  segments[segments.length-1]!.b={x,z:n.a.z+(n.b.z-n.a.z)*t};
  const west=historicPoint([460,300]);
  const tw=(west.x-n.a.x)/(n.b.x-n.a.x);
  segments.push({a:west,b:{x:west.x,z:n.a.z+(n.b.z-n.a.z)*tw},cuts:[0,1],road:{a:'',b:'',width:12,corridor:'maha-chai',name:'Maha Chai junction'}});
  add([[600,550],[596,577],[581,610],[552,610],[535,590]],'tri-mit','Tri Mit Road / station gateway approach',12);
  // Clockwise ring: all live Ratchadamnoen, Dinso and Khao San arms join it.
  const center=controls.democracy!,ring=democracyRing();
  for(const s of segments)for(const key of ['a','b'] as const) {
    if(Math.hypot(s[key].x-center.x,s[key].z-center.z)>0.01)continue;
    const other=s[key==='a'?'b':'a'];
    s[key]=ring.reduce((a,b)=>Math.hypot(a.x-other.x,a.z-other.z)<Math.hypot(b.x-other.x,b.z-other.z)?a:b);
  }
  // Redirecting the avenue to the ring changes its chord slightly. Reproject
  // both new northern junctions onto that FINAL chord, so a 1–2m asphalt
  // overlap cannot masquerade as a connected graph intersection.
  for(const s of segments)if((s.road.corridor==='boripat'&&s.b.z<s.a.z&&s.b.z<historicPoint([0,330]).z)||s.road.name==='Maha Chai junction') {
    const t=(s.b.x-n.a.x)/(n.b.x-n.a.x);
    s.b={x:s.b.x,z:n.a.z+(n.b.z-n.a.z)*t};
  }
  ring.forEach((a,i)=>segments.push({a,b:ring[(i+1)%ring.length]!,cuts:[0,1],road:{a:'',b:'',width:HISTORIC_PLAN.democracyWidth,name:'Democracy Monument traffic circle',corridor:'democracy-circle',roundabout:true,oneWay:true}}));
  controls.giant_swing=historicPoint([410,356.25]);
  controls.golden_mount=historicPoint([450,340]);
}
export function democracyIsland(): Obstacle[] {
  const p=historicPoint(HISTORIC_PLAN.democracy);
  // Polygonal low island fits inside the 30m inner asphalt radius. No box
  // covers the circulating lanes or bridges the ring's hole.
  return [{...p,w:38,d:38,height:1,color:'#d5c5a4',landmarkId:'democracy',protected:true}];
}

/** Conservative ground solids match the authored walls and halls. The hill is
 * blocked as a solid core, while exterior streets stay outside its reservation. */
export const GOLDEN_SITE_MASSES = [
  {name:'Wat Saket hill core',x:0,z:0,w:72,d:68,h:34},
  {name:'summit and chedi',x:0,z:0,w:18,d:18,h:62},
  {name:'lower Wat Saket hall',x:-18,z:49,w:30,d:29,h:20},
  {name:'lower eastern hall',x:25,z:44,w:21,d:26,h:15},
  {name:'west boundary',x:-48,z:10,w:.7,d:118,h:2.8},
  {name:'east boundary',x:48,z:10,w:.7,d:118,h:2.8},
  {name:'north boundary',x:0,z:-49,w:96,d:.7,h:2.8},
  {name:'south west boundary',x:-30,z:66,w:36,d:.7,h:2.8},
  {name:'south east boundary',x:30,z:66,w:36,d:.7,h:2.8},
];
export const TRAIMIT_SITE_MASSES = [
  {x:0,z:0,w:46,d:46,h:13}, {x:0,z:0,w:24,d:24,h:49},
  {x:-16,z:16,w:14,d:12,h:9},{x:16,z:16,w:14,d:12,h:9},
  {x:-29,z:0,w:.65,d:62,h:2.7},{x:29,z:0,w:.65,d:62,h:2.7},
  {x:0,z:-31,w:58,d:.65,h:2.7},
  {x:-19,z:31,w:20,d:.65,h:2.7},{x:19,z:31,w:20,d:.65,h:2.7},
  {x:-8,z:31,w:1.5,d:1.7,h:7.6},{x:8,z:31,w:1.5,d:1.7,h:7.6},
];
