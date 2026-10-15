import * as T from 'three';
import type {LandmarkBuilder} from './landmarkBuilder';
export type V3=[number,number,number];
export type Section={p:V3;a:number;b:number};
/** Anatomical section loft, with transported cross-sections and continuous normals.
 * The radius profile, rather than intersected ellipsoids, authors the silhouette. */
export function sectionLoft(sections:Section[],sides=24,steps=48,folds=0){
 const curve=new T.CatmullRomCurve3(sections.map(s=>new T.Vector3(...s.p)),false,'catmullrom',.3),positions:number[]=[],uv:number[]=[],indices:number[]=[];
 // A consistent front direction is important on hands and robe surfaces.
 const tangent=new T.Vector3(),u=new T.Vector3(),v=new T.Vector3(),prev=new T.Vector3(),rotation=new T.Quaternion();
 for(let i=0;i<=steps;i++){
  const t=i/steps,q=t*(sections.length-1),k=Math.min(sections.length-2,Math.floor(q)),f=q-k,A=sections[k]!,B=sections[k+1]!,smooth=f*f*(3-2*f),a=T.MathUtils.lerp(A.a,B.a,smooth),b=T.MathUtils.lerp(A.b,B.b,smooth),p=curve.getPoint(t);
  curve.getTangent(t,tangent);if(i===0){u.set(Math.abs(tangent.y)>.8?1:0,Math.abs(tangent.y)>.8?0:1,0);}else{rotation.setFromUnitVectors(prev,tangent);u.applyQuaternion(rotation);}u.addScaledVector(tangent,-u.dot(tangent)).normalize();v.crossVectors(tangent,u).normalize();prev.copy(tangent);
  for(let j=0;j<=sides;j++){const theta=j/sides*Math.PI*2,fold=1+folds*Math.sin(theta*5+t*31)*Math.pow(Math.max(0,Math.cos(theta)),2),x=Math.cos(theta)*a*fold,z=Math.sin(theta)*b*fold;positions.push(p.x+u.x*x+v.x*z,p.y+u.y*x+v.y*z,p.z+u.z*x+v.z*z);uv.push(j/sides,t);if(i<steps&&j<sides){const n=i*(sides+1)+j;indices.push(n,n+1,n+sides+1,n+1,n+sides+2,n+sides+1);}}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function ribbonPath(points:V3[],radius:number,sides=5,segments=24){return new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments,radius,sides,false);}
const gauss=(x:number,y:number,cx:number,cy:number,sx:number,sy:number)=>Math.exp(-(((x-cx)/sx)**2+((y-cy)/sy)**2));
function facePoint(y:number,angle:number){
 const q=T.MathUtils.clamp((y+1.9)/3.95,0,1),sin=Math.sin(q*Math.PI),w=(.28+1.04*Math.pow(sin,.6))*(y<-.8?.91:1),depth=.3+.78*Math.pow(sin,.55),x=Math.sin(angle)*w,front=Math.max(0,Math.cos(angle));
 let z=Math.cos(angle)*depth;
 const nose=.28*gauss(x,y,0,.18,.17,.7)+.43*gauss(x,y,0,-.18,.23,.23),cheeks=.1*(gauss(x,y,-.65,-.33,.45,.45)+gauss(x,y,.65,-.33,.45,.45)),eyes=-.13*(gauss(x,y,-.55,.38,.34,.18)+gauss(x,y,.55,.38,.34,.18)),lips=.1*gauss(x,y,0,-.82,.5,.18);
 z+=Math.pow(front,8)*(nose+cheeks+eyes+lips);return new T.Vector3(x,y,z);
}
/** The nose, cheek planes, chin and eye sockets are one deformable surface. */
export function buddhaFaceGeometry(detail:boolean){
 const rows=detail?38:20,sides=detail?64:28,p:number[]=[],uv:number[]=[],idx:number[]=[];
 for(let i=0;i<=rows;i++)for(let j=0;j<=sides;j++){const q=facePoint(-1.9+i/rows*3.95,j/sides*Math.PI*2);p.push(q.x,q.y,q.z);uv.push(j/sides,i/rows);if(i<rows&&j<sides){const k=i*(sides+1)+j;idx.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
export function sculptedFace(b:LandmarkBuilder,position:V3,scale:number,detail:boolean,tilt=0){
 const matrix=new T.Matrix4().compose(new T.Vector3(...position),new T.Quaternion().setFromEuler(new T.Euler(0,0,tilt)),new T.Vector3(scale,scale,scale));
 const put=(g:T.BufferGeometry,col='#dfb258')=>b.sculpt(g.applyMatrix4(matrix),0,0,0,col,'gilded');
 put(buddhaFaceGeometry(detail));
 const cap=[[-.01,1.14],[1.04,1.15],[1.12,1.5],[.94,1.94],[.62,2.24],[0,2.32]].map(([r,y])=>new T.Vector2(r!,y!));put(new T.LatheGeometry(cap,detail?40:20),'#bc8d3c');
 const crown=[[0,0],[.43,0],[.46,.25],[.3,.6],[.19,.92],[0,1.2]].map(([r,y])=>new T.Vector2(r!,y!));put(new T.LatheGeometry(crown,20).translate(0,2.12,0),'#d6a746');
 if(detail){
  for(let row=0;row<7;row++){const y=1.14+row*.15,r=Math.sqrt(Math.max(.03,1-((y-1.25)/1.05)**2))*1.12,n=Math.round(22*r);for(let j=0;j<n;j++){const a=(j+(row%2)*.5)/n*Math.PI*2;put(new T.IcosahedronGeometry(.095,0).translate(Math.sin(a)*r,y,Math.cos(a)*r),'#b78938');}}
 }
 // Elongated lobes are shaped leaf sections, with a recessed inner ear ridge.
 for(const side of [-1,1]){
  const ear=sectionLoft([{p:[side*1.2,.55,0],a:.05,b:.08},{p:[side*1.4,.2,.04],a:.3,b:.15},{p:[side*1.36,-.6,.03],a:.22,b:.12},{p:[side*1.25,-1.32,.1],a:.12,b:.1},{p:[side*1.18,-1.38,.1],a:.01,b:.01}],12,24);put(ear);
  put(ribbonPath([[side*1.31,.5,.15],[side*1.48,.17,.18],[side*1.35,-.6,.17],[side*1.23,-1.12,.19]],.024,4,14),'#b88737');
  const eye:V3[]=[[side*.22,.35,1.0],[side*.46,.29,1.026],[side*.7,.32,.99],[side*.95,.43,.87]];
  put(ribbonPath(eye,.026,5,16),'#795a2d');put(ribbonPath(eye.map(p=>[p[0],p[1]+.075,p[2]+.015]),.034,5,16),'#f2cb78');
  put(ribbonPath([[side*.2,.72,1.03],[side*.48,.8,1.06],[side*.78,.76,1.0],[side*.98,.65,.88]],.037,5,18),'#a07530');
  put(ribbonPath([[side*.08,-.31,1.37],[side*.18,-.34,1.31],[side*.25,-.28,1.21]],.017,4,10),'#886328');
 }
 put(ribbonPath([[-.48,-.79,1.02],[-.22,-.73,1.13],[0,-.77,1.17],[.22,-.73,1.13],[.48,-.79,1.02]],.035,5,20),'#a97538');
 put(ribbonPath([[-.4,-.83,1.04],[0,-.9,1.16],[.4,-.83,1.04]],.04,5,16),'#edc26e');
}
export function sculptedHand(b:LandmarkBuilder,at:V3,scale:number,yaw=0,up=false,detail=true){
 const m=new T.Matrix4().compose(new T.Vector3(...at),new T.Quaternion().setFromEuler(new T.Euler(0,yaw,up?Math.PI/2:0)),new T.Vector3(scale,scale,scale));
 const put=(g:T.BufferGeometry,col='#e1b45a')=>b.sculpt(g.applyMatrix4(m),0,0,0,col,'gilded');
 put(sectionLoft([{p:[-.65,0,0],a:.2,b:.3},{p:[0,0,0],a:.24,b:.6},{p:[.65,0,0],a:.22,b:.5},{p:[.9,0,0],a:.08,b:.08}],16,20));
 for(let i=0;i<4;i++){const z=(i-1.5)*.29,len=[1.05,1.3,1.2,.9][i]!;put(sectionLoft([{p:[.5,0,z],a:.15,b:.14},{p:[1.1,0,z],a:.14,b:.12},{p:[.8+len,-.08,z-.03],a:.11,b:.1},{p:[1+len,-.16,z-.06],a:.015,b:.025}],detail?10:6,12));if(detail)put(ribbonPath([[1+len,-.05,z-.1],[1.1+len,-.04,z],[1+len,-.05,z+.07]],.015,3,5),'#aa8038');}
 put(sectionLoft([{p:[0,-.1,-.4],a:.18,b:.18},{p:[.55,-.26,-.7],a:.15,b:.15},{p:[1,-.2,-.8],a:.03,b:.03}],10,16));
}
/** Original 108-panel lotus/chakra inlay, not a photograph or a claim to copy
 * every historic auspicious emblem. One small shared map serves both soles. */
export function pearlSoleTexture(){
 const W=256,H=512,pixels=new Uint8Array(W*H*4);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const u=x/W,v=y/H,cx=(u*9)%1,cy=(v*12)%1,dx=cx-.5,dy=cy-.5,r=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
  const frame=cx<.06||cx>.94||cy<.045||cy>.955,lotus=Math.abs(r-(.22+.055*Math.cos(a*8)))<.035,chakra=Math.abs(r-.13)<.025||r<.04,ink=frame||lotus||chakra;
  const i=(y*W+x)*4,shimmer=Math.round(10*Math.sin((x+y)*.1));pixels[i]=ink?221+shimmer:42;pixels[i+1]=ink?229+shimmer:40;pixels[i+2]=ink?212+shimmer:38;pixels[i+3]=255;
 }
 const t=new T.DataTexture(pixels,W,H);t.colorSpace=T.SRGBColorSpace;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.anisotropy=4;t.needsUpdate=true;return t;
}
