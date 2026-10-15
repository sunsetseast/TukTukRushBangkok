import { useEffect, useRef, useState } from "react";
import { ArrowUp, ChevronDown, MapPin, UserRound } from "lucide-react";
import type { Frame } from "../Hud";
import type { Guidance } from "../navigation";
import { approaching, NAVIGATION } from "./banner";
import { fmtClock } from "./format";
export function Destination({
  f,
  guidance,
  active,
}: {
  f: Frame;
  guidance: Guidance;
  active: boolean;
}) {
  const s = f.snap,
    identity = `${s.session ?? 0}:${s.stage}:${s.target.id}`,
    oldIdentity = useRef(identity),
    revision = useRef(0),
    near = useRef(false);
  const [manual, setManual] = useState(0),
    remaining = useRef(0),
    started = useRef(0),
    timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  if (oldIdentity.current !== identity) {
    oldIdentity.current = identity;
    near.current = false;
    remaining.current = 0;
    revision.current++;
  }
  near.current = approaching(near.current, guidance.distance ?? Infinity);
  const arrival = s.distance < NAVIGATION.arrival;
  const expanded =
    near.current || arrival || (manual > 0 && remaining.current > 0);
  useEffect(() => {
    if (!active || remaining.current <= 0) return;
    const generation = revision.current;
    started.current = performance.now();
    timeout.current = setTimeout(() => {
      remaining.current = 0;
      setManual(0);
    }, remaining.current);
    return () => {
      clearTimeout(timeout.current);
      if (revision.current === generation)
        remaining.current = Math.max(
          0,
          remaining.current - (performance.now() - started.current),
        );
    };
  }, [active, manual, identity]);
  const expand = () => {
    revision.current++;
    remaining.current = NAVIGATION.manualMs;
    setManual((n) => n + 1);
  };
  const distance =
    guidance.distance === null
      ? `${Math.round(s.distance)} m direct`
      : guidance.distance >= 1000
        ? `${(guidance.distance / 1000).toFixed(1)} km`
        : `${Math.round(guidance.distance)} m`;
  const instruction = arrival
    ? s.speed >= 6.48
      ? "Brake and stop inside the ring"
      : s.boarding > 0
        ? s.stage === "pickup"
          ? "Passenger boarding…"
          : "Passenger stepping out…"
        : "Stop inside the ring"
    : near.current
      ? "Approaching · stop inside the ring"
      : guidance.distance === null
        ? "No connected road route · check map"
        : "Road route";
  return (
    <div
      className={`tt-destination ${expanded ? "expanded" : "compact"} ${arrival ? "arrived" : ""}`}
      data-mode={
        arrival
          ? "arrival"
          : near.current
            ? "approach"
            : expanded
              ? "manual"
              : "compact"
      }
      data-testid="destination-banner"
    >
      <div className="tt-destination-surface" />
      <button
        className="tt-destination-content"
        onClick={expand}
        aria-expanded={expanded}
        aria-label={`${s.stage === "pickup" ? "Pickup" : "Drop-off"} ${s.target.name}, ${distance}. Tap for five-second trip details.`}
        data-testid="text-mission"
      >
        <div className="tt-nav-direction">
          {arrival || guidance.distance === null ? (
            <MapPin size={22} />
          ) : (
            <ArrowUp
              size={24}
              style={{ transform: `rotate(${-guidance.bearing}rad)` }}
            />
          )}
        </div>
        <div className="tt-nav-copy">
          <span className="tt-eyebrow">
            {s.stage === "pickup" ? "PICKUP" : "DROP-OFF"}
            <span className="tt-nav-distance">{distance}</span>
          </span>
          <b data-testid="text-destination">{s.target.name}</b>
          <span className="tt-nav-extra">
            <UserRound size={12} /> {s.passenger}
            {s.stage === "delivery" && ` · ${fmtClock(s.tripTime)} left`}
          </span>
          <span className="tt-nav-instruction">{instruction}</span>
        </div>
        <ChevronDown className="tt-nav-chevron" size={15} />
        {arrival && (
          <span
            className="tt-boarding"
            role="progressbar"
            aria-label={s.stage === "pickup" ? "Boarding" : "Delivery"}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(s.boarding * 100)}
          >
            <i style={{ transform: `scaleX(${s.boarding})` }} />
          </span>
        )}
      </button>
    </div>
  );
}
