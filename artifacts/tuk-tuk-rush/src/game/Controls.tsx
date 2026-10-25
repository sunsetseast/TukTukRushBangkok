import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Megaphone, Zap, ChevronsUp, Eye, ArrowDown } from "lucide-react";
import { learn } from "./ui/Onboarding";
import type { GameEngine } from "./engine";

/** Shared input surface for production and the isolated geographic proof. */
export type DrivingControlHost = Pick<GameEngine, 'subscribe' | 'inspectableLandmark' | 'viewLandmark' | 'triggerBoost'> & {
  model: Pick<GameEngine['model'], 'input' | 'snapshot'>;
};

const R = 56;

function Stick({ engine }: { engine: DrivingControlHost }) {
  const zone = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const pid = useRef<number | null>(null);
  const org = useRef({ x: 0, y: 0 });

  const release = useCallback(() => {
    if (pid.current === null) return;
    pid.current = null;
    engine.model.input.steer = 0;
    base.current?.classList.remove("on");
    if (knob.current) knob.current.style.transform = "translate(0px,0px)";
  }, [engine]);

  useEffect(() => {
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("blur", release);
      engine.model.input.steer = 0;
    };
  }, [engine, release]);

  return (
    <div
      ref={zone}
      className="tt-stick-zone"
      data-testid="control-steer"
      onPointerDown={(e) => {
        if (pid.current !== null) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        pid.current = e.pointerId;
        const r = e.currentTarget.getBoundingClientRect();
        org.current = { x: e.clientX, y: e.clientY };
        if (base.current) {
          base.current.style.left = `${e.clientX - r.left}px`;
          base.current.style.top = `${e.clientY - r.top}px`;
          base.current.classList.add("on");
        }
      }}
      onPointerMove={(e) => {
        if (e.pointerId !== pid.current) return;
        const dx = e.clientX - org.current.x,
          dy = e.clientY - org.current.y;
        const l = Math.hypot(dx, dy) || 1,
          k = Math.min(1, l / R);
        if (knob.current)
          knob.current.style.transform = `translate(${(dx / l) * k * R}px,${(dy / l) * k * R}px)`;
        const v = Math.max(-1, Math.min(1, dx / R));
        if (Math.abs(v) > 0.2) learn("steer");
        engine.model.input.steer =
          Math.sign(v) * Math.max(0, (Math.abs(v) - 0.08) / 0.92);
      }}
      onPointerUp={(e) => {
        if (e.pointerId === pid.current) release();
      }}
      onPointerCancel={(e) => {
        if (e.pointerId === pid.current) release();
      }}
      onLostPointerCapture={(e) => {
        if (e.pointerId === pid.current) release();
      }}
    >
      <div className="tt-stick-hint">STEER</div>
      <div ref={base} className="tt-stick-base">
        <div ref={knob} className="tt-stick-knob" />
      </div>
    </div>
  );
}

function Pedal({
  className,
  onActive,
  children,
  testid,
}: {
  className: string;
  onActive: (a: boolean) => void;
  children: ReactNode;
  testid: string;
}) {
  const [down, setDown] = useState(false);
  const pid = useRef<number | null>(null);
  const cb = useRef(onActive);
  cb.current = onActive;
  const release = useCallback(() => {
    pid.current = null;
    setDown(false);
    cb.current(false);
  }, []);
  useEffect(() => {
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("blur", release);
      release();
    };
  }, [release]);
  return (
    <button
      type="button"
      aria-label={
        testid === "button-gas"
          ? "Accelerate"
          : testid === "button-brake"
            ? "Brake and reverse"
            : "Horn"
      }
      aria-pressed={down}
      onKeyDown={(e) => {
        if ((e.code === "Space" || e.code === "Enter") && !e.repeat) {
          e.preventDefault();
          setDown(true);
          cb.current(true);
        }
      }}
      onKeyUp={(e) => {
        if (e.code === "Space" || e.code === "Enter") {
          e.preventDefault();
          setDown(false);
          cb.current(false);
        }
      }}
      onBlur={() => {
        setDown(false);
        cb.current(false);
      }}
      className={`tt-pedal ${className} ${down ? "down" : ""}`}
      data-testid={testid}
      onPointerDown={(e) => {
        if (pid.current !== null) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        pid.current = e.pointerId;
        setDown(true);
        cb.current(true);
      }}
      onPointerUp={(e) => {
        if (e.pointerId === pid.current) release();
      }}
      onPointerCancel={(e) => {
        if (e.pointerId === pid.current) release();
      }}
      onLostPointerCapture={(e) => {
        if (e.pointerId === pid.current) release();
      }}
    >
      {children}
    </button>
  );
}

export function Controls({
  engine,
  onHorn,
}: {
  engine: DrivingControlHost;
  onHorn: () => void;
}) {
  const [snap, setSnap] = useState(engine.model.snapshot);
  useEffect(() => engine.subscribe(setSnap), [engine]);
  const state = snap.boostState ?? "ready",
    meter =
      state === "active"
        ? (snap.boostActive ?? 0) / 5
        : state === "recharging"
          ? 1 - (snap.boostRecharge ?? 0) / 10
          : 1;
  return (
    <div className={`tt-controls boost-${state}`}>
      <Stick engine={engine} />
      {engine.inspectableLandmark && (
        <button
          className="tt-landmark-view"
          data-testid={
            engine.inspectableLandmark.id === "pho"
              ? "button-view-pho"
              : engine.inspectableLandmark.id === "palace"
                ? "button-view-palace"
                : "button-view-landmark"
          }
          onClick={() => engine.viewLandmark()}
        >
          <Eye size={16} />
          <span>LOOK · {engine.inspectableLandmark.name}</span>
        </button>
      )}
      <div className="tt-right">
        <div className="tt-small-row">
          <button
            className={`tt-boost ${state}`}
            data-testid="button-boost"
            aria-label={`Boost ${state}`}
            disabled={state !== "ready"}
            onPointerDown={(e) => {
              e.preventDefault();
              engine.triggerBoost();
            }}
            onClick={(e) => {
              if (e.detail === 0) engine.triggerBoost();
            }}
          >
            <Zap size={18} />
            <b>BOOST</b>
            <span>
              {state === "ready"
                ? "READY"
                : `${Math.ceil(state === "active" ? (snap.boostActive ?? 0) : (snap.boostRecharge ?? 0))}s`}
            </span>
            <i style={{ transform: `scaleX(${meter})` }} />
          </button>

          <Pedal
            className="small"
            testid="button-horn"
            onActive={(a) => a && onHorn()}
          >
            <Megaphone size={20} />
            <span>HORN</span>
          </Pedal>
        </div>
        <div className="tt-pedal-row">
          <Pedal
            className="brake"
            testid="button-brake"
            onActive={(a) => {
              engine.model.input.brake = a;
              if (a) learn("brake");
            }}
          >
            <ArrowDown size={20} />
            <b>BRAKE</b>
            <span>reverse</span>
          </Pedal>
          <Pedal
            className="gas"
            testid="button-gas"
            onActive={(a) => {
              engine.model.input.gas = a;
            }}
          >
            <ChevronsUp size={25} />
            <b>GO</b>
          </Pedal>
        </div>
      </div>
    </div>
  );
}
