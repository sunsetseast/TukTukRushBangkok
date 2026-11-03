/** Authored, lightweight Bangkok street fleet. Every part is instanced:
 * no individual React components, geometry or materials per moving vehicle.
 * World axes: X east, Z south, Y up; local +Z is vehicle forward.
 */
import * as T from "three";
import type { TrafficVehicle } from "./traffic";

type Batch = {
  mesh: T.InstancedMesh<T.BufferGeometry, T.Material>;
  count: number;
  max: number;
};
export type BangkokFleetVisual = {
  root: T.Group;
  render: (vehicles: readonly TrafficVehicle[]) => void;
  dispose: () => void;
  readonly drawBatches: number;
  readonly maxVehicles: number;
};

const white=new T.Color("#fbf7ed");
const midnight=new T.Color("#17232d");
const darkGlass=new T.Color("#244451");
const roadRubber=new T.Color("#202a2e");
const steel=new T.Color("#a7b3b8");
const red=new T.Color("#ed3340");
const amber=new T.Color("#ffc76c");
const cyan=new T.Color("#e8fff9");
const taxiPink=new T.Color("#ff62a4");
const taxiGreen=new T.Color("#42b983");
const taxiYellow=new T.Color("#ffe467");
const sedanWhite=new T.Color("#e9f1f5");
const sedanBlue=new T.Color("#526e9c");
const sedanGrey=new T.Color("#9ea8b5");
const tuktukBlue=new T.Color("#1952b2");
const tuktukGreen=new T.Color("#21a9a3");
const tuktukYellow=new T.Color("#f5c44e");
const motorcycleBlue=new T.Color("#3b73cc");
const motorcycleRed=new T.Color("#b93e49");
const colors = {
  taxi:[taxiPink,taxiGreen,taxiYellow],
  car:[sedanWhite,sedanGrey,sedanBlue],
  tuktuk:[tuktukBlue,tuktukGreen,tuktukYellow],
  motorcycle:[motorcycleBlue,motorcycleRed,midnight],
};
const yRotation=new T.Euler(0,0,0);
export function createBangkokFleetVisual(maxVehicles=16):BangkokFleetVisual {
  const root=new T.Group();
  root.name="GeographicBangkokMovingVehicles";
  const batches=new Map<string,Batch>();
  const create=(key:string,geometry:T.BufferGeometry,material:T.Material,multiplier=1)=>{
    const max=maxVehicles*multiplier;
    const mesh=new T.InstancedMesh(geometry,material,max);
    mesh.name="Traffic:"+key;
    mesh.count=0;
    mesh.frustumCulled=false; // 16 locally-bounded movers; no per-frame volume rebuild
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    root.add(mesh);
    batches.set(key,{mesh,count:0,max});
  };
  const mat=(emissive=false)=>new T.MeshStandardMaterial({
    color:"#ffffff",roughness:emissive?.36:.57,
    metalness:emissive?.05:.26,
    ...(emissive?{emissive:"#fff5cf",emissiveIntensity:.14}:{}),
  });
  const box=(w:number,h:number,d:number)=>new T.BoxGeometry(w,h,d);
  const sphere=(r:number)=>new T.SphereGeometry(r,8,6);
  const wheel=(r:number,thick:number)=>{
    const geo=new T.CylinderGeometry(r,r,thick,10);
    geo.rotateZ(Math.PI/2);
    return geo;
  };
  create("chassis",box(1.68,.55,3.1),mat());
  create("carCabin",box(1.38,.56,1.55),mat());
  create("windshield",box(1.28,.46,.06),mat());
  create("carWindows",box(.045,.39,1.26),mat(),2);
  create("bumpers",box(1.56,.22,.16),mat(),2);
  create("carLights",box(.29,.14,.08),mat(true),4);
  create("carWheels",wheel(.32,.20),mat(),4);
  create("taxiRoofSign",box(.65,.25,.24),mat());
  create("motorChassis",box(.52,.43,1.42),mat());
  create("motorTank",box(.56,.32,.6),mat());
  create("motorSeat",box(.39,.13,.55),mat());
  create("motorRider",box(.42,.68,.33),mat());
  create("motorHelmet",sphere(.26),mat());
  create("motorWheels",wheel(.34,.14),mat(),2);
  create("tukBase",box(1.34,.46,2.35),mat());
  create("tukCab",box(1.14,.46,.95),mat());
  create("tukCanopy",box(1.51,.17,2.08),mat());
  create("tukSeat",box(1.06,.35,.54),mat());
  create("tukPillars",box(.08,1.18,.08),mat(),4);
  create("tukWheels",wheel(.32,.17),mat(),3);
  create("tukLights",box(.28,.21,.08),mat(true),2);
  const dummy=new T.Object3D();
  const renderPart=(
    key:string,v:TrafficVehicle,
    x:number,y:number,z:number,color:T.Color,
    scale?:[number,number,number],
  )=>{
    const batch=batches.get(key)!;
    if(batch.count>=batch.max)
      throw Error("Bangkok AI vehicle part exceeds preallocated GPU pool: "+key);
    const i=batch.count++;
    const cs=Math.cos(v.heading), sn=Math.sin(v.heading);
    dummy.position.set(v.x+x*cs+z*sn,v.y+y,v.z+z*cs-x*sn);
    yRotation.set(0,v.heading,0);
    dummy.rotation.copy(yRotation);
    dummy.scale.set(...(scale??[1,1,1]));
    dummy.updateMatrix();
    batch.mesh.setMatrixAt(i,dummy.matrix);
    batch.mesh.setColorAt(i,color);
  };
  const render=(vehicles:readonly TrafficVehicle[])=>{
    if(vehicles.length>maxVehicles)throw Error("Mobile Bangkok AI traffic fleet exceeded capacity");
    for(const b of batches.values())b.count=0;
    for(const v of vehicles) {
      const colorSet=colors[v.kind];
      const base=colorSet[v.id%colorSet.length]!;
      if(v.kind==="car"||v.kind==="taxi"){
        renderPart("chassis",v,0,.62,0,base);
        renderPart("carCabin",v,0,1.15,-.18,base);
        renderPart("windshield",v,0,1.18,.64,darkGlass);
        for(const x of [-.70,.70]){
          renderPart("carWindows",v,x,1.2,-.16,darkGlass);
          for(const z of [-.98,.98])renderPart("carWheels",v,x,.33,z,roadRubber);
          for(const z of [-1.51,1.51]){
            const front=z>0;
            renderPart("carLights",v,x, .63,z,front?cyan:red);
          }
        }
        for(const z of [-1.56,1.56])renderPart("bumpers",v,0,.41,z,steel);
        if(v.kind==="taxi")renderPart("taxiRoofSign",v,0,1.61,.10,white);
      }else if(v.kind==="motorcycle"){
        renderPart("motorChassis",v,0,.60,0,base);
        renderPart("motorTank",v,0,.83,.25,base);
        renderPart("motorSeat",v,0,.86,-.35,midnight);
        renderPart("motorRider",v,0,1.34,-.26,sedanBlue);
        renderPart("motorHelmet",v,0,1.89,-.22,white);
        for(const z of [-.68,.68])renderPart("motorWheels",v,0,.35,z,roadRubber);
      }else{
        renderPart("tukBase",v,0,.61,0,base);
        renderPart("tukCab",v,0,1.02,.54,base);
        renderPart("tukCanopy",v,0,1.94,-.07,tuktukYellow);
        renderPart("tukSeat",v,0,1.02,-.58,midnight);
        for(const x of [-.58,.58])for(const z of [-.86,.78])
          renderPart("tukPillars",v,x,1.35,z,steel);
        for(const x of [-.59,.59])renderPart("tukWheels",v,x,.34,-.77,roadRubber);
        renderPart("tukWheels",v,0,.34,.84,roadRubber);
        for(const x of [-.48,.48])
          renderPart("tukLights",v,x,.77,1.17,amber);
      }
    }
    for(const b of batches.values()){
      b.mesh.count=b.count;
      if(!b.count)continue;
      b.mesh.instanceMatrix.needsUpdate=true;
      if(b.mesh.instanceColor)b.mesh.instanceColor.needsUpdate=true;
    }
  };
  const dispose=()=>{
    for(const b of batches.values()){
      b.mesh.geometry.dispose();
      b.mesh.material.dispose();
      b.mesh.dispose();
      root.remove(b.mesh);
    }
  };
  return {root,render,dispose,drawBatches:batches.size,maxVehicles};
}
