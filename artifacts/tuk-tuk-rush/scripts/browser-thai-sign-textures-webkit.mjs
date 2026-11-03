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
    root.style="display:flex;flex-wrap:wrap;gap:16px;background:#20242a;padding:30px;";
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
    const names=await import("/src/game/bangkok/geographic/thaiStreetNames.ts");
    const plaque=document.createElement("canvas");
    plaque.width=768;plaque.height=256;
    names.paintBangkokRoadPlaque(plaque.getContext("2d"),{
      thai:"ถนนเยาวราช",english:"Yaowarat Road",
    });
    plaque.style.width="566px";plaque.style.height="190px";
    root.appendChild(plaque);
    const image=plaque.getContext("2d").getImageData(0,0,768,256).data;
    let blue=0,white=0;
    for(let i=0;i<image.length;i+=4*16){
      const r=image[i],g=image[i+1],b=image[i+2];
      if(b>r*1.3 && b>g*1.05 && b>100)blue++;
      if(r>220 && g>220 && b>220)white++;
    }
    return {signs:reports,plaque:{blue,white}};

  });
  assert.equal(result.signs.length,5);
  assert(result.signs.every(x=>x.size===512&&x.alpha>1000),
    "All Thai source signs must render real Canvas2D pixels");
  assert(result.signs.find(x=>x.type==="stop").red>600,
    "Thai หยุด must appear on a red octagonal face");
  assert(result.signs.find(x=>x.type==="stop").white>100,
    "Thai หยุด must have a white border/text");
  assert(result.signs.find(x=>x.type==="yield").white>600,
    "Thai ให้ทาง sign must use white triangle field");
  assert(result.signs.find(x=>x.type==="yield").red>100,
    "Thai ให้ทาง sign needs proper red border");
  assert(result.plaque.blue>1000 && result.plaque.white>100,\n    "Bangkok bilingual street plaques must have blue/white readable canvas faces");\n  await page.screenshot({path:new URL("webkit-thai-sign-face-atlas.png",out).pathname});
  fs.writeFileSync(new URL("webkit-thai-sign-textures.json",out),
    JSON.stringify({browser:browser.version(),checks:result},null,2)+"\n");
  console.log(JSON.stringify({pass:true,support:"WebKit Canvas2D",checks:result},null,2));
}finally{await browser?.close();server.kill();}
