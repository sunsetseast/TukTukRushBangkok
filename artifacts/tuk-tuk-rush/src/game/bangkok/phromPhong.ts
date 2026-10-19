import * as T from "three";
import { LandmarkBuilder } from "./landmarkBuilder";
/** Original architectural interpretations sharing the declared physical masses. */
export function buildEmDistrict(id:string,b:LandmarkBuilder,detail:boolean){
  if(id==="emporium"){
    b.box(0,14,0,84,28,84,"#d7d0b6");b.box(19,57,-17,32,86,34,"#b4c7bf");
    for(const y of [5,13,21,28])b.box(0,y,42.5,84,1.4,1.1,"#bfa66c");
    for(let x=-38;x<=38;x+=detail?6:12){b.box(x,15,42.8,1.2,24,1.8,"#f0e1b7");b.box(x+2.4,15,42.1,3.5,20,.45,"#52777c");}
    b.box(-16,4,46,32,8,8,"#c5b078");b.box(-16,7.7,50.3,30,.6,.5,"#ecc780",0,true);
    // The district is explored from every side: retain the hotel window bands
    // and retail cornices on rear/side elevations as well as the road front.
    for(const side of [-1,1]){
      b.box(19,62,-17+side*17.1,28,72,.3,"#52777c");
      b.box(19+side*16.1,62,-17,.3,72,28,"#52777c");
      for(let y=32;y<98;y+=detail?5:10){
        b.box(19,y,-17+side*17.3,32,.8,.6,"#e7e1cd");
        b.box(19+side*16.3,y,-17,.6,.8,34,"#e7e1cd");
      }
      for(const y of [5,13,21,28]){
        b.box(0,y,side*42.3,84,1.1,.6,"#bfa66c");
        b.box(side*42.3,y,0,.6,1.1,84,"#bfa66c");
      }
      if(detail)for(let x=7;x<=31;x+=6)b.box(x,62,-17+side*17.4,.6,74,.4,"#e7e1cd");
    }
  } else if(id==="emquartier") {
    for(const [x,z,w,d,h] of [[-28,8,37,70,37],[25,14,37,59,45],[8,-27,47,34,80]]){
      b.box(x!,h!/2,z!,w!,h!,d!,"#587d7d");
      for(let y=3;y<h!;y+=detail?5:10){b.box(x!,y,z!+d!/2,w!+2,1.1,2,"#eee8d4");b.box(x!-w!/2,y,z!,2,1.1,d!,"#e3e2ce");}
    }
    for(let i=0;i<7;i++){const a=i*.52;b.shape(new T.CylinderGeometry(15,16,1.4,detail?18:10),25,7+i*5,12,"#e6dec3");b.box(25+Math.sin(a)*12,8+i*5,12+Math.cos(a)*12,7,1.2,5,"#527d4c",a);}
    b.box(-6,17,38,5,30,.3,"#7fbec3");b.box(-6,34,38,8,1,2,"#b1d2ce");
  } else if(id==="emsphere") {
    b.box(0,13,0,80,26,70,"#b47e55");b.box(0,15,35.2,74,20,.6,"#4b7476");
    b.shape(new T.CylinderGeometry(28,34,5,detail?24:12),0,28,0,"#b9854f");
    for(let i=0;i<(detail?18:9);i++){const a=i*Math.PI*2/(detail?18:9);b.box(Math.sin(a)*32,22,Math.cos(a)*27,1.2,16,1.6,"#e5b66d",a);}
    b.box(0,5,38,58,8,6,"#a9744d");b.box(0,9.4,41,56,.6,.5,"#efb770",0,true);
  }
}
