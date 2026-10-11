import assert from "node:assert/strict";
import { createDistrict } from "../src/game/world";
import { TrafficSystem } from "../src/game/traffic";
import { buildYaowaratBlades,TRADE,tradeKeys } from "../src/game/yaowaratSignLayers";
import type { FacadeApi,Style } from "../src/game/miniatureFacade";

const keys=new Set<string>();
for(const style of Object.keys(TRADE) as Style[]) {
  for(const variant of [0,1]) {
    const labels=TRADE[style][variant]!;
    assert.equal(labels.length,2);
    labels.forEach(label=>assert(/\p{Script=Han}/u.test(label),"Traditional Chinese trade label expected"));
    for(const k of tradeKeys(style,variant)) {
      assert(!keys.has(k),"Each trade sign has a unique atlas key");
      keys.add(k);
    }
  }
}
assert.equal(keys.size,20);

const shopDimensions = [12.8,15.6,21.5];
for(const H of shopDimensions) {
  const placements:{y:number;h:number;faceWidth:number}[]=[];
  let geometries=0, fascia=0;
  const api:FacadeApi = {
    add: (_m,_c,_geo,_u,y,_v) => { geometries++; assert(y>=0,"Valid prop elevation"); },
    sign: (_id,_u,y,_v,w,h) => {
      fascia++; assert(y>5 && h>0 && w>0);
    },
    vsign: (_id,_u,y,_v,w,h,faceWidth) => {
      placements.push({y,h,faceWidth:faceWidth??0});
    },
  };
  buildYaowaratBlades(api,{W:11.8,D:12.5,H,i:5,ids:[41,42]});
  assert(geometries>10 && fascia===1,"Actual 3D cabinet and fascia geometry");
  assert(placements.length>=1,"Sign cluster remains visible at townhouse heights");
  for(const p of placements) {
    assert(p.y-p.h/2>=5.0,"All sign and bracket faces clear vehicle headroom");
    assert(p.faceWidth>=0.37,"Readable texture must stay on OUTSIDE of cabinet");
  }
}
const district=createDistrict();
const cars=new TrafficSystem(district).create();
assert.equal(cars.length,16,"Bounded but livelier Bangkok main-road traffic");
assert(cars.filter(c=>c.kind==="motorcycle").length>=5,"Motorcycle traffic belongs in Bangkok");
console.log("PASS sign trade labels, exterior face mounts, high clearances, traffic density");
