import fs from 'node:fs';
import {createBangkokWorld,toMap} from '../src/game/bangkok/world';
import {GEOGRAPHIC_REFERENCES,geographicOffset} from '../src/game/bangkok/geography';
import {REAL_PLACES} from '../src/game/bangkok/realPlaces';
import {auditStreetEdges} from '../src/game/bangkok/streetEdges';
import {planConvenienceStores} from '../src/game/bangkok/convenienceStores';
const d=createBangkokWorld(),edges=auditStreetEdges(d),open=edges.filter(e=>e.kind==='open');
const out={base:'9e24ada',coordinateSystem:'Compressed design x east/y south; world=(design-[500,600])*4; nominal real coordinates separate from authored residuals',counts:{nodes:d.nodes.length,roads:d.roads.length,buildings:d.buildings.length,landmarks:d.landmarks.length,authoredSites:d.authoredSites!.length,realCompounds:d.authoredSites!.filter(s=>REAL_PLACES.some(p=>p.id===s.id&&p.id!=='state')).length,realBuildingMasses:d.authoredSites!.filter(s=>REAL_PLACES.some(p=>p.id===s.id&&p.id!=='state')).reduce((n,s)=>n+s.solids.length,0),publicSpaces:d.publicSpaces!.length,stores:planConvenienceStores(d).length,openEdges:open.length,samples:edges.length},geographicReferences:GEOGRAPHIC_REFERENCES.map(r=>({...r,projectionResidual:geographicOffset(r)})),landmarks:d.landmarks.map(l=>({...l,marker:toMap(l),plotMap:toMap(l.plot??l)})),publicSpaces:d.publicSpaces,authoredSites:d.authoredSites};
fs.writeFileSync(new URL('../../../docs/qa/geographic-city-reconstruction/site-inventory.json',import.meta.url),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out.counts));
