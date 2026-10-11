import {chromium} from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=fileURLToPath(new URL("../",import.meta.url));
const out=path.join(root,"generated-artifacts","bangkok-city-adventure");
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true});
const errors=[];
page.on("pageerror",e=>errors.push(e.message));
try{
 await page.goto(process.env.GAME_URL||"http://127.0.0.1:24177/bangkok-drive.html",
  {waitUntil:"domcontentloaded",timeout:65000});
 await page.waitForFunction(()=>window.__bangkok?.net?.segments?.length>500,null,{timeout:65000});
 const state=await page.evaluate(()=>({
  segments:window.__bangkok.net.segments.length,
  available:window.__bangkok.pois.filter(p=>p.accessible).length,
  main:window.__bangkok.net.componentCounts.get(window.__bangkok.net.mainComponent)
 }));
 await page.locator("#btn-tour").click();
 await page.waitForFunction(()=>window.__bangkok?.gameOn===true);
 await page.waitForTimeout(2400);
 await page.screenshot({path:path.join(out,"city-desktop.jpg"),quality:88,type:"jpeg"});
 const before=await page.evaluate(()=>({x:window.__bangkok.pos.x,z:window.__bangkok.pos.z}));
 await page.keyboard.down("w");await page.waitForTimeout(1600);await page.keyboard.up("w");
 // Steering must genuinely turn LEFT (negative heading) and RIGHT
 // (positive heading) on the same real road, not just animate button presses.
 await page.evaluate(()=>{window.__bangkok.speed=12;window.__bangkok.heading=0;});
 await page.keyboard.down("a");await page.waitForTimeout(440);await page.keyboard.up("a");
 const afterLeft=await page.evaluate(()=>window.__bangkok.heading);
 if(afterLeft>=-0.025)throw Error("LEFT input wrongly turns right or does nothing");
 await page.evaluate(()=>{window.__bangkok.speed=12;window.__bangkok.heading=0;});
 await page.keyboard.down("d");await page.waitForTimeout(440);await page.keyboard.up("d");
 const afterRight=await page.evaluate(()=>window.__bangkok.heading);
 if(afterRight<=0.025)throw Error("RIGHT input wrongly turns left or does nothing");
 await page.evaluate(()=>{window.__bangkok.speed=0;});
 const after=await page.evaluate(()=>({x:window.__bangkok.pos.x,z:window.__bangkok.pos.z,speed:window.__bangkok.speed}));
 if(Math.hypot(after.x-before.x,after.z-before.z)<3)throw Error("Tuk-tuk failed to move on real roads");
 await page.locator("#btn-map").click();
 await page.waitForFunction(()=>!document.querySelector("#city-map").classList.contains("hidden"));
 const mapEvidence=await page.evaluate(()=>{
  const g=window.__bangkok,canvas=document.querySelector("#city-world-map");
  return {width:canvas.width,height:canvas.height,riverLines:g.riverLines.length,
   markerCount:g.pois.length,scale:g.mapTransform.scale};
 });
 if(mapEvidence.width<900||mapEvidence.markerCount<18||
   mapEvidence.scale<=0||mapEvidence.riverLines<10)
   throw Error("Whole-city Bangkok map failed to render real roads/river/landmarks");
 await page.screenshot({path:path.join(out,"bangkok-passport-map.jpg"),quality:90,type:"jpeg"});
 await page.locator("#btn-close-map").click();
 const trafficCount=await page.evaluate(()=>window.__bangkok.world.traffic.length);
 if(trafficCount<10)throw Error("Moving NPC Bangkok taxis failed to appear");
 const checkpoints=["wat-pho","wat-arun","iconsiam","siam-paragon"];
 for(const id of checkpoints){
  const route=await page.evaluate(id=>{
   const g=window.__bangkok,goal=g.pois.find(p=>p.id===id);
   return goal?g.net.path(g.net.nearNode(g.pos),goal.roadNode).length:0;
  },id);
  if(route<2)throw Error("Road routing failed "+id);
 }
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(250);
 await page.screenshot({path:path.join(out,"city-iphone-landscape.jpg"),quality:85,type:"jpeg"});
 await page.setViewportSize({width:430,height:932});await page.waitForTimeout(250);
 await page.screenshot({path:path.join(out,"city-iphone-portrait.jpg"),quality:85,type:"jpeg"});
 if(errors.length)throw Error("Browser JavaScript errors: "+errors.join("\n"));
 await fs.writeFile(path.join(out,"qa.json"),JSON.stringify({
  state:"PASS",platform:"Linux Chromium software WebGL, not actual iPhone",
  city:state,movementMeters:Math.round(Math.hypot(after.x-before.x,after.z-before.z)*100)/100,
  routeChecks:checkpoints,steering:{afterLeft,afterRight},
  trafficCount,mapEvidence,errors
 },null,2));
 console.log("PASS Bangkok playable WebGL",state);
}finally{await browser.close();}
