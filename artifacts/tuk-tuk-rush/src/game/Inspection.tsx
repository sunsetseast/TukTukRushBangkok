import {useEffect,useRef,useState,type PointerEvent} from 'react';
import type {GameEngine} from './engine';
export function Inspection({engine}:{engine:GameEngine}){
 const orbit=engine.inspection,subject=orbit.subject!,root=useRef<HTMLDivElement>(null),surface=useRef<HTMLDivElement>(null),tap=useRef({time:0,x:0,y:0,moved:false}),pointers=useRef(new Map<number,{x:number;y:number}>()),[preset,setPreset]=useState(orbit.viewIndex);
 useEffect(()=>{setPreset(orbit.viewIndex);pointers.current.clear();},[subject]);
 const clear=()=>pointers.current.clear();
 const reset=()=>{clear();orbit.reset();};
 useEffect(()=>{
  engine.clearInput();surface.current?.focus();
  const key=(e:KeyboardEvent)=>{if(e.key==='Tab'){const all=[...(root.current?.querySelectorAll<HTMLElement>('button,[tabindex="0"]')??[])],first=all[0],last=all.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}e.stopPropagation();return;}if(['Enter','Space'].includes(e.code)&&(e.target as HTMLElement).tagName==='BUTTON'){e.stopPropagation();return;}e.preventDefault();e.stopPropagation();switch(e.code){case 'Escape':engine.resume();break;case 'Home':reset();break;case 'ArrowLeft':orbit.rotate(-.12,0);break;case 'ArrowRight':orbit.rotate(.12,0);break;case 'ArrowUp':orbit.rotate(0,.07);break;case 'ArrowDown':orbit.rotate(0,-.07);break;case 'Equal':case 'NumpadAdd':orbit.zoom(.9);break;case 'Minus':case 'NumpadSubtract':orbit.zoom(1.1);break;}};
  const cancel=()=>clear(),wheel=(e:WheelEvent)=>{e.preventDefault();orbit.zoom(Math.exp(e.deltaY*.001));};
  document.addEventListener('keydown',key,true);window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',cancel);surface.current?.addEventListener('wheel',wheel,{passive:false});
  const el=surface.current;return()=>{document.removeEventListener('keydown',key,true);window.removeEventListener('blur',cancel);document.removeEventListener('visibilitychange',cancel);el?.removeEventListener('wheel',wheel);clear();engine.clearInput();};
 },[engine,orbit]);
 const down=(e:PointerEvent<HTMLDivElement>)=>{e.preventDefault();tap.current.moved=false;e.currentTarget.setPointerCapture(e.pointerId);pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});};
 const move=(e:PointerEvent<HTMLDivElement>)=>{
  const old=pointers.current.get(e.pointerId);if(!old)return;if(Math.hypot(e.clientX-old.x,e.clientY-old.y)>2)tap.current.moved=true;e.preventDefault();const before=[...pointers.current.values()];pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(before.length===2){const now=[...pointers.current.values()],a=Math.hypot(before[0]!.x-before[1]!.x,before[0]!.y-before[1]!.y),b=Math.hypot(now[0]!.x-now[1]!.x,now[0]!.y-now[1]!.y);if(a>8&&b>8)orbit.zoom(a/b);orbit.pan(-(e.clientX-old.x)*orbit.distance*.0009,(e.clientY-old.y)*orbit.distance*.0009);}
  else if(before.length===1){const box=e.currentTarget.getBoundingClientRect();orbit.rotate((e.clientX-old.x)/box.width*4,(e.clientY-old.y)/box.height*1.5);}
 };
 const end=(e:PointerEvent<HTMLDivElement>)=>{if(e.type==='pointerup'&&pointers.current.size===1&&!tap.current.moved){const t=tap.current,now=performance.now();if(now-t.time<320&&Math.hypot(e.clientX-t.x,e.clientY-t.y)<24){reset();t.time=0;}else{t.time=now;t.x=e.clientX;t.y=e.clientY;}}pointers.current.delete(e.pointerId);};
 return <div ref={root} className="tt-inspection" role="dialog" aria-modal="true" aria-label={`Look at ${subject.name}`} data-testid={subject.id==='pho'?'pho-inspection':subject.id==='palace'?'palace-inspection':'landmark-inspection'}>
  <div className="tt-inspection-gesture" ref={surface} tabIndex={0} aria-label="Drag to orbit, pinch to zoom, two fingers to pan. Arrow keys rotate; plus and minus zoom; Home resets; Escape returns." data-testid="inspection-gesture" onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onDoubleClick={reset}/>
  <header><b>{subject.name}</b><span>Drag to look · pinch to zoom · two fingers to pan</span></header>
  <footer><nav aria-label="Landmark viewpoints">{subject.views.map((v,i)=><button key={v.id} data-testid={`inspection-view-${v.id}`} aria-pressed={i===preset} onClick={()=>{clear();orbit.choose(i);setPreset(i);}}>{v.label}</button>)}</nav><div><button data-testid="inspection-reset" onClick={reset}>Reset view</button><button data-testid="inspection-return" onClick={()=>engine.resume()}>RETURN TO TUK-TUK</button></div><small>Your shift, fare and boost timers are paused.</small></footer>
 </div>;
}
