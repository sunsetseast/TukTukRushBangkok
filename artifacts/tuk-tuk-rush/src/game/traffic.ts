import type { District, Point, Road, RoadNode, TrafficCar, Vehicle } from './types';
export const leftLaneOffset=(r:Road)=>r.roundabout?0:Math.min(3,r.width/4);
/** +Z forward with +Y up: the LEFT normal is (+dz,-dx). */
export function lanePoint(a:Point,b:Point,r:Road,t:number):Point {
  const len=Math.hypot(b.x-a.x,b.z-a.z),lane=leftLaneOffset(r);
  return {x:a.x+(b.x-a.x)*t+(b.z-a.z)/len*lane,z:a.z+(b.z-a.z)*t-(b.x-a.x)/len*lane};
}
type Edge={a:RoadNode;b:RoadNode;r:Road;ux:number;uz:number;length:number;start:number;end:number};
type Motion={edge:Edge;distance:number;next?:Edge;turn?:{points:Point[];lengths:number[];length:number;distance:number}};
const lerp=(a:Point,b:Point,t:number)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
export class TrafficSystem {
  private nodes:Map<string,RoadNode>;
  private neighbors=new Map<string,string[]>();
  private incident=new Map<string,Road[]>();
  private edges=new Map<string,Edge>();
  private motions=new WeakMap<TrafficCar,Motion>();
  private seed=982;private elapsed=0;
  constructor(private district:District){
    this.nodes=new Map(district.nodes.map(n=>[n.id,n]));
    for(const n of district.nodes){this.neighbors.set(n.id,[]);this.incident.set(n.id,[]);}
    for(const r of district.roads.filter(r=>!r.noTraffic)){
      this.incident.get(r.a)!.push(r);this.incident.get(r.b)!.push(r);
      this.neighbors.get(r.a)!.push(r.b);if(!r.oneWay)this.neighbors.get(r.b)!.push(r.a);
    }
    for(const r of district.roads.filter(r=>!r.noTraffic)) for(const [from,to] of r.oneWay?[[r.a,r.b]]:[[r.a,r.b],[r.b,r.a]]){
      const a=this.nodes.get(from!)!,b=this.nodes.get(to!)!,length=Math.hypot(b.x-a.x,b.z-a.z);
      const trim=(n:RoadNode)=>{
        const rs=this.incident.get(n.id)!;
        if(rs.length>2)return Math.min(length*.32,Math.max(...rs.map(q=>q.width))*.62);
        if(rs.length===2){const other=rs.find(q=>q!==r)!,end=this.nodes.get(other.a===n.id?other.b:other.a)!;
          const dot=((end.x-n.x)*(a.id===n.id?b.x-n.x:a.x-n.x)+(end.z-n.z)*(a.id===n.id?b.z-n.z:a.z-n.z))/(Math.hypot(end.x-n.x,end.z-n.z)*length);
          if(dot>-.985)return Math.min(length*.24,6);
        }return 0;
      };
      this.edges.set(`${from}>${to}`,{a,b,r,ux:(b.x-a.x)/length,uz:(b.z-a.z)/length,length,start:trim(a),end:length-trim(b)});
    }
  }
  private random(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296;}
  get horizontalGreen(){return Math.floor(this.elapsed/9)%2===0;}
  reset(){this.seed=982;this.elapsed=0;this.motions=new WeakMap();}
  private point(e:Edge,distance:number){return lanePoint(e.a,e.b,e.r,distance/e.length);}
  create():TrafficCar[]{
    const roads=this.district.roads.filter(r=>!r.shortcut&&!r.noTraffic),main=roads.filter(r=>r.corridor==='yaowarat'||r.name==='Yaowarat Road');
    const colors=['#e872a8','#4da995','#e6bc54','#db8f78','#b9c9cf'];
    return Array.from({length:this.district.worldId==='bangkok'?38:16},(_,id)=>{
      const list=id<10&&main.length?main:roads;
      const road=list[Math.floor((id<10?id/10:(id-10)/28)*list.length)%list.length]!;
      const reverse=!road.oneWay&&id%2===0,e=this.edges.get(reverse?`${road.b}>${road.a}`:`${road.a}>${road.b}`)!;
      const distance=e.start+(e.end-e.start)*(.15+this.random()*.65),p=this.point(e,distance);
      const car:TrafficCar={...p,id,from:e.a.id,to:e.b.id,heading:Math.atan2(e.ux,e.uz),speed:7+id%4,kind:id%3===0?'motorcycle':id%5===0?'car':'taxi',color:colors[id%5]!,wait:0,nearMissCooldown:0};
      this.motions.set(car,{edge:e,distance});return car;
    });
  }
  motionPhase(car:TrafficCar){const m=this.motions.get(car);return {turning:!!m?.turn,nextRoundabout:!!m?.next?.r.roundabout};}
  private choose(e:Edge){
    let options=this.neighbors.get(e.b.id)!.filter(id=>id!==e.a.id);
    if(!options.length)options=this.neighbors.get(e.b.id)!;
    if(!options.length)throw new Error(`Traffic dead end at ${e.b.id}`);
    return this.edges.get(`${e.b.id}>${options[Math.floor(this.random()*options.length)]}`)!;
  }
  private turn(e:Edge,next:Edge){
    const a=this.point(e,e.end),b=this.point(next,next.start),gap=Math.hypot(b.x-a.x,b.z-a.z);
    const h=Math.max(.1,Math.min(12,gap*.58));
    const p1={x:a.x+e.ux*h,z:a.z+e.uz*h},p2={x:b.x-next.ux*h,z:b.z-next.uz*h};
    const points=Array.from({length:17},(_,i)=>{
      const t=i/16,u=1-t;return {x:u*u*u*a.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*b.x,z:u*u*u*a.z+3*u*u*t*p1.z+3*u*t*t*p2.z+t*t*t*b.z};
    });
    const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]!+Math.hypot(points[i]!.x-points[i-1]!.x,points[i]!.z-points[i-1]!.z));
    return {points,lengths,length:lengths[16]!,distance:0};
  }
  update(cars:TrafficCar[],player:Vehicle,dt:number){
    this.elapsed+=dt;
    for(const car of cars){
      let m=this.motions.get(car);if(!m){const e=this.edges.get(`${car.from}>${car.to}`)!;m={edge:e,distance:Math.max(e.start,Math.min(e.end,(car.x-e.a.x)*e.ux+(car.z-e.a.z)*e.uz))};this.motions.set(car,m);}
      const e=m.edge,remaining=e.end-m.distance,junction=this.incident.get(e.b.id)!.length>=3;
      const circleEntry=!e.r.roundabout&&this.incident.get(e.b.id)!.some(r=>r.roundabout);
      const signal=junction&&!circleEntry&&!e.r.roundabout;
      car.wait=Math.max(0,car.wait-dt);car.nearMissCooldown=Math.max(0,car.nearMissCooldown-dt);
      const fx=Math.sin(car.heading),fz=Math.cos(car.heading);
      let blocked=car.wait>0||(!m.turn&&signal&&this.horizontalGreen!==(Math.abs(e.ux)>Math.abs(e.uz))&&remaining<3);
      for(const other of cars){if(other===car)continue;const dx=other.x-car.x,dz=other.z-car.z,ahead=dx*fx+dz*fz;
        if(ahead>0&&ahead<8&&Math.abs(dx*fz-dz*fx)<2.4)blocked=true;
        if(circleEntry&&!m.turn&&remaining<4&&this.edges.get(`${other.from}>${other.to}`)?.r.roundabout&&Math.hypot(other.x-e.b.x,other.z-e.b.z)<13)blocked=true;
      }
      const dx=player.x-car.x,dz=player.z-car.z;if(dx*fx+dz*fz>0&&dx*fx+dz*fz<7&&Math.abs(dx*fz-dz*fx)<2.7)blocked=true;
      const target=blocked?0:m.turn||e.r.roundabout?6.5:8+car.id%4;
      car.speed+=(target-car.speed)*Math.min(1,dt*5);
      let travel=car.speed*dt;const old={x:car.x,z:car.z};
      for(let guard=0;guard<5;guard++){
        if(m.turn){const turn=m.turn;const used=Math.min(travel,turn.length-turn.distance);turn.distance+=used;travel-=used;
          let i=1;while(i<16&&turn.lengths[i]!<turn.distance)i++;
          const den=turn.lengths[i]!-turn.lengths[i-1]!,p=lerp(turn.points[i-1]!,turn.points[i]!,den>1e-6?(turn.distance-turn.lengths[i-1]!)/den:1);car.x=p.x;car.z=p.z;
          if(turn.distance>=turn.length-1e-6){m.edge=m.next!;m.distance=m.edge.start;car.from=m.edge.a.id;car.to=m.edge.b.id;m.turn=undefined;m.next=undefined;}else break;
        }else{
          const used=Math.min(travel,m.edge.end-m.distance);m.distance+=used;travel-=used;Object.assign(car,this.point(m.edge,m.distance));
          if(m.distance>=m.edge.end-1e-6){m.next=this.choose(m.edge);m.turn=this.turn(m.edge,m.next);}else break;
        }
        if(travel<1e-6)break;
      }
      if(Math.hypot(car.x-old.x,car.z-old.z)>.0001)car.heading=Math.atan2(car.x-old.x,car.z-old.z);
    }
  }
}
