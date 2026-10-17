import type { District, Landmark, Obstacle } from '../types';
import { distanceToSegment, orientedFootprintsOverlap } from '../world';
import { toWorld, riverDistance } from './world';

export type RealPlace = {
  id: string; name: string; category: 'hotel'|'architecture'|'heritage';
  address: string; neighborhood: string; region: string; bank?: 'east'|'west';
  nearby: string[]; map: [number,number]; asset: string;
  tier: 'hero'|'major'; access: 'public-roadside';
  footprint: [number,number]; height: number; yaw: number;
  references: string[]; features: string[];
};
const hotel = (id:string,name:string,address:string,neighborhood:string,region:string,bank:RealPlace['bank'],map:[number,number],footprint:[number,number],height:number,yaw:number,nearby:string[],references:string[],features:string[],tier:RealPlace['tier']='major'):RealPlace => ({id,name,address,neighborhood,region,bank,map,footprint,height,yaw,nearby,references,features,tier,category:'hotel',access:'public-roadside',asset:`real-${id}-v1`});
/** Curated design anchors, NOT a GPS projection. North is -Z. Source addresses
 * verify geography; footprints are deliberately compressed. No random fitting. */
export const REAL_PLACES: RealPlace[] = [
  hotel('oriental','Mandarin Oriental Bangkok','48 Oriental Avenue','Bang Rak','silom','east',[450,860],[92,64],43,-Math.PI/2,['river-city','state'],['https://www.mandarinoriental.com/en/bangkok/chao-phraya-river/gallery'],['Broad River Wing with repeated recessed bays','Historic Authors’ Wing and Garden Wing','White colonnades, pitched heritage roof and river terrace'],'hero'),
  hotel('peninsula','The Peninsula Bangkok','333 Charoen Nakhon Road','Khlong San','icon','west',[345,907],[72,60],116,Math.PI/2,['icon','hilton','oriental'],['https://www.peninsula.com/en/-/media/09---bangkok/the-peninsula-bangkok-presentation.pdf','https://www.peninsula.com/en/bangkok/5-star-luxury-hotel-riverside'],['Wave/W-shaped plan with angled river bays','Stepped tower crown','River terrace pavilions and garden'],'hero'),
  hotel('hilton','Millennium Hilton Bangkok','123 Charoen Nakhon Road','Khlong San','icon','west',[311,795],[52,48],120,Math.PI/2,['icon','peninsula'],['https://www.hilton.com/en/hotels/bkkhitw-millennium-hilton-bangkok/','https://stories.hilton.com/destination-spotlight/rooms-with-a-view-millennium-hilton-bangkok'],['Slender pale slab with rounded river face','Vertical dark spine','Cantilevered ThreeSixty rooftop disc'],'hero'),
  hotel('shangri','Shangri-La Bangkok','89 Soi Wat Suan Plu, New Road','Bang Rak','silom','east',[478,931],[86,58],79,-Math.PI/2,['state','oriental','saphan-taksin'],['https://www.shangri-la.com/bangkok/shangrila/','https://www.shangri-la.com/bangkok/shangrila/about/map-directions/'],['Shangri-La and Krungthep wings','Pale horizontal balcony bands','Thai riverside dining pavilions']),
  hotel('state','Lebua at State Tower','1055 Silom Road','Bang Rak','silom','east',[550,895],[40,40],138,0,['shangri','oriental'],['https://lebua.com/'],['Existing State Tower reused','Golden dome and open rooftop colonnade','Stepped pale balcony tower'],'hero'),
  hotel('four-seasons','Four Seasons Hotel Bangkok at Chao Phraya River','300/1 Charoen Krung Road','Yan Nawa / Sathorn','south','east',[452,1037],[94,64],29,-Math.PI/2,['capella','asiatique'],['https://www.fourseasons.com/bangkok/','https://press.fourseasons.com/bangkok/hotel-facts/'],['Cascading low-rise wings','Multiple open courtyards','Layered river terraces and reflecting pools']),
  hotel('capella','Capella Bangkok','300/2 Charoen Krung Road','Yan Nawa / Sathorn','south','east',[447,1063],[84,58],29,-Math.PI/2,['four-seasons','asiatique'],['https://capellahotels.com/en/capella-bangkok'],['Seven-level rectilinear room wing','Deep glass balcony grid','Low U-shaped river court with villas']),
  hotel('rosewood','Rosewood Bangkok','1041/38 Phloen Chit Road','Phloen Chit','sukhumvit',undefined,[850,461],[48,42],119,0,['embassy','phloen-chit'],['https://www.kpf.com/project/rosewood-bangkok','https://www.rosewoodhotels.com/en/bangkok/overview/our-story'],['Two sloping wai-inspired forms','Tall open central garden slot','Diagonal silver cladding and dark glass'],'hero'),
  hotel('embassy','Park Hyatt Bangkok / Central Embassy','88 Wireless Road','Phloen Chit / Lumphini','siam',undefined,[825,430],[76,65],109,0,['rosewood','central','phloen-chit'],['https://www.ala.uk.com/selected-projects/central-embassy/','https://newsroom.hyatt.com/2012-02-17-HYATT-AND-CENTRAL-EMBASSY-ANNOUNCE-PLANS-FOR-ICONIC-PARK-HYATT-BANGKOK-TWISTED-COIL-DESIGN-TO-BE-SKYLINE-STANDOUT'],['Continuous curved retail podium and hotel','Twisting white ribbon around glass tower','Stepped open hotel terraces'],'hero'),
  hotel('erawan-hotel','Grand Hyatt Erawan Bangkok','494 Ratchadamri Road','Ratchaprasong','siam',undefined,[826,496],[66,52],70,Math.PI/2,['central','erawan-shrine'],['https://www.hyatt.com/grand-hyatt/en-US/bangh-grand-hyatt-erawan-bangkok'],['Stepped ivory hotel crown','Deep green glazing and pilasters','Classical portico and Erawan shrine court']),
  hotel('eastin','Eastin Grand Hotel Sathorn','33/1 South Sathorn Road','Sathorn / Surasak','silom',undefined,[558,933],[42,40],111,0,['surasak','state'],['https://www.eastinhotelsresidences.com/eastingrandsathornbangkok/gallery'],['Slender grid-glazed tower','Projecting mid-height pool terrace','Station-facing entrance near Surasak']),
  {id:'river-city',name:'River City Bangkok',category:'architecture',address:'23 Soi Charoen Krung 24',neighborhood:'Si Phraya',region:'talatnoi',bank:'east',nearby:['oriental','hilton','icon'],map:[470,796],asset:'real-river-city-v1',tier:'major',access:'public-roadside',footprint:[74,48],height:25,yaw:-Math.PI/2,references:['https://rivercitybangkok.com/'],features:['Low riverfront arts mall','Broad arched glass opening','Deep vertical ribs and stepped terrace']},
  {id:'siam-center',name:'Siam Center / Siam Discovery',category:'architecture',address:'Rama I Road, Pathum Wan',neighborhood:'Siam',region:'siam',nearby:['paragon','mbk','siam'],map:[688,432],asset:'real-siam-center-v1',tier:'major',access:'public-roadside',footprint:[112,52],height:29,yaw:Math.PI,references:['https://www.siamdiscovery.co.th/','https://www.nendo.jp/en/works/siam-discovery/'],features:['Two distinct low retail volumes','Discovery stacked white display frames','Siam Center dark glazed frontage']},
  {id:'jim-thompson',name:'Jim Thompson House',category:'heritage',address:'6 Soi Kasemsan 2, Rama I Road',neighborhood:'Wang Mai / Siam',region:'siam',nearby:['mbk','siam-center'],map:[636,439],asset:'real-jim-thompson-v1',tier:'major',access:'public-roadside',footprint:[48,44],height:19,yaw:0,references:['https://jimthompsonhouse.org/'],features:['Cluster of elevated teak houses','Steep Thai gables','Garden court and raised connecting walkways']},
];
export const realPlace = (id?:string) => REAL_PLACES.find(p=>p.id===id);

/** Reserve authored sites BEFORE procedural rows. Keep graph/GPS registration
 * independent: the map pin is the physical plot; accessNode is an actual street. */
export function placeRealArchitecture(d:District) {
  const byId=new Map(d.nodes.map(n=>[n.id,n]));
  for(const p of REAL_PLACES) {
    const existing=d.landmarks.find(l=>l.id===p.id);
    if(existing)continue; // State Tower is a single physical building and save ID.
    const origin=toWorld(p.map), [w,depth]=p.footprint;
    let chosen:Obstacle|undefined;
    // Only small local nudges allowed. Never migrate a building to another district.
    for(const [dx,dz] of [[0,0],[0,-12],[0,12],[-12,0],[12,0],[0,-24],[0,24],[-24,0],[24,0]]){
      const o:Obstacle={x:origin.x+dx!,z:origin.z+dz!,w,d:depth,height:p.height,yaw:p.yaw,color:'#d9d6bf',landmarkId:p.id,regionId:p.region};
      const corners=[[-w/2,-depth/2],[-w/2,depth/2],[w/2,-depth/2],[w/2,depth/2]].map(([x,z])=>({x:o.x+Math.cos(p.yaw)*x!+Math.sin(p.yaw)*z!,z:o.z-Math.sin(p.yaw)*x!+Math.cos(p.yaw)*z!}));
      if(corners.some(q=>riverDistance(d,q)<d.riverWidth!/2+3))continue;
      if(d.roads.some(r=>orientedFootprintsOverlap(o,{x:(byId.get(r.a)!.x+byId.get(r.b)!.x)/2,z:(byId.get(r.a)!.z+byId.get(r.b)!.z)/2,w:r.width+8,d:Math.hypot(byId.get(r.a)!.x-byId.get(r.b)!.x,byId.get(r.a)!.z-byId.get(r.b)!.z)+4,yaw:Math.atan2(byId.get(r.b)!.x-byId.get(r.a)!.x,byId.get(r.b)!.z-byId.get(r.a)!.z),height:0,color:'#fff'})))continue;
      if(d.obstacles.some(q=>orientedFootprintsOverlap(o,q,5)))continue;
      chosen=o;break;
    }
    if(!chosen)throw Error(`Authored real place conflicts with city: ${p.id}`);
    const l:Landmark={x:chosen.x,z:chosen.z,plot:{x:chosen.x,z:chosen.z},size:Math.max(w,depth),id:p.id,name:p.name,kind:p.category==='hotel'?'hotel':p.category==='heritage'?'museum':'mall',yaw:p.yaw};
    const roads=d.roads.filter(r=>!r.bridge&&!r.destinationId&&!r.shortcut&&!r.corridor?.startsWith('real-arrival:'));
    const street=roads.map(r=>({r,...distanceToSegment(chosen,byId.get(r.a)!,byId.get(r.b)!)})).sort((a,b)=>a.distance-b.distance)[0]!;
    l.accessNode=[byId.get(street.r.a)!,byId.get(street.r.b)!].sort((a,b)=>Math.hypot(a.x-l.x,a.z-l.z)-Math.hypot(b.x-l.x,b.z-l.z))[0]!.id;
    d.obstacles.push(chosen);d.landmarks.push(l);
    // A short, explicitly fictional hotel driveway makes a river-facing property
    // reachable from Charoen Krung/Charoen Nakhon without moving it inland.
    const normal={x:Math.sin(p.yaw),z:Math.cos(p.yaw)};
    const end={x:l.x-normal.x*(depth/2+13),z:l.z-normal.z*(depth/2+13)};
    const candidates=[...new Set(roads.flatMap(r=>[r.a,r.b]))].map(id=>byId.get(id)!).filter(n=>(n.x-l.x)*normal.x+(n.z-l.z)*normal.z < -depth/2-8);
    const publicNode=candidates.sort((a,b)=>Math.hypot(a.x-end.x,a.z-end.z)-Math.hypot(b.x-end.x,b.z-end.z))[0]??byId.get(l.accessNode!)!;
    const length=Math.hypot(end.x-publicNode.x,end.z-publicNode.z);
    if(p.bank&&length>50){
      const lane:Obstacle={x:(end.x+publicNode.x)/2,z:(end.z+publicNode.z)/2,w:14,d:length,yaw:Math.atan2(end.x-publicNode.x,end.z-publicNode.z),height:0,color:'#eee'};
      const blocked=d.obstacles.some(o=>orientedFootprintsOverlap(lane,o,3));
      const crosses=d.roads.some(r=>{
        if(r.a===publicNode.id||r.b===publicNode.id)return false;
        const a=byId.get(r.a)!,b=byId.get(r.b)!;
        return orientedFootprintsOverlap(lane,{x:(a.x+b.x)/2,z:(a.z+b.z)/2,w:r.width+2,d:Math.hypot(a.x-b.x,a.z-b.z),yaw:Math.atan2(b.x-a.x,b.z-a.z),height:0,color:'#fff'});
      });
      const wet=Array.from({length:20},(_,i)=>({x:publicNode.x+(end.x-publicNode.x)*i/19,z:publicNode.z+(end.z-publicNode.z)*i/19})).some(q=>riverDistance(d,q)<d.riverWidth!/2+10);
      if(!blocked&&!crosses&&!wet){
        let previous=publicNode;
        for(let i=1;i<=Math.ceil(length/24);i++){
          const t=i/Math.ceil(length/24),n={id:`real-arrival:${p.id}:${i}`,x:publicNode.x+(end.x-publicNode.x)*t,z:publicNode.z+(end.z-publicNode.z)*t};
          d.nodes.push(n);byId.set(n.id,n);d.roads.push({a:previous.id,b:n.id,width:8,name:`${p.name} drop-off`,corridor:`real-arrival:${p.id}`,noTraffic:true,surface:'arrival'});previous=n;
        }
        l.accessNode=previous.id;
      }
    }
  }
}
