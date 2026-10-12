import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { District, Point } from '../types';
import type { Frame } from '../Hud';
import { regionAt, routeFromPoint, SCALE, toMap } from './world';
const districtLabels: Record<string, string> = { north: 'Chatuchak', khaosan: 'Khao San', oldtown: 'Old Town', westbank: 'Thonburi', chinatown: 'Chinatown', siam: 'Siam', talatnoi: 'Talat Noi', sukhumvit: 'Asok', icon: 'Khlong San', silom: 'Silom / Sathorn', south: 'Asiatique' };
const points = (ps: Point[]) => ps.map(p => { const m = toMap(p); return `${m.x},${m.y}`; }).join(' ');

function MapLayers({ d, f, detail = false, labelScale = 1, placeNames = true }: { d: District; f: Frame; detail?: boolean; labelScale?: number; placeNames?: boolean }) {
  const nodes = useMemo(() => new Map(d.nodes.map(n => [n.id, n])), [d]);
  const visited = f.snap.discoveredDistricts ?? [], shortcuts = f.snap.discoveredShortcuts ?? [];
  const path = useMemo(() => routeFromPoint(d, { x: f.px, z: f.pz }, f.snap.target), [d, f.snap.target.id, Math.round(f.px / 25), Math.round(f.pz / 25)]);
  const p = toMap({ x: f.px, z: f.pz }), target = toMap(f.snap.target);
  return <>
    <rect x="-400" y="-400" width="1800" height="2100" fill="#101e2b" />
    {d.regions?.map(r => <polygon key={r.id} points={points(r.polygon)} fill={r.color} fillOpacity={visited.includes(r.id) ? .6 : .12} stroke={r.color} strokeOpacity=".45" strokeWidth="1" />)}
    {d.obstacles.filter(o => o.protected).map((o, i) => { const m = toMap(o); return <rect key={`park:${i}`} x={m.x - o.w / SCALE / 2} y={m.y - o.d / SCALE / 2} width={o.w / SCALE} height={o.d / SCALE} fill="#34795b" />; })}
    <polyline points={points(d.river ?? [])} stroke="#1e6d87" strokeWidth={(d.riverWidth ?? 0) / SCALE} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {d.roads.map((r, i) => {
      if (r.shortcut && !shortcuts.includes(r.corridor!)) return null;
      const a = nodes.get(r.a)!, b = nodes.get(r.b)!, am = toMap(a), bm = toMap(b);
      if (!detail && (Math.min(a.x, b.x) > f.px + 260 || Math.max(a.x, b.x) < f.px - 260 || Math.min(a.z, b.z) > f.pz + 260 || Math.max(a.z, b.z) < f.pz - 260)) return null;
      const region = regionAt(d, { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 });
      return <line key={i} x1={am.x} y1={am.y} x2={bm.x} y2={bm.y} stroke={r.bridge ? '#58e1d0' : r.shortcut ? '#f3c471' : '#becbd2'} strokeWidth={Math.max(r.width / SCALE, 2)} strokeLinecap="round" opacity={r.width >= 20 || !region || visited.includes(region.id) ? 1 : .25} />;
    })}
    {detail && d.regions?.map(r => {
      const centroid = r.polygon.reduce((p, n) => ({ x: p.x + n.x / r.polygon.length, z: p.z + n.z / r.polygon.length }), { x: 0, z: 0 }), m = toMap(centroid);
      return <text key={r.id} x={m.x} y={m.y} textAnchor="middle" className="tt-world-district" style={{ fontSize: 11 * labelScale, strokeWidth: 3 * labelScale }} opacity={visited.includes(r.id) ? 1 : .55}>{districtLabels[r.id] ?? r.name}</text>;
    })}
    {d.landmarks.filter(l => l.id && f.snap.discoveredLandmarks?.includes(l.id)).map(l => {
      const m = toMap(l), end = m.x > 780;
      return <g key={l.id}><circle cx={m.x} cy={m.y} r={4 * labelScale} fill="#f3c471" stroke="#10212e" strokeWidth={1.5 * labelScale} />
        {detail && placeNames && <text x={m.x + (end ? -9 : 9) * labelScale} y={m.y - 8 * labelScale} textAnchor={end ? 'end' : 'start'} className="tt-world-landmark" style={{ fontSize: 10 * labelScale, strokeWidth: 3 * labelScale }}>{l.name}</text>}
      </g>;
    })}
    <polyline points={points(path)} stroke={f.snap.stage === 'pickup' ? '#ffd23f' : '#ff689b'} strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinejoin="round" fill="none" />
    <circle cx={target.x} cy={target.y} r={6 * labelScale} fill={f.snap.stage === 'pickup' ? '#ffd23f' : '#ff689b'} stroke="#142434" strokeWidth="2" />
    <g transform={`translate(${p.x} ${p.y}) rotate(${180 - f.ph * 180 / Math.PI}) scale(${labelScale})`} data-testid="map-player"><circle r="11" fill="#092637" /><polygon points="0,-10 7,8 0,4 -7,8" fill="#63f2df" stroke="#ecfff9" strokeWidth="1.2" /></g>
  </>;
}
export function BangkokMinimap({ d, f }: { d: District; f: Frame }) {
  const p = toMap({ x: f.px, z: f.pz }), radius = 60;
  return <svg className="tt-minimap tt-bangkok-minimap" viewBox={`${p.x - radius} ${p.y - radius} ${radius * 2} ${radius * 2}`} aria-label="Bangkok local map, north up" data-testid="minimap"><MapLayers d={d} f={f} /><text x={p.x - 51} y={p.y - 43} fill="#f3e0b8" fontSize="10">N ↑</text></svg>;
}
export function WorldMap({ d, f, onClose }: { d: District; f: Frame; onClose: () => void }) {
  const [view, setView] = useState(() => { const p = toMap({ x: f.px, z: f.pz }); return { x: p.x - 160, y: p.y - 192, w: 320, h: 384 }; });
  const [labelScale, setLabelScale] = useState(1);
  const svg = useRef<SVGSVGElement>(null), root = useRef<HTMLDivElement>(null), close = useRef<HTMLButtonElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const [selected, setSelected] = useState('');
  useEffect(() => {
    const resize = () => { const scale = svg.current?.getScreenCTM()?.a; if (scale && Number.isFinite(scale)) setLabelScale(1 / scale); };
    resize();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(resize);
    if (svg.current) observer?.observe(svg.current);
    window.addEventListener('resize', resize);
    return () => { observer?.disconnect(); window.removeEventListener('resize', resize); };
  }, [view]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const keys = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); }
      if (['KeyP', 'KeyR', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.stopPropagation();
      if (e.key === 'Tab') {
        const all = [...(root.current?.querySelectorAll<HTMLElement>('button') ?? [])];
        const first = all[0], last = all.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', keys, true);
    return () => { document.removeEventListener('keydown', keys, true); previous?.focus(); };
  }, [onClose]);
  const zoom = (factor: number) => setView(v => {
    const w = Math.max(160, Math.min(1600, v.w * factor)), h = w * 1.2;
    return { x: v.x + (v.w - w) / 2, y: v.y + (v.h - h) / 2, w, h };
  });
  const pointerDown = (e: PointerEvent<SVGSVGElement>) => { e.currentTarget.setPointerCapture(e.pointerId); pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); };
  const pointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const old = pointers.current.get(e.pointerId); if (!old) return;
    const before = [...pointers.current.values()];
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (before.length === 2) {
      const now = [...pointers.current.values()], previousDistance = Math.hypot(before[0]!.x - before[1]!.x, before[0]!.y - before[1]!.y), distance = Math.hypot(now[0]!.x - now[1]!.x, now[0]!.y - now[1]!.y);
      if (distance > 8 && previousDistance > 8) zoom(previousDistance / distance);
    } else {
      const matrix = svg.current?.getScreenCTM();
      if (matrix) setView(v => ({ ...v, x: v.x - (e.clientX - old.x) / matrix.a, y: v.y - (e.clientY - old.y) / matrix.d }));
    }
  };
  const pointerEnd = (e: PointerEvent<SVGSVGElement>) => { pointers.current.delete(e.pointerId); };
  const recenter = () => { const p = toMap({ x: f.px, z: f.pz }); setView(v => ({ ...v, x: p.x - v.w / 2, y: p.y - v.h / 2 })); };
  return <div className="tt-world-map" role="dialog" aria-modal="true" aria-labelledby="bangkok-map-title" ref={root} data-testid="world-map">
    <header><div><h2 id="bangkok-map-title">Bangkok</h2><p>{f.snap.districtName} · {f.snap.discoveredDistricts?.length ?? 0}/{d.regions?.length} areas discovered</p></div><button ref={close} className="tt-btn" onClick={onClose} data-testid="button-close-map">Back to driving</button></header>
    <div className="tt-world-map-body">
      <svg ref={svg} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={pointerEnd} aria-label="Compact Bangkok, north up. Drag to pan and pinch to zoom."><MapLayers d={d} f={f} detail labelScale={labelScale} placeNames={view.w < 700} /></svg>
      <div className="tt-map-tools"><button aria-label="Zoom in" onClick={() => zoom(.75)}>+</button><button aria-label="Zoom out" onClick={() => zoom(1.33)}>−</button><button onClick={recenter}>My tuk-tuk</button><button onClick={() => setView({ x: -25, y: -30, w: 1050, h: 1260 })}>Whole city</button></div>
      <aside><b>Your next fare</b><p>{f.snap.target.name}</p><span>Dim areas reveal as you drive into them.</span><div className="tt-map-places">{d.landmarks.filter(l => f.snap.discoveredLandmarks?.includes(l.id!)).map(l => <button key={l.id} onClick={() => { const p = toMap(l); setView({ x: p.x - 180, y: p.y - 216, w: 360, h: 432 }); setSelected(l.name); }}>{l.name}</button>)}</div>{selected && <p role="status">Viewing {selected}</p>}</aside>
    </div>
    <footer><span className="tt-map-you">▲ You</span><span>● Landmarks found</span><span>━ River crossings</span><span>North ↑ · distances compressed</span></footer>
  </div>;
}
