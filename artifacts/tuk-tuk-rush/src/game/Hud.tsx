import { useMemo } from "react";
import { CurrentStreetTracker } from "./currentStreet";
import { BangkokMinimap } from "./bangkok/WorldMap";
import { Map as MapIcon, Pause, Clock3 } from "lucide-react";
import { Destination } from "./ui/Destination";
import { Onboarding } from "./ui/Onboarding";
import { guidanceFor, navigationPath } from "./navigation";
import type { District, GameSnapshot } from "./types";

export type Frame = {
  snap: GameSnapshot;
  px: number;
  pz: number;
  ph: number;
  hit: number;
};

export { fmtTime, fmtClock } from "./ui/format";
import { fmtTime } from "./ui/format";

const VIEW = 125;

export function Minimap({ d, f }: { d: District; f: Frame }) {
  const base = useMemo(() => {
    const nm = new Map(d.nodes.map((n) => [n.id, n]));
    return (
      <g>
        {d.buildings.map((b, i) => (
          <rect
            key={i}
            x={-b.x - b.w / 2}
            y={-b.z - b.d / 2}
            width={b.w}
            height={b.d}
            transform={`rotate(${(-(b.yaw ?? 0) * 180) / Math.PI} ${-b.x} ${-b.z})`}
            fill="#5a3350"
            opacity={0.55}
          />
        ))}
        {d.roads.map((r, i) => {
          const a = nm.get(r.a),
            b = nm.get(r.b);
          if (!a || !b) return null;
          return (
            <line
              key={i}
              x1={-a.x}
              y1={-a.z}
              x2={-b.x}
              y2={-b.z}
              stroke={
                r.shortcut ? "#8a6a52" : r.width >= 12 ? "#ffe2b0" : "#c9a98a"
              }
              strokeWidth={Math.max(r.width, 5)}
              strokeLinecap="round"
              opacity={r.width >= 12 ? 0.95 : 0.75}
            />
          );
        })}
        {d.landmarks.map((l, i) => (
          <circle
            key={i}
            cx={-l.x}
            cy={-l.z}
            r={9}
            fill={
              l.kind === "gate"
                ? "#e8452c"
                : l.kind === "temple"
                  ? "#f7b733"
                  : "#2bb39a"
            }
            stroke="#2a0f1e"
            strokeWidth={2}
          />
        ))}
      </g>
    );
  }, [d]);
  const { snap, px, pz, ph } = f;
  const hd = (ph * 180) / Math.PI;
  const path = useMemo(
    () => navigationPath(d, { x: px, z: pz }, snap.target),
    [d, snap.target.id, Math.round(px / 8), Math.round(pz / 8)],
  );
  const pts = [`${-px},${-pz}`, ...path.map((n) => `${-n.x},${-n.z}`)].join(
    " ",
  );
  const vx = -(snap.target.x - px),
    vy = -(snap.target.z - pz);
  const c = Math.cos(ph),
    s = Math.sin(ph);
  let tx = vx * c - vy * s,
    ty = vx * s + vy * c;
  const tl = Math.hypot(tx, ty);
  if (tl > VIEW - 12) {
    tx = (tx / tl) * (VIEW - 12);
    ty = (ty / tl) * (VIEW - 12);
  }
  const col = snap.stage === "pickup" ? "#e8bd77" : "#ed9685";
  return (
    <svg
      className="tt-minimap"
      viewBox={`${-VIEW} ${-VIEW} ${VIEW * 2} ${VIEW * 2}`}
      data-testid="minimap"
    >
      <defs>
        <clipPath id="mmclip">
          <circle r={VIEW - 2} />
        </clipPath>
      </defs>
      <circle r={VIEW} fill="#2a0f1e" />
      <g clipPath="url(#mmclip)">
        <g transform={`rotate(${hd}) translate(${px} ${pz})`}>
          {base}
          <polyline
            points={pts}
            fill="none"
            stroke={col}
            strokeWidth={4}
            strokeDasharray="8 6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <circle
          cx={tx}
          cy={ty}
          r={9}
          fill={col}
          stroke="#2a0f1e"
          strokeWidth={3}
        ></circle>
        <polygon
          points="0,-13 9,10 0,5 -9,10"
          fill="#83d9c4"
          stroke="#fff0d2"
          strokeWidth={2.5}
        />
      </g>
      <circle
        r={VIEW - 2}
        fill="none"
        stroke="#fff0d2"
        strokeWidth={1.5}
        opacity={0.6}
      />
    </svg>
  );
}

export function Hud({
  d,
  f,
  shift,
  onPause,
  onMap,
  active = true,
}: {
  d: District;
  f: Frame;
  shift: boolean;
  onPause: () => void;
  onMap?: () => void;
  active?: boolean;
}) {
  const s = f.snap;
  const streetTracker = useMemo(() => new CurrentStreetTracker(d), [d]);
  const street = streetTracker.update(
    { x: f.px, z: f.pz },
    f.ph,
    performance.now(),
  );
  const guidance = useMemo(
    () => guidanceFor(d, { x: f.px, z: f.pz }, f.ph, s.target),
    [d, s.target.id, f.px, f.pz, f.ph],
  );
  return (
    <div className="tt-hud">
      <div className="tt-hud-tl">
        <button
          className="tt-map-wrap"
          onClick={onMap}
          disabled={!onMap}
          aria-label={onMap ? "Open Bangkok map" : "Chinatown local map"}
          data-testid="button-open-map"
        >
          {d.worldId === "bangkok" ? (
            <BangkokMinimap d={d} f={f} />
          ) : (
            <Minimap d={d} f={f} />
          )}
          <span className="tt-map-caption">
            <MapIcon size={12} />
            {d.worldId === "bangkok" ? s.districtName : "Chinatown"}
          </span>
        </button>
        <div className="tt-drive-session">
          <span className="tt-eyebrow">
            {shift ? "NIGHT SHIFT" : "FREE ROAM"}
          </span>
          {shift && (
            <b
              className={s.shiftTime < 20 ? "low" : ""}
              data-testid="text-shift-time"
            >
              <Clock3 size={12} />
              {fmtTime(s.shiftTime)}
            </b>
          )}
          <span className="tt-session-money" data-testid="text-earnings">
            ฿{Math.round(s.earnings).toLocaleString()} <small>THIS DRIVE</small>
          </span>
        </div>
      </div>
      {street && (
        <div
          className="tt-current-street"
          data-testid="text-current-street"
          aria-label={`Current street: ${street.english}`}
        >
          <span className="tt-street-icon" aria-hidden="true">
            ↗
          </span>
          <div>
            {street.thai && <span lang="th">{street.thai}</span>}
            <b title={street.english}>{street.english}</b>
          </div>
        </div>
      )}
      <Destination f={f} guidance={guidance} active={active} />
      <button
        className="tt-icon-btn tt-pause"
        onClick={onPause}
        aria-label="Pause"
        data-testid="button-pause"
      >
        <Pause size={20} />
      </button>
      {(s.message || s.careerNotice) && (
        <div
          className={`tt-msg ${s.message.startsWith("Delivered") ? "reward" : ""}`}
          key={s.message}
          role="status"
          data-testid="text-message"
        >
          {s.message}
          {s.careerNotice && (
            <small className="tt-career-toast">
              ★ Achievement · {s.careerNotice}
            </small>
          )}
        </div>
      )}
      <div className="tt-speed">
        <div>
          <b data-testid="text-speed">{Math.round(Math.abs(s.speed))}</b>
          <span>km/h</span>
        </div>
        <small>
          <span data-testid="text-deliveries">{s.deliveries} FARES</span>
          <i />
          <span data-testid="text-score">
            {Math.round(s.score).toLocaleString()} PTS
          </span>
        </small>
      </div>
      {active && <Onboarding f={f} mapAvailable={!!onMap} />}
      <div
        className="tt-vignette"
        style={{ opacity: Math.min(1, f.hit) * 0.55 }}
        aria-hidden="true"
      />
    </div>
  );
}
