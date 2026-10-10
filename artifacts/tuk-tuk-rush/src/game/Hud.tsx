import { useMemo } from 'react';
import { Pause } from 'lucide-react';
import type { District, GameSnapshot, RoadNode } from './types';

export type Frame = { snap: GameSnapshot; px: number; pz: number; ph: number; hit: number };

export function fmtTime(s: number) {
  const t = Math.max(0, Math.ceil(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

function route(d: District, from: RoadNode, to: RoadNode): RoadNode[] {
  const nm = new Map(d.nodes.map((n) => [n.id, n]));
  const dist = new Map<string, number>([[from.id, 0]]);
  const prev = new Map<string, string>();
  const open = new Set([from.id]);
  while (open.size) {
    let cur = '', best = Infinity;
    for (const id of open) { const v = dist.get(id)!; if (v < best) { best = v; cur = id; } }
    open.delete(cur);
    if (cur === to.id) break;
    const c = nm.get(cur)!;
    for (const r of d.roads) {
      const o = r.a === cur ? r.b : r.b === cur ? r.a : null;
      const n = o && nm.get(o);
      if (!o || !n) continue;
      const nd = best + Math.hypot(n.x - c.x, n.z - c.z);
      if (nd < (dist.get(o) ?? Infinity)) { dist.set(o, nd); prev.set(o, cur); open.add(o); }
    }
  }
  if (!prev.has(to.id) && from.id !== to.id) return [from, to];
  const out: RoadNode[] = [];
  let at: string | undefined = to.id;
  while (at) { out.unshift(nm.get(at)!); at = prev.get(at); }
  return out;
}

const VIEW = 125;

export function fmtClock(s: number) {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

export function Minimap({ d, f }: { d: District; f: Frame }) {
  const base = useMemo(() => {
    const nm = new Map(d.nodes.map((n) => [n.id, n]));
    return (
      <g>
        {d.buildings.map((b, i) => <rect key={i} x={-b.x - b.w / 2} y={-b.z - b.d / 2} width={b.w} height={b.d} fill="#5a3350" opacity={0.55} />)}
        {d.roads.map((r, i) => {
          const a = nm.get(r.a), b = nm.get(r.b);
          if (!a || !b) return null;
          return <line key={i} x1={-a.x} y1={-a.z} x2={-b.x} y2={-b.z} stroke={r.shortcut ? '#8a6a52' : r.width >= 12 ? '#ffe2b0' : '#c9a98a'} strokeWidth={Math.max(r.width, 5)} strokeLinecap="round" opacity={r.width >= 12 ? 0.95 : 0.75} />;
        })}
        {d.landmarks.map((l, i) => <circle key={i} cx={-l.x} cy={-l.z} r={9} fill={l.kind === 'gate' ? '#e8452c' : l.kind === 'temple' ? '#f7b733' : '#2bb39a'} stroke="#2a0f1e" strokeWidth={2} />)}
      </g>
    );
  }, [d]);
  const { snap, px, pz, ph } = f;
  const hd = (ph * 180) / Math.PI;
  const path = useMemo(() => {
    let start = d.nodes[0], bd = Infinity;
    for (const n of d.nodes) { const v = Math.hypot(n.x - px, n.z - pz); if (v < bd) { bd = v; start = n; } }
    return route(d, start, snap.target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, snap.target.id, Math.round(px / 40), Math.round(pz / 40)]);
  const pts = [`${-px},${-pz}`, ...path.map((n) => `${-n.x},${-n.z}`)].join(' ');
  const vx = -(snap.target.x - px), vy = -(snap.target.z - pz);
  const c = Math.cos(ph), s = Math.sin(ph);
  let tx = vx * c - vy * s, ty = vx * s + vy * c;
  const tl = Math.hypot(tx, ty);
  if (tl > VIEW - 12) { tx = (tx / tl) * (VIEW - 12); ty = (ty / tl) * (VIEW - 12); }
  const col = snap.stage === 'pickup' ? '#ffd23f' : '#ff4f8b';
  return (
    <svg className="tt-minimap" viewBox={`${-VIEW} ${-VIEW} ${VIEW * 2} ${VIEW * 2}`} data-testid="minimap">
      <defs><clipPath id="mmclip"><circle r={VIEW - 2} /></clipPath></defs>
      <circle r={VIEW} fill="#2a0f1e" />
      <g clipPath="url(#mmclip)">
        <g transform={`rotate(${hd}) translate(${px} ${pz})`}>
          {base}
          <polyline points={pts} fill="none" stroke={col} strokeWidth={4} strokeDasharray="8 6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <circle cx={tx} cy={ty} r={9} fill={col} stroke="#2a0f1e" strokeWidth={3}>
          <animate attributeName="r" values="8;12;8" dur="1.2s" repeatCount="indefinite" />
        </circle>
        <polygon points="0,-13 9,10 0,5 -9,10" fill="#ff4f8b" stroke="#fff0d2" strokeWidth={2.5} />
      </g>
      <circle r={VIEW - 2} fill="none" stroke="#fff0d2" strokeWidth={4} opacity={0.8} />
    </svg>
  );
}

export function Hud({ d, f, shift, onPause }: { d: District; f: Frame; shift: boolean; onPause: () => void }) {
  const s = f.snap;
  const pick = s.stage === 'pickup';
  return (
    <div className="tt-hud">
      <div className="tt-hud-tl">
        <Minimap d={d} f={f} />
        <div className="tt-stats">
          <div className="tt-chip tt-money" data-testid="text-earnings">฿ {Math.round(s.earnings).toLocaleString()}</div>
          <div className="tt-chip" data-testid="text-score">SCORE {Math.round(s.score).toLocaleString()}</div>
          <div className="tt-chip tt-dim" data-testid="text-deliveries">FARES {s.deliveries}</div>
        </div>
      </div>
      <div className="tt-hud-tc">
        {shift && <div className={`tt-timer ${s.shiftTime < 20 ? 'low' : ''}`} data-testid="text-shift-time">{fmtTime(s.shiftTime)}</div>}
        <div className={`tt-mission ${pick ? 'pickup' : 'drop'}`} data-testid="text-mission">
          <svg className="tt-arrow" viewBox="-12 -12 24 24" style={{ transform: `rotate(${-s.bearing}rad)` }}>
            <polygon points="0,-10 8,8 0,3 -8,8" fill="currentColor" />
          </svg>
          <div>
            <b>{pick ? 'PICK UP' : 'DROP OFF'}</b>
            <em data-testid="text-destination">{s.target.name ?? ''}</em>
            <span>{s.passenger} · {Math.round(s.distance)} m{pick ? '' : ` · trip ${fmtClock(s.tripTime)}`}</span>
          </div>
        </div>
        {s.message && <div className="tt-msg" key={s.message} data-testid="text-message">{s.message}</div>}
      </div>
      <button className="tt-icon-btn tt-pause" onClick={onPause} aria-label="Pause" data-testid="button-pause"><Pause size={22} /></button>
      <div className="tt-speed"><b data-testid="text-speed">{Math.round(Math.abs(s.speed))}</b><span>km/h</span></div>
      {s.boarding > 0 && s.boarding < 1 && <div className="tt-board"><i style={{ transform: `scaleX(${s.boarding})` }} /></div>}
      <div className="tt-vignette" style={{ opacity: Math.min(1, f.hit) * 0.8 }} />
    </div>
  );
}
