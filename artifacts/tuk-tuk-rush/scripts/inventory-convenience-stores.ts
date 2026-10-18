import fs from 'node:fs';
import { createBangkokWorld, toMap } from '../src/game/bangkok/world';
import { planConvenienceStores } from '../src/game/bangkok/convenienceStores';
import { CONVENIENCE_BRAND } from '../src/game/bangkok/storeBrand';

const d=createBangkokWorld(),stores=planConvenienceStores(d);
const root=new URL('../../../docs/qa/geographic-city-reconstruction/',import.meta.url);
fs.mkdirSync(root,{recursive:true});
fs.writeFileSync(new URL('store-source-inventory.json',root),JSON.stringify({
  brand:CONVENIENCE_BRAND,
  artwork:{local:'artifacts/tuk-tuk-rush/public/brands/7-eleven-prototype.svg',type:'Recreated original vector/canvas rendition',runtimeAtlas:{width:512,height:256,shared:true,hotlinked:false}},
  placement:{claim:'Representative compressed-neighborhood premises; not surveyed real branch coordinates',minimumSeparationGameMetres:220,convertsExistingPremises:true},
  sources:[
    {url:'https://www.7eleven.co.th/find-store?filter=s',publisher:'7-Eleven Thailand',use:'Official brand identity and Thai store network context'},
    {url:'https://www.cpall.co.th/wp-content/uploads/2025/03/CP_ALL_56-1_-OneReport_2024_EN_25MAR-Final.pdf',publisher:'CP ALL',use:'Distinct premises in residential, office, academic and service-station settings'},
    {url:'https://www.bizzboard.com/business/7-eleven-สาขา-สุขุมวิท-24-อะริสตั้/',publisher:'BiZZBoard branch photography',use:'Street-level Sukhumvit 24 glass frontage and fascia'},
    {url:'https://unsplash.com/photos/a-7-eleven-store-is-busy-at-night-TO9WumSU650',publisher:'Ainur Iman / Unsplash',use:'Nighttime illuminated sign, occupied glazing and narrow street context'},
    {url:'https://www.businesstimes.com.sg/international/asean/billionaires-muscle-thai-convenience-store-kings-domain',publisher:'The Business Times',use:'Bangkok compact storefront and adjacent street trade'},
  ],
  stores:stores.map(({parcel,road,...s})=>({...s,map:toMap(s.front),parcel:{x:parcel.x,z:parcel.z,w:parcel.w,d:parcel.d,height:parcel.height,yaw:parcel.yaw},road:{a:road.a,b:road.b,name:road.name,corridor:road.corridor}})),
},null,2)+'\n');
console.log(JSON.stringify({stores:stores.length,output:'docs/qa/geographic-city-reconstruction/store-source-inventory.json'}));
