/** Verify Thai script source textures can be drawn in real WebKit canvas.
 * Does not assert the physical iPhone fonts or Safari/WebGL frame rate.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import {webkit} from "playwright";
import {startQaServer} from "./browser-vite.mjs";
const out=new URL("../../../docs/qa/thai-road-signage/",import.meta.url);
fs.mkdirSync(out,{recursive:true});
const server=await startQaServer(24830);
let browser;
try{
  browser=await webkit.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1150,height:630}});
  await page.goto("http://127.0.0.1:24830/assets/geography/transport-check.html");
  const result=await page.evaluate(async()=>{
    const mod=await import("/src/game/bangkok/geographic/thaiSignFaces.ts");
    const faces=[
      {type:"stop"},
      {type:"yield"},
      {type:"speed",kph:40},
      {type:"no-entry"},
      {type:"no-parking"},
    ];
    const root=document.createElement("div");
    root.style="display:flex;gap:16px;background:#20242a;padding:30px;";
    document.body.replaceChildren(root);
    const reports=[];
    for(const face of faces){
      const texture=mod.makeThaiSignTexture(face);
      const canvas=texture.image;
      canvas.style.width="190px";canvas.style.height="190px";
      root.appendChild(canvas);
      const pixels=canvas.getContext("2d").getImageData(0,0,512,512).data;
      let alpha=0,red=0,white=0;
      for(let i=0;i<pixels.length;i+=4*16){
        const r=pixels[i],g=pixels[i+1],b=pixels[i+2],a=pixels[i+3];
        if(a>60)alpha++;
        if(a>80&&r>130&&r>g*1.4)red++;
        if(a>80&&r>210&&g>210&&b>210)white++;
      }
      reports.push({type:face.type,alpha,red,white,
        size:canvas.width,font:canvas.getContext("2d").font});
      texture.dispose();
    }
    return reports;
  });
  assert.equal(result.length,5);
  assert(result.every(x=>x.size===512&&x.alpha>1000),
    "All Thai source signs must render real Canvas2D pixels");
  assert(result.find(x=>x.type==="stop").red>600,
    "Thai หยุด must appear on a red octagonal face");
  assert(result.find(x=>x.type==="stop").white>100,
    "Thai หยุด must have a white border/text");
  assert(result.find(x=>x.type==="yield").white>600,
    "Thai ให้ทาง sign must use white triangle field");
  assert(result.find(x=>x.type==="yield").red>100,
    "Thai ให้ทาง sign needs proper red border");
  await page.screenshot({path:new URL("webkit-thai-sign-face-atlas.png",out).pathname});
  fs.writeFileSync(new URL("webkit-thai-sign-textures.json",out),
    JSON.stringify({browser:browser.version(),checks:result},null,2)+"\n");
  console.log(JSON.stringify({pass:true,support:"WebKit Canvas2D",checks:result},null,2));
}finally{await browser?.close();server.kill();}
