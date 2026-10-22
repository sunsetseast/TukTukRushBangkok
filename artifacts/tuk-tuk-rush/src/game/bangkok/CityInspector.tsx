import {useMemo,useState} from 'react';
import type {District,Point} from '../types';
import {buildLandmarkRegistry} from './landmarkRegistry';
import {landmarkParcels,rectangleBoundary} from './landmarkParcels';
import {CITY_MODEL,approvedSite} from './cityModel';
import {geographicToDesign} from './geography';
import {riverPolygonPath} from './waterGeometry';
import inventory from '../../../../../data/bangkok/iconic-inventory.v1.json';
const points=(ps:Point[])=>ps.map(p=>`${p.x},${p.z}`).join(' ');
/** DEV-only, lazy loaded. Reads the live generated District; never rebuilds roads. */
export default function CityInspector({d,onClose}:{d:District;onClose:()=>void}) {
 const places=useMemo(()=>buildLandmarkRegistry(d),[d]),parcels=useMemo(()=>landmarkParcels(d),[d]);
 const [selected,setSelected]=useState('swing'),[query,setQuery]=useState(''),[zoom,setZoom]=useState(1),[center,setCenter]=useState<Point>({x:0,z:0});
 const [layers,setLayers]=useState({roads:true,names:false,water:true,transit:true,parks:true,parcels:true,buildings:false,districts:true});
 const p=places.find(p=>p.id===selected),fact=p?.geographicReference,site=approvedSite(selected);
 const projected=fact?geographicToDesign(fact):null;
 const w=5400/zoom,h=5400/zoom;
 const choose=(id:string)=>{setSelected(id);const q=places.find(p=>p.id===id);if(q)setCenter(q.world);};
 return <section className="city-inspector" data-testid="city-inspector" style={{position:'fixed',inset:0,zIndex:1000,background:'#142530',color:'#eef4ed',display:'flex',font:'14px system-ui',overflow:'auto'}}>
  <style>{`.city-inspector p,.city-inspector h2,.city-inspector h3,.city-inspector b,.city-inspector small,.city-inspector label{color:#eef4ed}.city-inspector button{color:#eef4ed;background:#284956;padding:5px 9px;border:1px solid #6a8d96;border-radius:4px}.city-inspector select,.city-inspector input,.city-inspector option{color:#132a32;background:#fff}.city-inspector h2{font-size:20px;margin:12px 0}.city-inspector p{margin:9px 0;line-height:1.4}`}</style>
  <div style={{flex:1,minWidth:300,position:'relative'}}>
   <div style={{padding:12,display:'flex',flexWrap:'wrap',gap:10}}><b>Bangkok {CITY_MODEL.id} · actual world · N ↑</b><button onClick={onClose}>Close</button>
    <button onClick={()=>setZoom(Math.min(8,zoom*1.5))}>+</button><button onClick={()=>setZoom(Math.max(.7,zoom/1.5))}>−</button><button onClick={()=>{setZoom(1);setCenter({x:0,z:0});}}>Entire world</button>
    {Object.entries(layers).map(([k,v])=><label key={k}><input type="checkbox" checked={v} onChange={()=>setLayers({...layers,[k]:!v})}/>{k}</label>)}
   </div>
   <svg role="img" aria-label="Actual generated world inspection map" viewBox={`${center.x-w/2} ${center.z-h/2} ${w} ${h}`} style={{width:'100%',height:'calc(100vh - 110px)',background:'#243b3c'}} onDoubleClick={e=>{const r=e.currentTarget.getBoundingClientRect();setCenter({x:center.x-w/2+(e.clientX-r.left)/r.width*w,z:center.z-h/2+(e.clientY-r.top)/r.height*h});setZoom(Math.min(8,zoom*1.5));}}>
    {layers.districts&&d.regions?.map(r=><polygon key={r.id} points={points(r.polygon)} fill="none" stroke="#668574" strokeWidth={3}><title>{r.name}</title></polygon>)}
    {layers.water&&<g fill="none" stroke="#548baf"><path d={riverPolygonPath(d)} fill="#427f94" fillRule="evenodd" strokeWidth={1}/><polyline points={points(d.river??[])} strokeWidth={2} strokeDasharray="8 6"/>{d.canals?.map((c,i)=><polyline key={i} points={points(c.points)} strokeWidth={c.width}/>)}</g>}
    {layers.parks&&d.publicSpaces?.map(s=><polygon key={s.id} points={points(s.boundary)} fill="#71815b"><title>{s.name}</title></polygon>)}
    {layers.roads&&d.roads.map((r,i)=>{const a=d.nodes.find(n=>n.id===r.a)!,b=d.nodes.find(n=>n.id===r.b)!;return <g key={i}><line x1={a.x} y1={a.z} x2={b.x} y2={b.z} stroke={r.bridge?'#ffe4b2':r.oneWay?'#e9ae75':'#b7bdaf'} strokeWidth={r.width}><title>{r.name} · {r.corridor} · {r.oneWay?'one way':'two way'}</title></line>{layers.names&&i%5===0&&<text x={(a.x+b.x)/2} y={(a.z+b.z)/2} fontSize={14} fill="white">{r.name}</text>}</g>;})}
    {layers.buildings&&d.buildings.map((b,i)=><polygon key={i} points={points(rectangleBoundary(b))} fill="#747e79"/>)}
    {layers.parcels&&parcels.map(s=><polygon key={s.id} points={points(s.boundary)} fill="#c5a95d22" stroke="#c5a95d" strokeWidth={1.4}><title>{s.id} · {s.use}</title></polygon>)}
    {layers.transit&&d.transit?.lines.map(l=><g key={l.id} fill="none" stroke={l.id==='silom'?'#41dbbc':l.id==='gold'?'#ecc04a':'#8bdf6d'}><polyline points={points(l.samples)} strokeWidth={5}/>{l.stations.map(s=><circle key={s.id} cx={s.x} cy={s.z} r={10} fill="white"><title>{s.name} {s.code}</title></circle>)}</g>)}
    {places.map(q=><g key={q.id} onClick={()=>choose(q.id)} style={{cursor:'pointer'}}><circle cx={q.world.x} cy={q.world.z} r={q.id===selected?20:10} fill={q.geographicReference?'#f8d78c':'#d79cae'} stroke="#17212c" strokeWidth={3}><title>{q.name} · {q.coordinateAccuracy}</title></circle></g>)}
    {p?.mainEntrance&&<line x1={p.world.x} y1={p.world.z} x2={p.mainEntrance.x} y2={p.mainEntrance.z} stroke="#fff" strokeWidth={4}/>}
    {p?.vehicleAccess&&<circle cx={p.vehicleAccess.x} cy={p.vehicleAccess.z} r={12} fill="#69d1ff"/>}
   </svg>
   <small>Double-click to center and zoom. Gold: referenced · pink: unverified · blue: vehicle arrival. © OpenStreetMap contributors · ODbL 1.0 (reference facts).</small>
  </div>
  <aside style={{width:340,maxWidth:'40vw',padding:16,overflow:'auto',background:'#10202b'}}>
   <input aria-label="Find destination" placeholder="Find destination" value={query} onChange={e=>setQuery(e.target.value)} style={{width:'100%',color:'black'}}/>
   <select aria-label="Select destination" size={7} value={selected} onChange={e=>choose(e.target.value)} style={{width:'100%',margin:'8px 0',color:'black'}}>{places.filter(p=>p.name.toLowerCase().includes(query.toLowerCase())).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
   {p&&<><h2>{p.name}</h2><p>{p.district} · {p.category}</p><p>{p.coordinateAccuracy}; {p.visualQa}</p>
    <p>WGS84: {fact?`${fact.lat}, ${fact.lon}`:'Not verified'}</p><p>Game feature: {p.world.x.toFixed(2)}, {p.world.z.toFixed(2)}<br/>Model origin: {p.modelOrigin?`${p.modelOrigin.x.toFixed(2)}, ${p.modelOrigin.z.toFixed(2)}`:'Infrastructure derived'}</p>
    <p>Local projection residual: {projected?`${Math.hypot((projected.x-500)*4-p.world.x,(projected.y-600)*4-p.world.z).toFixed(1)} game m`:'Unknown'}. Residual is compression, not surveyed error.</p>
    <p>Yaw: {(p.rotation*180/Math.PI).toFixed(1)}°. {site?.model.placement}</p><p>{p.compression}</p>
    <p>Roads: {p.roadRelationships.join('; ')}<br/>Neighbors: {p.neighbors.join(', ')}</p>
    <p>Parcels: {p.protectedParcels.length} · footprints: {p.footprints.length}<br/>Entrance: {p.mainEntrance?'Recorded':'Unverified'} · vehicle node: {p.vehicleAccess?.nodeId??'none'}</p>
    {p.references.map((s,i)=><p key={s}><a href={s} target="_blank" rel="noreferrer" style={{color:'#8fd7ff'}}>Reference {i+1}</a></p>)}</>}
   <h3>Coverage warnings</h3><p>{inventory.places.filter(p=>p.status==='missing').length} missing iconic sites. Missing sites are inventory records, not fabricated world pins.</p>
   {inventory.places.filter(p=>p.status==='missing').map(p=><p key={p.id}>{p.name} · {p.priority}</p>)}
  </aside>
 </section>;
}
