import fs from 'node:fs';
import {createBangkokWorld} from '../src/game/bangkok/world';
const d=createBangkokWorld();
const inside=(p:{x:number,z:number})=>p.x>-550&&p.x<180&&p.z>650&&p.z<1120;
const ns=new Map(d.nodes.map(n=>[n.id,n]));
const report={baseline:'14919cdc70e4cd832cb3cfbc124603c2385ad932',bounds:{minX:-550,maxX:180,minZ:650,maxZ:1120},landmarks:d.landmarks.filter(inside),sites:d.authoredSites?.filter(s=>inside(s.origin)),roads:d.roads.filter(r=>inside(ns.get(r.a)!)||inside(ns.get(r.b)!)).map(r=>({...r,from:ns.get(r.a),to:ns.get(r.b)})),buildings:d.buildings.filter(inside),obstacles:d.obstacles.filter(inside)};
fs.writeFileSync(process.env.SURVEY_OUTPUT??'../../docs/qa/bang-rak/validation/baseline-inventory.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({landmarks:report.landmarks.map(l=>({id:l.id,p:l.plot,access:ns.get(l.accessNode!)})),roads:report.roads.map(r=>({id:r.corridor,w:r.width,a:r.from,b:r.to})),buildings:report.buildings.length,sites:report.sites?.map(s=>({id:s.id,bounds:s.boundary}))},null,2));
