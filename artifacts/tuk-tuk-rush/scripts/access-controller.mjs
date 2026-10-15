/** Deterministic controller-only arrival QA. A pose is set once on a public road;
 * every subsequent position comes from the production vehicle controller. */
export function accessJourney(d, site) {
  const nodes=new Map(d.nodes.map(n=>[n.id,n]));
  const publicEdge=d.roads.find(r=>!r.destinationId&&(r.b===site.publicNode||!r.oneWay&&r.a===site.publicNode));
  const exitEdge=d.roads.find(r=>!r.destinationId&&(r.a===site.publicNode||!r.oneWay&&r.b===site.publicNode));
  if(!publicEdge)throw Error(`No public approach: ${site.id}`);
  const start=publicEdge.a===site.publicNode?publicEdge.b:publicEdge.a;
  const exit=exitEdge.a===site.publicNode?exitEdge.b:exitEdge.a;
  const route=(from,to)=>{const queue=[from],prev=new Map([[from,null]]);for(const id of queue){if(id===to)break;for(const r of d.roads){const n=r.a===id?r.b:!r.oneWay&&r.b===id?r.a:null;if(n&&!prev.has(n)){prev.set(n,id);queue.push(n);}}}if(!prev.has(to))throw Error(`Disconnected ${from}>${to}`);const ids=[];for(let id=to;id;id=prev.get(id))ids.unshift(id);return ids.map(id=>nodes.get(id));};
  return {inbound:route(start,site.arrivalNode),outbound:route(site.arrivalNode,exit)};
}
export function driveControl(e, route, state) {
  const p=e.model.player;
  while(state.index<route.length-1&&Math.hypot(p.x-route[state.index].x,p.z-route[state.index].z)<3.8)state.index++;
  const b=route[state.index],a=route[state.index-1];
  const last=state.index===route.length-1,distance=Math.hypot(p.x-b.x,p.z-b.z),stop=last&&distance<3;
  const error=Math.atan2(Math.sin(Math.atan2(b.x-p.x,b.z-p.z)-p.heading),Math.cos(Math.atan2(b.x-p.x,b.z-p.z)-p.heading));
  const arrival=a.id.startsWith('arrival:')||b.id.startsWith('arrival:');
  const speed=last&&distance<12?3.5:Math.abs(error)>.35?4.5:arrival?7:10;
  const input={steer:stop?0:Math.max(-1,Math.min(1,-error*2.3)),gas:!stop&&p.speed<speed,brake:stop?p.speed>.1:p.speed>speed+.4};
  if(stop&&Math.abs(p.speed)<.25)state.done=true;
  return input;
}
