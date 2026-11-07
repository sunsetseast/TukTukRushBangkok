/** Individually composed sites. Real names require an exact source identity;
 * original tenants deliberately carry no claim of a real business/address. */
export type ChinatownSite = {
  id:string; name:string; thai:string; secondary:string; trade:number;
  composition:'heritageGold'|'goldTower'|'restaurant'|'tea'|'bakery'|'market'|'cafe'|'warehouse'|'hotel';
  real:boolean; source:string; reference?:string; confidence:'source-identity'|'original';
};
export const CHINATOWN_SITES:ChinatownSite[] = [
 {id:'tang-to-kang',name:'Tang To Kang Gold Shop',thai:'ห้างทองตั้งโต๊ะกัง',secondary:'陳焯剛',trade:0,composition:'heritageGold',real:true,source:'osm:way/305102098:0:4',reference:'https://mapcarta.com/W305102098',confidence:'source-identity'},
 {id:'grand-china',name:'Grand China Bangkok — street podium',thai:'แกรนด์ ไชน่า',secondary:'GRAND CHINA',trade:7,composition:'hotel',real:true,source:'osm:way/305102108:0:4',reference:'https://www.grandchina.com/contact-us/',confidence:'source-identity'},
 {id:'chinatown-hotel',name:'Chinatown Hotel',thai:'ไชน่าทาวน์ โฮเทล',secondary:'CHINATOWN HOTEL',trade:7,composition:'hotel',real:true,source:'osm:way/305102087:0:4',reference:'https://www.agoda.com/en-us/chinatown-hotel/hotel/bangkok-th.html',confidence:'source-identity'},
 {id:'rueng-gold',name:'Rueng Gold (original)',thai:'รุ่งเรืองทอง',secondary:'金行',trade:0,composition:'goldTower',real:false,source:'osm:way/449024152:0:2',confidence:'original'},
 {id:'western-tea',name:'Western tea merchant (original)',thai:'ร้านน้ำชา',secondary:'茶莊',trade:2,composition:'tea',real:false,source:'osm:way/1354872501:0:8',confidence:'original'},
 {id:'corner-bakery',name:'Corner bakery (original)',thai:'ขนมอบ',secondary:'餅家',trade:11,composition:'bakery',real:false,source:'osm:way/1021446936:0:2',confidence:'original'},
 {id:'market-hall',name:'Market hall (original)',thai:'ร้านผลไม้',secondary:'水果',trade:9,composition:'market',real:false,source:'osm:way/1504508499:0:1',confidence:'original'},
 {id:'wok-house',name:'Wok house (original)',thai:'อาหารทะเล',secondary:'海鮮',trade:4,composition:'restaurant',real:false,source:'osm:way/449024006:0:0',confidence:'original'},
 {id:'noodle-house',name:'Noodle house (original)',thai:'ก๋วยเตี๋ยว',secondary:'麵家',trade:1,composition:'restaurant',real:false,source:'osm:way/1144273181:0:1',confidence:'original'},
 {id:'corner-cafe',name:'Corner cafe (original)',thai:'กาแฟสด',secondary:'COFFEE',trade:3,composition:'cafe',real:false,source:'osm:way/1021247410:0:2',confidence:'original'},
 {id:'songwat-merchant',name:'Song Wat merchant house (original)',thai:'ร้านค้าทรงวาด',secondary:'商行',trade:8,composition:'warehouse',real:false,source:'osm:way/1053934650:0:0',confidence:'original'},
 {id:'songwat-cafe',name:'Song Wat courtyard cafe (original)',thai:'กาแฟทรงวาด',secondary:'COFFEE',trade:3,composition:'cafe',real:false,source:'osm:way/586421834:0:0',confidence:'original'},
 {id:'songwat-tea',name:'Song Wat tea merchant (original)',thai:'ใบชา',secondary:'茶莊',trade:2,composition:'tea',real:false,source:'osm:way/1534283453:0:0',confidence:'original'},
];
const sites=new Map(CHINATOWN_SITES.map((s,i)=>[s.source,{...s,sign:12+i}]));
export const chinatownSite=(id:string)=>sites.get(id);
