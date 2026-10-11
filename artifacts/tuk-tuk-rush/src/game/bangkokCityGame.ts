import * as T from "three";
import { BangkokNetwork,project,segmentProjection,type Point,type Landmark,type RoadSegment } from "./bangkokNetwork";
import {loadArt} from "./assets";
import {buildTuk} from "./tukMesh";
/**
 * Bangkok City Tour: road-locked, real-scale 3D arcade driving with missions.
 * Geography / bridge intersections from OSM; colorful buildings and landmarks
 * are ORIGINAL stylizations, not surveyed facades or Disney-fied photographs.
 * OSM data © OpenStreetMap contributors under ODbL 1.0.
 */
const el=(id:string)=>document.getElementById(id)!;
const km=(m:number)=>m>=1000?(m/1000).toFixed(1)+" km":Math.round(m)+" m";
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
const mat=(c:string)=>new T.MeshLambertMaterial({color:c,side:T.DoubleSide});
const tile=(x:number,z:number)=>Math.floor(x/320)+":"+Math.floor(z/320);
type Tile={mesh:T.Mesh;pos:Point};
class CityScene{
 scene=new T.Scene();
 camera=new T.PerspectiveCamera(63,1,0.2,1150);
 renderer:T.WebGLRenderer;
 tiles:Tile[]=[];
 rivers:{obj:T.Object3D;center:Point}[]=[];
 places:{mark:Landmark;group:T.Group}[]=[];
 player:T.Group=new T.Group();
 buildings:T.InstancedMesh;
 roofs:T.InstancedMesh;
 target=new T.Group();
 route=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:"#ffcc55",transparent:true,opacity:0.8}));
 cam=new T.Vector3();
 look=new T.Vector3();
 dummy=new T.Object3D();
 lastBuilding:Point={x:1e9,z:1e9};
 lastTile="";
 private art:{dispose:()=>void}|null=null;
 private spokes:T.Object3D[]=[];
 constructor(readonly graph:BangkokNetwork,readonly poi:Landmark[],water:Record<string,unknown>,canvas:HTMLCanvasElement){
  this.renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:"high-performance"});
  this.renderer.outputColorSpace=T.SRGBColorSpace;
  this.renderer.setClearColor("#a7c7dd");
  this.scene.background=new T.Color("#b9cee2");
  this.scene.fog=new T.Fog("#b9cee2",380,980);
  this.scene.add(new T.HemisphereLight("#d9edff","#9f947f",2));
  const sun=new T.DirectionalLight("#ffc78f",2);sun.position.set(-160,260,110);this.scene.add(sun);
  const ground=new T.Mesh(new T.PlaneGeometry(17000,17000),mat("#c2bea0"));
  ground.rotation.x=-Math.PI/2;ground.position.y=-0.8;this.scene.add(ground);
  this.buildings=new T.InstancedMesh(new T.BoxGeometry(1,1,1),mat("#faf1da"),250);
  this.buildings.count=0;this.buildings.instanceMatrix.setUsage(T.DynamicDrawUsage);
  this.roofs=new T.InstancedMesh(new T.BoxGeometry(1,1,1),mat("#f2c77f"),250);
  this.roofs.count=0;this.roofs.instanceMatrix.setUsage(T.DynamicDrawUsage);
  this.scene.add(this.buildings,this.roofs);
  this.makeRoads();this.makeWater(water);
  for(const p of poi)this.makeLandmark(p);
  const beacon=new T.Mesh(new T.CylinderGeometry(2.0,2.0,80,10,1,true),
   new T.MeshBasicMaterial({color:"#f8c566",transparent:true,opacity:0.3,depthWrite:false,side:T.DoubleSide}));
  beacon.position.y=40;
  const circle=new T.Mesh(new T.TorusGeometry(14,0.5,6,32).rotateX(Math.PI/2),
   new T.MeshBasicMaterial({color:"#ffd268"}));
  circle.position.y=0.7;this.target.add(beacon,circle);this.scene.add(this.target);
  this.route.frustumCulled=false;this.scene.add(this.route);
  this.player=this.fallbackTuk();this.scene.add(this.player);
 }
 private fallbackTuk(){
  const root=new T.Group();
  const yellow=mat("#ffe16c"),green=mat("#1a8883"),dark=mat("#293440");
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:T.Material)=>{
   const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);
   mesh.position.set(x,y,z);root.add(mesh);
  };
  box(1.7,0.65,2.7,0,0.98,0,yellow);
  box(1.45,1.28,0.95,0,1.88,-0.55,green);
  box(1.43,0.17,2.0,0,2.56,0,dark);
  for(const [x,z] of [[-0.88,-0.9],[0.88,-0.9],[0,1.07]]){
   const wheel=new T.Mesh(new T.CylinderGeometry(0.37,0.37,0.21,14).rotateZ(Math.PI/2),dark);
   wheel.position.set(x,0.47,z);root.add(wheel);this.spokes.push(wheel);
  }
  return root;
 }
 async loadHero(){
  try{
   const bundle=await loadArt();
   const root=bundle.hero.clone(true);
   const tuk=buildTuk(root,bundle.textures);
   this.scene.remove(this.player);this.player=root;this.scene.add(root);
   this.spokes=tuk.spins;
   this.art=bundle;
  }catch(e){console.warn("Keeping the bundled fallback tuk-tuk",e);}
 }
 private makeRoads(){
  const chunks=new Map<string,{vertices:number[];colors:number[]}>();
  const add=(s:RoadSegment,width:number,col:string,y:number)=>{
   const length=s.length,dx=(s.x2-s.x1)/length,dz=(s.z2-s.z1)/length;
   const nx=-dz*width/2,nz=dx*width/2;
   const pos=[
    s.x1-nx,y,s.z1-nz,s.x1+nx,y,s.z1+nz,s.x2+nx,y,s.z2+nz,
    s.x1-nx,y,s.z1-nz,s.x2+nx,y,s.z2+nz,s.x2-nx,y,s.z2-nz
   ];
   const key=tile((s.x1+s.x2)/2,(s.z1+s.z2)/2);
   if(!chunks.has(key))chunks.set(key,{vertices:[],colors:[]});
   const k=chunks.get(key)!;k.vertices.push(...pos);
   const c=new T.Color(col);
   for(let j=0;j<6;j++)k.colors.push(c.r,c.g,c.b);
  };
  for(const s of this.graph.segments){
   const primary=["primary","trunk","secondary"].includes(s.className);
   add(s,s.w,s.bridge?"#8b8a88":primary?"#505a60":"#636c70",s.bridge?0.33:0.02);
   if(primary&&s.length>12)add(s,0.11,"#e4c98c",s.bridge?0.35:0.04);
  }
  const roadMaterial=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide});
  for(const [key,data] of chunks){
   const geom=new T.BufferGeometry();
   geom.setAttribute("position",new T.Float32BufferAttribute(data.vertices,3));
   geom.setAttribute("color",new T.Float32BufferAttribute(data.colors,3));
   geom.computeBoundingSphere();
   const mesh=new T.Mesh(geom,roadMaterial);mesh.visible=false;this.scene.add(mesh);
   const coords=key.split(":").map(Number);
   this.tiles.push({mesh,pos:{x:(coords[0]!+0.5)*320,z:(coords[1]!+0.5)*320}});
  }
 }
 private makeWater(input:Record<string,unknown>){
  const features=(input.features||[]) as {geometry:{type:string;coordinates:[number,number][]};properties:Record<string,unknown>}[];
  const material=new T.MeshLambertMaterial({color:"#3297a7",side:T.DoubleSide,roughness:0.55});
  for(const feature of features.slice(0,800)){
   if(feature.geometry.type!=="LineString")continue;
   const pts=feature.geometry.coordinates.map(p=>project(p[0],p[1]));
   const width=String(feature.properties.waterway)==="canal"?13:92;
   const vertices:number[]=[];
   for(let i=1;i<pts.length;i++){
    const a=pts[i-1]!,b=pts[i]!,l=distance(a,b);if(l<0.3)continue;
    const nx=-(b.z-a.z)/l*width/2,nz=(b.x-a.x)/l*width/2,y=-0.48;
    vertices.push(a.x-nx,y,a.z-nz,a.x+nx,y,a.z+nz,b.x+nx,y,b.z+nz,
     a.x-nx,y,a.z-nz,b.x+nx,y,b.z+nz,b.x-nx,y,b.z-nz);
   }
   if(!vertices.length)continue;
   const geometry=new T.BufferGeometry();
   geometry.setAttribute("position",new T.Float32BufferAttribute(vertices,3));
   const mesh=new T.Mesh(geometry,material);mesh.visible=false;this.scene.add(mesh);
   this.rivers.push({obj:mesh,center:pts[Math.floor(pts.length/2)]!});
  }
 }
 private makeLandmark(p:Landmark){
  const root=new T.Group();root.position.set(p.point.x,0,p.point.z);
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,c:string)=>{
   const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat(c));m.position.set(x,y,z);root.add(m);
  };
  const cone=(r:number,h:number,x:number,y:number,z:number,c:string)=>{
   const m=new T.Mesh(new T.ConeGeometry(r,h,8),mat(c));m.position.set(x,y,z);root.add(m);
  };
  if(p.id==="wat-arun"){
   for(let i=0;i<7;i++)box(18-i*2,7,18-i*2,0,4+i*7,0,"#d8c5ab");
   cone(4,13,0,58,0,"#e8bc67");
   for(const x of [-17,17])for(const z of [-17,17])cone(5,19,x,10,z,"#e7d1aa");
  }else if(p.id==="wat-pho"){
   box(44,9,24,0,4.5,0,"#ead5ae");cone(21,15,0,17,0,"#c7895d");
   box(43,1,9,26,1,0,"#d7a254");
   const buddha=new T.Mesh(new T.CapsuleGeometry(4,32,8,14).rotateZ(Math.PI/2),mat("#e1b153"));
   buddha.position.set(26,7,0);root.add(buddha);
  }else if(p.id==="iconsiam"){
   box(85,18,65,0,9,0,"#d5e0de");
   for(let i=0;i<5;i++)box(79-i*7,4,61-i*6,0,20+i*6,0,i%2?"#d1bdac":"#a5b8ba");
   box(18,27,28,27,48,3,"#6aadc2");
  }else if(p.id==="siam-paragon"||p.id==="centralworld"){
   box(78,19,49,0,9.5,0,"#ede7d7");
   for(const x of [-23,0,23])box(18,33,28,x,37,0,"#7eafc3");
  }else if(p.id==="chinatown-gate"){
   for(const x of [-9,9])box(3,16,3,x,8,0,"#b83338");
   box(24,2,7,0,16,0,"#e3b953");cone(15,7,0,21,0,"#af3837");
  }else if(p.category==="temple"||p.category==="palace"){
   box(33,13,28,0,6.5,0,"#eee0c8");cone(20,15,0,21,0,"#daae5f");
   for(const x of [-18,18])box(4,16,4,x,8,0,"#d7a35a");
  }else if(p.id==="rama-viii-bridge"){
   box(6,61,6,0,30,0,"#d7c9b5");cone(5,12,0,67,0,"#dab06e");
  }else if(p.category==="shopping")box(45,22,32,0,11,0,"#b5c6c5");
  else if(p.category==="monument")cone(8,24,0,12,0,"#c49b74");
  else box(28,12,24,0,6,0,"#c7b6a5");
  const canvas=document.createElement("canvas");canvas.width=512;canvas.height=96;
  const c=canvas.getContext("2d")!;
  c.fillStyle="#182a3deb";c.fillRect(0,0,512,96);
  c.font="bold 28px system-ui";c.textAlign="center";c.textBaseline="middle";c.fillStyle="#fff1cf";
  c.fillText(p.name.length>35?p.name.slice(0,34):p.name,256,49,480);
  const label=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(canvas),transparent:true}));
  label.position.y=p.id==="wat-arun"?89:64;label.scale.set(52,10,1);root.add(label);
  root.visible=false;this.scene.add(root);this.places.push({mark:p,group:root});
 }
 private buildingRefresh(position:Point){
  const candidates=this.graph.nearby(position,435);let count=0;
  const sorted=Array.from(candidates).map(i=>this.graph.segments[i]!)
   .sort((a,b)=>distance({x:(a.x1+a.x2)/2,z:(a.z1+a.z2)/2},position)-
     distance({x:(b.x1+b.x2)/2,z:(b.z1+b.z2)/2},position));
  const colors=["#ddaa91","#d6c6a5","#bed0b5","#cad2c7","#e5beb2","#b7c0d8"];
  const seen=new Set<string>();
  const siam=distance(position,project(100.535,13.7468))<1700;
  for(const s of sorted){
   if(count>=235)break;
   if(s.length<8||s.bridge)continue;
   const dx=(s.x2-s.x1)/s.length,dz=(s.z2-s.z1)/s.length;
   for(let t=8;t<s.length;t+=22)for(const side of [-1,1]){
    if(count>=235)break;
    const off=s.w/2+11+(count%4);
    const x=s.x1+dx*t-side*dz*off,z=s.z1+dz*t+side*dx*off;
    if(distance({x,z},position)>390)continue;
    const key=Math.round(x/13)+":"+Math.round(z/13);
    if(seen.has(key))continue;seen.add(key);
    if(this.places.some(p=>distance(p.mark.point,{x,z})<48))continue;
    const nearby=this.graph.nearest({x,z},false,36);
    if(nearby&&nearby.d<nearby.segment.w/2+3)continue;
    const height=siam?16+(count*13%49):9+(count*7%22);
    const w=8+(count*3%7),d=9+(count*5%8);
    const obj=this.dummy;obj.position.set(x,height/2,z);
    obj.rotation.y=Math.atan2(dx,dz);obj.scale.set(w,height,d);obj.updateMatrix();
    this.buildings.setMatrixAt(count,obj.matrix);
    this.buildings.setColorAt(count,new T.Color(colors[count%colors.length]!));
    obj.position.y=height+0.45;obj.scale.set(w+0.8,0.9,d+0.8);obj.updateMatrix();
    this.roofs.setMatrixAt(count,obj.matrix);
    this.roofs.setColorAt(count,new T.Color(count%3===0?"#a46b56":"#d1b077"));count++;
   }
  }
  this.buildings.count=count;this.roofs.count=count;
  this.buildings.instanceMatrix.needsUpdate=true;this.roofs.instanceMatrix.needsUpdate=true;
  if(this.buildings.instanceColor)this.buildings.instanceColor.needsUpdate=true;
  if(this.roofs.instanceColor)this.roofs.instanceColor.needsUpdate=true;
 }
 setRoute(nodes:number[],goal:Landmark){
  const coords:number[]=[];
  for(const n of nodes){
   const p=this.graph.nodes[n]!;
   coords.push(p.x,0.6,p.z);
  }
  this.route.geometry.dispose();
  this.route.geometry=new T.BufferGeometry();
  if(coords.length>=6)this.route.geometry.setAttribute("position",new T.Float32BufferAttribute(coords,3));
  this.route.visible=coords.length>=6;
  this.target.position.set(goal.road.x,0.5,goal.road.z);
 }
 update(pos:Point,heading:number,speed:number,dt:number,quality:"fast"|"pretty"){
  this.player.position.set(pos.x,0.1,pos.z);this.player.rotation.y=heading;
  for(const w of this.spokes)w.rotation.x+=dt*speed/0.38;
  const x=Math.sin(heading),z=Math.cos(heading);
  this.cam.lerp(new T.Vector3(pos.x-x*12,6.2,pos.z-z*12),clamp(dt*7,0,1));
  this.look.lerp(new T.Vector3(pos.x+x*13,2.3,pos.z+z*13),clamp(dt*8,0,1));
  this.camera.position.copy(this.cam);this.camera.lookAt(this.look);
  const key=tile(pos.x,pos.z);
  if(key!==this.lastTile){
   this.lastTile=key;
   const far=quality==="fast"?460:680;
   for(const c of this.tiles)c.mesh.visible=Math.abs(c.pos.x-pos.x)<far&&Math.abs(c.pos.z-pos.z)<far;
   for(const w of this.rivers)w.obj.visible=distance(w.center,pos)<1300;
   for(const p of this.places)p.group.visible=distance(p.mark.point,pos)<(quality==="fast"?740:980);
  }
  if(distance(pos,this.lastBuilding)>150){
   this.buildingRefresh(pos);this.lastBuilding={...pos};
  }
  this.renderer.render(this.scene,this.camera);
 }
 resize(w:number,h:number,quality:"fast"|"pretty"){
  this.renderer.setPixelRatio(quality==="fast"?1:Math.min(1.5,window.devicePixelRatio||1));
  this.renderer.setSize(w,h,false);this.camera.aspect=w/Math.max(1,h);this.camera.updateProjectionMatrix();
 }
 dispose(){this.art?.dispose();this.renderer.dispose();}
}
type Control="go"|"brake"|"left"|"right"|"boost";
class BangkokGame {
 net!:BangkokNetwork;pois:Landmark[]=[];
 world!:CityScene;
 pos:Point={x:0,z:0};heading=0;speed=0;
 keys=new Set<string>();touch=new Set<Control>();
 current:Landmark|null=null;route:number[]=[];
 score=0,earnings=0,stamps=new Set<string>();
 countdown=720;gameOn=false;mode:"tour"|"rush"="tour";
 lastTime=0,lastRoute=0,lastUI=0;quality:"fast"|"pretty"="pretty";
 boost=100;horn=0;nearestStreet="";
 private mapCtx=(el("city-minimap") as HTMLCanvasElement).getContext("2d")!;
 async init(){
  try{
   const data=await BangkokNetwork.load();
   this.net=data.network;this.pois=data.landmarks;
   this.world=new CityScene(this.net,this.pois,data.water,el("city-canvas") as HTMLCanvasElement);
   const start=this.net.nearest(project(100.5099857,13.7403072),true,1000);
   if(!start)throw Error("Yaowarat has no connected drivable roads in imported map.");
   this.pos={...start.point};
   this.heading=Math.atan2(start.segment.x2-start.segment.x1,start.segment.z2-start.segment.z1);
   const status=el("city-status");
   status.textContent="CITY READY · "+this.net.segments.length.toLocaleString()+" real street segments · "+this.pois.filter(x=>x.accessible).length+" reachable landmarks";
   this.populatePlaces();
   this.events();this.resize();
   window.addEventListener("resize",()=>this.resize());
   document.addEventListener("visibilitychange",()=>{if(document.hidden)this.gameOn=false});
   window.addEventListener("blur",()=>this.keys.clear());
   this.world.loadHero();
   requestAnimationFrame(this.frame);
  }catch(e){
   el("city-status").textContent=String(e instanceof Error?e.message:e);
   el("city-status").classList.add("error");console.error(e);
  }
 }
 private events(){
  document.querySelectorAll("[data-drive]").forEach(button=>{
   const code=(button as HTMLElement).dataset.drive as Control;
   button.addEventListener("pointerdown",e=>{e.preventDefault();(button as HTMLElement).setPointerCapture((e as PointerEvent).pointerId);this.touch.add(code)});
   for(const name of ["pointerup","pointercancel","lostpointercapture"])
    button.addEventListener(name,()=>this.touch.delete(code));
  });
  document.addEventListener("keydown",e=>{
   if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code))e.preventDefault();
   this.keys.add(e.code);
   if(e.code==="KeyR")this.recover();
   if(e.code==="KeyM")this.toggleMap();
   if(e.code==="KeyH")this.honk();
  });
  document.addEventListener("keyup",e=>this.keys.delete(e.code));
  el("btn-tour").addEventListener("click",()=>this.start("tour"));
  el("btn-rush").addEventListener("click",()=>this.start("rush"));
  el("btn-map").addEventListener("click",()=>this.toggleMap());
  el("btn-close-map").addEventListener("click",()=>this.toggleMap(false));
  el("btn-recover").addEventListener("click",()=>this.recover());
  el("btn-horn").addEventListener("click",()=>this.honk());
  el("btn-pause").addEventListener("click",()=>{this.gameOn=!this.gameOn;el("btn-pause").textContent=this.gameOn?"Pause":"Resume";});
  el("btn-quality").addEventListener("click",()=>{
   this.quality=this.quality==="fast"?"pretty":"fast";this.resize();
   el("btn-quality").textContent=this.quality==="fast"?"Fast":"Pretty";
  });
 }
 private resize(){
  if(!this.world)return;
  const canvas=el("city-canvas") as HTMLCanvasElement;
  this.world.resize(canvas.clientWidth,canvas.clientHeight,this.quality);
 }
 private populatePlaces(){
  const list=el("city-places");list.replaceChildren();
  for(const p of this.pois.sort((a,b)=>a.priority-b.priority)){
   const button=document.createElement("button");
   button.className="city-place";button.disabled=!p.accessible;
   const bold=document.createElement("b");bold.textContent=p.name;
   const small=document.createElement("small");small.textContent=p.accessible?p.zone:"Road connection still missing";
   button.append(bold,small);
   if(p.accessible)button.onclick=()=>{this.current=p;this.calculateRoute();this.toggleMap(false);};
   list.append(button);
  }
 }
 private next(){
  const candidates=this.pois.filter(p=>p.accessible&&!this.stamps.has(p.id)&&distance(this.pos,p.road)>250);
  const pool=candidates.length?candidates:this.pois.filter(p=>p.accessible&&distance(this.pos,p.road)>250);
  const viable=pool.map(p=>({p,d:distance(this.pos,p.road)})).sort((a,b)=>a.d-b.d);
  // Prefer achievable 700–3500m tourist trips, interleave bigger journeys.
  const band=viable.filter(i=>i.d>700&&i.d<3700);
  for(const pick of (band.length?band:viable).slice(0,16)){
   this.current=pick.p;this.calculateRoute();
   if(this.route.length>0)return;
  }
  this.current=null;
 }
 private calculateRoute(){
  if(!this.current)return;
  const start=this.net.nearNode(this.pos);
  this.route=this.net.path(start,this.current.roadNode);
  if(this.route.length===0){
   this.message("This stop needs another connected road. Choose a different landmark.");
   return;
  }
  this.world.setRoute(this.route,this.current);
  el("city-target").textContent=this.current.name;
 }
 private start(mode:"tour"|"rush"){
  this.mode=mode;this.gameOn=true;this.countdown=720;
  this.score=0;this.earnings=0;this.stamps.clear();
  this.boost=100;this.speed=0;el("city-start").classList.add("hidden");
  this.next();this.message(mode==="rush"?"12 minute Bangkok fare challenge!":"Visit famous places. Collect stamps. Explore Bangkok!");
 }
 private message(text:string){
  const status=el("city-message");status.textContent=text;status.classList.add("visible");
  window.setTimeout(()=>{if(status.textContent===text)status.classList.remove("visible")},3100);
 }
 private recover(){
  const n=this.net.nearest(this.pos,true,700);if(!n)return;
  this.pos={...n.point};this.speed=0;this.heading=Math.atan2(n.segment.x2-n.segment.x1,n.segment.z2-n.segment.z1);
  this.message("Back on the road!");
 }
 private honk(){
  this.horn=0.25;this.score+=5;
  try{const ctx=new AudioContext(),osc=ctx.createOscillator(),gain=ctx.createGain();
   osc.type="square";osc.frequency.setValueAtTime(230,ctx.currentTime);
   gain.gain.setValueAtTime(0.08,ctx.currentTime);
   gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.19);
   osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+0.2);
   osc.onended=()=>ctx.close();
  }catch{}
 }
 private toggleMap(force?:boolean){
  const map=el("city-map");map.classList.toggle("hidden",force===undefined?!map.classList.contains("hidden"):!force);
 }
 private frame=(now:number)=>{
  const dt=clamp((now-(this.lastTime||now))/1000,0,0.05);this.lastTime=now;
  if(this.gameOn)this.update(dt);
  if(this.world){
   this.world.update(this.pos,this.heading,this.speed,dt,this.quality);
   if(now-this.lastUI>140){this.updateHud();this.drawMinimap();this.lastUI=now;}
  }
  requestAnimationFrame(this.frame);
 };
 private update(dt:number){
  this.countdown=Math.max(0,this.countdown-dt*(this.mode==="rush"?1:0));
  if(this.mode==="rush"&&this.countdown===0){
   this.gameOn=false;el("city-start").classList.remove("hidden");
   el("city-start-heading").textContent="Shift complete — ฿"+this.earnings.toLocaleString();
   this.message("Your Bangkok shift is complete!");
   return;
  }
  const go=this.touch.has("go")||this.keys.has("ArrowUp")||this.keys.has("KeyW");
  const brake=this.touch.has("brake")||this.keys.has("ArrowDown")||this.keys.has("KeyS")||this.keys.has("Space");
  const steer=Number(this.touch.has("left")||this.keys.has("ArrowLeft")||this.keys.has("KeyA"))-
   Number(this.touch.has("right")||this.keys.has("ArrowRight")||this.keys.has("KeyD"));
  const boost=(this.touch.has("boost")||this.keys.has("ShiftLeft"))&&this.boost>1&&go;
  if(boost)this.boost=Math.max(0,this.boost-21*dt);else this.boost=Math.min(100,this.boost+5*dt);
  if(go)this.speed+=dt*(boost?24:14);
  else if(brake)this.speed-=dt*(this.speed>1?30:11);
  else this.speed*=Math.exp(-1.9*dt);
  this.speed=clamp(this.speed,-7,boost?40:30);
  this.heading+=steer*dt*clamp(Math.abs(this.speed)/7,0.25,2.5)*(this.speed>=0?1:-1);
  const dx=Math.sin(this.heading)*this.speed*dt,dz=Math.cos(this.heading)*this.speed*dt;
  const next={x:this.pos.x+dx,z:this.pos.z+dz};
  const road=this.net.nearest(next,false,55);
  if(road && road.d<=road.segment.w/2+1.4){
   this.pos=next;this.nearestStreet=road.segment.name;
  }else{
   // Collision with city road boundaries: keep driver on actual drivable
   // geometry, slide gently back into lane and retain steer/reverse authority.
   const nearest=road||this.net.nearest(this.pos,false,160);
   if(nearest){
    const limit=nearest.segment.w/2+0.6;
    const px=next.x-nearest.point.x,pz=next.z-nearest.point.z;
    const dist=Math.hypot(px,pz)||1;
    this.pos={x:nearest.point.x+px/dist*Math.min(dist,limit),
      z:nearest.point.z+pz/dist*Math.min(dist,limit)};
    this.speed*=0.68;
   }else{this.speed=0;}
  }
  if(this.current){
   const d=distance(this.pos,this.current.road);
   if(d<22&&Math.abs(this.speed)<6){
    const fare=Math.round(85+Math.max(0,3500-d)/65);
    this.stamps.add(this.current.id);this.earnings+=fare;
    this.score+=fare*7+250;this.message("STAMP EARNED! "+this.current.name+" · +฿"+fare);
    this.next();
   }
   this.lastRoute+=dt;
   if(this.lastRoute>7){this.lastRoute=0;this.calculateRoute();}
  }
 }
 private updateHud(){
  const goal=this.current,d=goal?distance(this.pos,goal.road):0;
  el("city-speed").textContent=String(Math.round(Math.abs(this.speed)*3.6));
  el("city-distance").textContent=goal?km(d):"Explore!";
  el("city-coins").textContent="฿"+this.earnings.toLocaleString();
  el("city-stamps").textContent=String(this.stamps.size);
  el("city-score").textContent=this.score.toLocaleString();
  el("city-road").textContent=this.nearestStreet||"Bangkok city streets";
  el("city-boost-fill").style.width=Math.round(this.boost)+"%";
  el("city-time").textContent=this.mode==="rush"?
    Math.floor(this.countdown/60)+":"+String(Math.floor(this.countdown%60)).padStart(2,"0"):"FREE ROAM";
 }
 private drawMinimap(){
  const canvas=el("city-minimap") as HTMLCanvasElement,ctx=this.mapCtx;
  const w=canvas.width,h=canvas.height,span=650,scale=w/span;
  ctx.clearRect(0,0,w,h);ctx.fillStyle="#192d3d";ctx.fillRect(0,0,w,h);
  const fx=(x:number)=>w/2+(x-this.pos.x)*scale;
  const fz=(z:number)=>h/2+(z-this.pos.z)*scale;
  ctx.lineWidth=1.4;ctx.strokeStyle="#758894";
  for(const id of this.net.nearby(this.pos,span/2)){
   const s=this.net.segments[id]!;
   ctx.beginPath();ctx.moveTo(fx(s.x1),fz(s.z1));ctx.lineTo(fx(s.x2),fz(s.z2));ctx.stroke();
  }
  if(this.route.length>=2){
   ctx.strokeStyle="#ffcc67";ctx.lineWidth=2.7;ctx.beginPath();
   for(let i=0;i<this.route.length;i++){
    const n=this.net.nodes[this.route[i]!]!;
    if(i===0)ctx.moveTo(fx(n.x),fz(n.z));else ctx.lineTo(fx(n.x),fz(n.z));
   }ctx.stroke();
  }
  if(this.current){
   ctx.fillStyle="#ef7b61";ctx.beginPath();
   ctx.arc(fx(this.current.road.x),fz(this.current.road.z),5,0,Math.PI*2);ctx.fill();
  }
  ctx.save();ctx.translate(w/2,h/2);ctx.rotate(-this.heading);
  ctx.fillStyle="#ffde78";ctx.beginPath();ctx.moveTo(0,10);ctx.lineTo(-6,-6);
  ctx.lineTo(6,-6);ctx.closePath();ctx.fill();ctx.restore();
 }
}
const app=new BangkokGame();
app.init();
declare global {interface Window{__bangkok?:BangkokGame}}
if(import.meta.env.DEV)window.__bangkok=app;
