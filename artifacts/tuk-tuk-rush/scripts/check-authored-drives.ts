import assert from 'node:assert/strict';import fs from 'node:fs';
Object.assign(globalThis,{window:{addEventListener(){},removeEventListener(){}},document:{addEventListener(){},removeEventListener(){},hidden:false}});
const {GameEngine}=await import('../src/game/engine');const {routeFromPoint}=await import('../src/game/bangkok/world');
const pairs=[['gate','paragon'],['paragon','icon'],['icon','peninsula'],['oriental','shangri'],['eastin','one-bangkok'],['central','embassy'],['shangri','river-city'],['four-seasons','capella'],['peninsula','anantara'],['embassy','okura'],['one-bangkok','dusit']];
const e=new GameEngine({seed:26}),d=e.model.district,results=[];let total=0;
for(const [from,to]of pairs){
 e.start('free');e.model.traffic.length=0;
 const a=d.nodes.find(n=>n.id===d.landmarks.find(l=>l.id===from)!.accessNode)!,b=d.nodes.find(n=>n.id===d.landmarks.find(l=>l.id===to)!.accessNode)!;
 const path=routeFromPoint(d,a,b).slice(1);assert(path.length,`${from} → ${to} connected`);
 Object.assign(e.model.player,{x:a.x,z:a.z,heading:Math.atan2(path[0]!.x-a.x,path[0]!.z-a.z),speed:0,collision:0});
 e.model.mission={pickup:a,destination:b,passenger:'Architecture QA',limit:100000};Object.assign(e.model.snapshot,{stage:'delivery',target:b,tripTime:100000,boarding:0});
 let index=0,hits=0,metres=0,frames=0;
 for(let step=0;step<100000&&e.model.snapshot.deliveries===0;step++){
  const p=e.model.player;let goal=path[index]!,distance=Math.hypot(goal.x-p.x,goal.z-p.z);
  while(distance<5&&index<path.length-1){goal=path[++index]!;distance=Math.hypot(goal.x-p.x,goal.z-p.z);}
  const angle=Math.atan2(goal.x-p.x,goal.z-p.z)-p.heading,error=Math.atan2(Math.sin(angle),Math.cos(angle)),last=index===path.length-1,stop=last&&distance<7.3,speed=last&&distance<20?4:Math.abs(error)>.35?5:10;
  Object.assign(e.model.input,{steer:stop?0:Math.max(-1,Math.min(1,-error*2.3)),gas:!stop&&p.speed<speed,brake:stop?p.speed>.4:p.speed>speed+.5});
  const x=p.x,z=p.z;e.update(1/60);metres+=Math.hypot(p.x-x,p.z-z);if(p.collision)hits++;frames++;
 }
 assert.equal(e.model.snapshot.deliveries,1,`${from} → ${to} must complete via actual controller`);assert.equal(hits,0,`${from} → ${to} static collision`);total+=metres;results.push({from,to,metres:Math.round(metres),simulatedSeconds:Math.round(frames/60),collisionFrames:hits,controllerDriven:true,setupOnlyAtStart:true});
}
e.dispose();const out={pass:true,trafficDisabledForDeterminism:true,metres:Math.round(total),routes:results};fs.writeFileSync(new URL('../../../docs/qa/authored-landmark-districts/driven-routes.json',import.meta.url),JSON.stringify(out,null,2));console.log(JSON.stringify(out));
