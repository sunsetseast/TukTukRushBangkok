import * as T from "three";
import { StaticBatch } from "../staticBatch";

/** Original low-poly authored silhouettes, baked into two materials per site. */
export class LandmarkBuilder {
  private batch=new StaticBatch(40);
  private plain=new T.MeshStandardMaterial({roughness:.8});
  readonly light=new T.MeshStandardMaterial({roughness:.42,metalness:.15,emissive:"#ffc886",emissiveIntensity:0});
  private unit=new T.BoxGeometry(); private temp=new T.Object3D();
  shape(geo:T.BufferGeometry,x:number,y:number,z:number,color:string,yaw=0,lit=false){
    this.temp.position.set(x,y,z);this.temp.rotation.set(0,yaw,0);this.temp.scale.set(1,1,1);this.temp.updateMatrix();
    this.batch.add(geo,lit?this.light:this.plain,[this.temp.matrix.clone()],[new T.Color(color)]);
  }
  box(x:number,y:number,z:number,w:number,h:number,d:number,color:string,yaw=0,lit=false){
    this.temp.position.set(x,y,z);this.temp.rotation.set(0,yaw,0);this.temp.scale.set(w,h,d);this.temp.updateMatrix();
    this.batch.add(this.unit,lit?this.light:this.plain,[this.temp.matrix.clone()],[new T.Color(color)]);
  }
  prang(x:number,z:number,h:number,r:number,color:string){
    const profile:[[number,number],...Array<[number,number]>]=[[0,0],[.85,0],[1,.04],[.76,.075],[.88,.13],[.58,.18],[.71,.24],[.44,.31],[.5,.39],[.39,.5],[.3,.61],[.21,.72],[.14,.82],[.075,.91],[0,1]];
    const g=new T.LatheGeometry(profile.map(([a,b])=>new T.Vector2(a*r,b*h)),12);
    this.shape(g,x,.25,z,color);
    for(const y of [.1,.23,.4,.61]){
      const rr=r*(.9-y);this.shape(new T.CylinderGeometry(rr,rr,.24,12),x,y*h+.25,z,"#baab83");
      for(let i=0;i<12;i++){
        const a=i*Math.PI/6;this.box(x+Math.sin(a)*rr,y*h+.65,z+Math.cos(a)*rr,.34,.7,.34,i%2?"#638d82":"#d9b86d",a);
      }
    }
  }
  roof(x:number,y:number,z:number,w:number,d:number,h:number,color:string){
    const profile=new T.Shape([new T.Vector2(-w/2,h*.3),new T.Vector2(-w*.42,0),new T.Vector2(0,h),new T.Vector2(w*.42,0),new T.Vector2(w/2,h*.3),new T.Vector2(w*.42,.25),new T.Vector2(0,h+.25),new T.Vector2(-w*.42,.25)]);
    this.shape(new T.ExtrudeGeometry(profile,{depth:d,bevelEnabled:false,curveSegments:2}).translate(0,0,-d/2),x,y,z,color);
    for(const side of [-1,1])this.box(x+side*w*.45,y+.25,z,.24,.24,d+.3,"#e5be6d",0,true);
  }
  finish(id:string){
    const root=new T.Group();root.userData.authoredAsset=id;
    for(const g of this.batch.finish())root.add(g);
    root.userData.nightMaterials=root.children.flatMap(g=>g.children.map(m=>(m as T.Mesh).material)).filter(m=>(m as T.MeshStandardMaterial).emissive?.getHex()>0);
    return root;
  }
}
