/** Bangkok / Thailand street sign materials. Visual references:
 * Ministry of Transport OTP official traffic sign manuals:
 * https://www.otp.go.th/post/view/2098
 * Thailand 2020 Ministry of Transport road-sign regulations, section 5:
 * red octagon หยุด and downward triangle ให้ทาง.
 *
 * Build textures once per map scene, never once per frame or per sign.
 * Any specific numeric sign value MUST be supplied by an original OSM tag.
 * The imported 2026 source only labels some signs 'maxspeed', without any
 * numerical value; we intentionally do not guess a limit for those signs.
 */
import * as T from "three";
import type { RuntimeTrafficSign } from "./controlImport";

export type ThaiSignFace =
  | {type:"stop"}
  | {type:"yield"}
  | {type:"speed";kph:number}
  | {type:"no-entry"}
  | {type:"no-parking"}
  | {type:"no-stopping"}
  | {type:"no-uturn"};
export function classifyThaiSign(sign:Pick<RuntimeTrafficSign,"kind"|"tags">):
  ThaiSignFace|undefined{
  if(sign.kind==="stop")return {type:"stop"};
  if(sign.kind==="yield")return {type:"yield"};
  if(sign.kind!=="sign")return;
  const tags=sign.tags??{};
  const values=(tags.traffic_sign??"")
    .toLowerCase().split(/[;,]/).map(t=>t.trim()).filter(Boolean);
  // Other mapped signs must not receive an arbitrary generic blue placard.
  // Only documented, unambiguous types are rendered as regulatory signs.
  if(values.some(v=>["stop","th:stop"].includes(v)))return {type:"stop"};
  if(values.some(v=>["give_way","yield","th:give_way"].includes(v)))return {type:"yield"};
  if(values.some(v=>["no_entry","th:no_entry"].includes(v)))return {type:"no-entry"};
  if(values.some(v=>["no_parking","th:no_parking"].includes(v)))return {type:"no-parking"};
  if(values.some(v=>["no_stopping","th:no_stopping"].includes(v)))return {type:"no-stopping"};
  if(values.some(v=>["no_u_turn","no_uturn","th:no_u_turn"].includes(v)))return {type:"no-uturn"};
  if(values.some(v=>v==="maxspeed"||v==="speed_limit"||v.startsWith("maxspeed:"))){
    // Explicit, plausible, posted km/h value only. No invented default '50'.
    const raw=tags.maxspeed??values.find(v=>v.startsWith("maxspeed:"))?.slice(9);
    const match=raw?.match(/^(\d{1,3})(?:\s*(?:km\/h|kph))?$/i);
    if(!match)return;
    const kph=Number(match[1]);
    if(kph<5||kph>130)return;
    return {type:"speed",kph};
  }
  return;
}
export const thaiSignKey=(face:ThaiSignFace)=>
  face.type==="speed"?"speed:"+face.kph:face.type;

const FONT='"Noto Sans Thai","Thonburi","Tahoma","Arial",sans-serif';
const SIZE=512;
function pathOctagon(ctx:CanvasRenderingContext2D){
  const cx=256,cy=256,r=215;
  ctx.beginPath();
  for(let i=0;i<8;i++){
    const angle=Math.PI/8+i*Math.PI/4;
    const x=cx+Math.cos(angle)*r,y=cy+Math.sin(angle)*r;
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.closePath();
}
function invertedTriangle(ctx:CanvasRenderingContext2D){
  ctx.beginPath();
  ctx.moveTo(60,86);ctx.lineTo(452,86);ctx.lineTo(256,442);ctx.closePath();
}
function centered(ctx:CanvasRenderingContext2D,text:string,y:number,
  fontPx:number,color="#ffffff"){
  ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.font=`700 ${fontPx}px ${FONT}`;
  ctx.fillStyle=color;ctx.fillText(text,256,y,425);
}
export function drawThaiSignFace(ctx:CanvasRenderingContext2D,face:ThaiSignFace){
  ctx.clearRect(0,0,SIZE,SIZE);
  ctx.lineJoin="round";
  if(face.type==="stop"){
    pathOctagon(ctx);ctx.fillStyle="#bc202b";ctx.fill();
    ctx.lineWidth=16;ctx.strokeStyle="#ffffff";ctx.stroke();
    centered(ctx,"หยุด",247,172);
    return;
  }
  if(face.type==="yield"){
    invertedTriangle(ctx);ctx.fillStyle="#ffffff";ctx.fill();
    ctx.lineWidth=29;ctx.strokeStyle="#d52b32";ctx.stroke();
    centered(ctx,"ให้ทาง",214,112,"#171717");
    return;
  }
  // Thailand's regulatory speed/prohibition signs: white circular field,
  // red border. Never draw a speed value without an original OSM number.
  ctx.beginPath();ctx.arc(256,256,199,0,2*Math.PI);
  ctx.fillStyle=face.type==="no-parking"||face.type==="no-stopping"
    ?"#1f4c9d":"#ffffff";ctx.fill();
  ctx.lineWidth=39;ctx.strokeStyle="#d5232c";ctx.stroke();
  if(face.type==="speed"){
    centered(ctx,String(face.kph),260,205,"#151515");
    return;
  }
  if(face.type==="no-entry"){
    ctx.fillStyle="#d5232c";
    ctx.beginPath();ctx.arc(256,256,165,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#ffffff";ctx.fillRect(126,229,260,54);
    return;
  }
  if(face.type==="no-parking"||face.type==="no-stopping"){
    const slash=(reverse:boolean)=>{
      ctx.strokeStyle="#e23242";ctx.lineWidth=41;
      ctx.beginPath();
      ctx.moveTo(reverse?158:354,158);
      ctx.lineTo(reverse?354:158,354);ctx.stroke();
    };
    slash(false);
    if(face.type==="no-stopping")slash(true);
    return;
  }
  if(face.type==="no-uturn"){
    ctx.strokeStyle="#151515";ctx.lineWidth=37;ctx.lineCap="round";
    ctx.beginPath();ctx.moveTo(320,369);ctx.lineTo(320,229);
    ctx.arc(256,229,64,0,Math.PI,true);
    ctx.lineTo(192,342);ctx.stroke();
    ctx.fillStyle="#151515";
    ctx.beginPath();ctx.moveTo(139,302);ctx.lineTo(245,302);
    ctx.lineTo(192,369);ctx.closePath();ctx.fill();
    ctx.strokeStyle="#d5232c";ctx.lineWidth=37;
    ctx.beginPath();ctx.moveTo(120,392);ctx.lineTo(392,120);ctx.stroke();
  }
}
export function makeThaiSignTexture(face:ThaiSignFace){
  const canvas=document.createElement("canvas");
  canvas.width=SIZE;canvas.height=SIZE;
  const ctx=canvas.getContext("2d");
  if(!ctx)throw Error("Bangkok Thai sign canvas is unavailable");
  drawThaiSignFace(ctx,face);
  const texture=new T.CanvasTexture(canvas);
  texture.colorSpace=T.SRGBColorSpace;
  texture.anisotropy=4;
  texture.generateMipmaps=true;
  texture.minFilter=T.LinearMipmapLinearFilter;
  texture.magFilter=T.LinearFilter;
  return texture;
}
export function createThaiSignMaterial(face:ThaiSignFace){
  const texture=makeThaiSignTexture(face);
  return new T.MeshStandardMaterial({
    map:texture,color:"#ffffff",roughness:.65,metalness:.05,
    alphaTest:.35,transparent:true,side:T.FrontSide,
  });
}
