import { turnAllowed,type TurnIndex } from "./trafficLaw";

/** Directed, source-verified A* with incoming WAY in the search state.
 * Node-only Dijkstra is incorrect for OSM `no_* / only_*` turn relations:
 * the legal outgoing edge depends on the way the vehicle arrived on.
 *
 * No new global adjacency structure: reuse the already packed graph arrays.
 * Sparse Maps cover only this route's searched directed states. Runtime and
 * memory stay bounded on an iPhone; unresolved conditional restrictions are
 * never silently fabricated as permanent prohibitions.
 */
export type LegalRoutingGraph={
  x:Float32Array;z:Float32Array;
  a:Uint32Array;b:Uint32Array;way:Uint32Array;
  offsets:Uint32Array;incident:Uint32Array;
  directions:Int8Array;motorAllowed:Uint8Array;
};
export type LegalRouteSeed={
  node:number;cost:number;
  /** Way the vehicle actually arrived from, not the nearest arbitrary way. */
  incomingWay?:number;
};
type Entry={key:number;score:number};
class MinHeap{
  private q:Entry[]=[];
  push(key:number,score:number){
    const a=this.q,v={key,score};let i=a.length;a.push(v);
    while(i){const j=(i-1)>>1;if(a[j]!.score<=score)break;
      a[i]=a[j]!;i=j;}
    a[i]=v;
  }
  pop():Entry|undefined{
    const a=this.q,top=a[0];if(!top)return;
    const end=a.pop()!;
    if(a.length){
      let i=0;
      while(i*2+1<a.length){
        let j=i*2+1;
        if(j+1<a.length&&a[j+1]!.score<a[j]!.score)j++;
        if(a[j]!.score>=end.score)break;
        a[i]=a[j]!;i=j;
      }
      a[i]=end;
    }
    return top;
  }
}
export function sourceLegalRoute(
  graph:LegalRoutingGraph,
  sourceWayCount:number,
  seeds:readonly LegalRouteSeed[],
  destination:number,
  turns:TurnIndex,
  maxStates=200000,
):number[]|undefined{
  if(destination<0||destination>=graph.x.length||
     !Number.isInteger(destination)||sourceWayCount<=0||
     !Number.isInteger(sourceWayCount))return;
  const base=sourceWayCount+1;
  const key=(node:number,way:number|undefined)=>
    node*base+(way===undefined?0:way+1);
  const nodeOf=(key:number)=>Math.floor(key/base);
  const incoming=(key:number)=>key%base===0?undefined:key%base-1;
  const heuristic=(n:number)=>Math.hypot(
    graph.x[n]!-graph.x[destination]!,
    graph.z[n]!-graph.z[destination]!,
  );
  const queue=new MinHeap();
  const distance=new Map<number,number>();
  const parents=new Map<number,number>();
  for(const seed of seeds){
    if(!Number.isInteger(seed.node)||seed.node<0||
       seed.node>=graph.x.length||!Number.isFinite(seed.cost)||
       seed.cost<0)continue;
    const id=key(seed.node,seed.incomingWay);
    const old=distance.get(id);
    if(old===undefined||seed.cost<old){
      distance.set(id,seed.cost);queue.push(id,seed.cost+heuristic(seed.node));
    }
  }
  let expanded=0;
  for(let at=queue.pop();at;at=queue.pop()){
    const n=nodeOf(at.key),g=distance.get(at.key);
    if(g===undefined||at.score>g+heuristic(n)+1e-6)continue;
    if(n===destination){
      const nodes=[n];let cursor=at.key;
      while(parents.has(cursor)){
        cursor=parents.get(cursor)!;
        nodes.push(nodeOf(cursor));
      }
      return nodes.reverse();
    }
    if(++expanded>maxStates)return;
    for(let j=graph.offsets[n]!;j<graph.offsets[n+1]!;j++){
      const edge=graph.incident[j]!,w=graph.way[edge]!;
      if(!graph.motorAllowed[w]!)continue;
      const dir=graph.directions[w]!;
      if(dir===1&&graph.a[edge]!==n)continue;
      if(dir===-1&&graph.b[edge]!==n)continue;
      if(!turnAllowed(turns,n,incoming(at.key),w))continue;
      const to=graph.a[edge]===n?graph.b[edge]!:graph.a[edge]!;
      if(to===n)continue;
      const next=key(to,w);
      const nextG=g+Math.hypot(graph.x[to]!-graph.x[n]!,
        graph.z[to]!-graph.z[n]!);
      if(nextG>= (distance.get(next)??Infinity)-1e-8)continue;
      distance.set(next,nextG);parents.set(next,at.key);
      queue.push(next,nextG+heuristic(to));
    }
  }
  return;
}
