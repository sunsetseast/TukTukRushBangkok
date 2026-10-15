import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Frame } from "../Hud";
export const lessons = [
  "accelerate",
  "steer",
  "brake",
  "pickup",
  "map",
  "boost",
] as const;
export type Lesson = (typeof lessons)[number];
const key = "ttr-lessons-v1";
let sessionLessons: Lesson[] | undefined;
function read(): Lesson[] {
  if (sessionLessons) return sessionLessons;
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    sessionLessons = Array.isArray(value)
      ? value.filter((x) => lessons.includes(x))
      : [];
  } catch {
    sessionLessons = [];
  }
  return sessionLessons;
}
export function learn(lesson: Lesson) {
  const done = read();
  if (done.includes(lesson)) return;
  sessionLessons = [...done, lesson];
  try {
    localStorage.setItem(key, JSON.stringify(sessionLessons));
  } catch {
    /* Session hints still complete when storage is unavailable. */
  }
  window.dispatchEvent(new Event("ttr-lesson"));
}
export function Onboarding({
  f,
  mapAvailable = true,
}: {
  f: Frame;
  mapAvailable?: boolean;
}) {
  const [done, setDone] = useState(read),
    [hidden, setHidden] = useState(false),
    lesson = lessons.find(
      (l) => !done.includes(l) && (l !== "map" || mapAvailable),
    );
  useEffect(() => {
    const update = () => setDone(read());
    window.addEventListener("ttr-lesson", update);
    return () => window.removeEventListener("ttr-lesson", update);
  }, []);
  useEffect(() => {
    if (f.snap.speed > 10) learn("accelerate");
    if (f.snap.stage === "delivery") learn("pickup");
    if (f.snap.boostState === "active") learn("boost");
  }, [f.snap.speed, f.snap.stage, f.snap.boostState]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        f.snap.phase !== "playing" ||
        (e.target as HTMLElement).closest("button,input")
      )
        return;
      if (["KeyA", "KeyD", "ArrowLeft", "ArrowRight"].includes(e.code))
        learn("steer");
      if (["KeyS", "ArrowDown", "Space"].includes(e.code)) learn("brake");
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [f.snap.phase]);
  useEffect(() => {
    setHidden(false);
    const t = setTimeout(() => setHidden(true), 9000);
    return () => clearTimeout(t);
  }, [lesson]);
  if (!lesson || hidden) return null;
  const text: Record<Lesson, string> = {
    accelerate: "Hold GO to accelerate",
    steer: "Drag your left thumb to steer",
    brake: "Hold BRAKE to stop; keep holding to reverse",
    pickup: "Follow the gold route. Stop in the ring to board.",
    map: "Tap the minimap to explore Bangkok",
    boost: "Tap BOOST for a five-second burst",
  };
  return (
    <div className="tt-coach" role="status">
      <span>{text[lesson]}</span>
      <button
        aria-label="Dismiss driving tips"
        onClick={() => {
          lessons.forEach(learn);
          setDone([...lessons]);
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
