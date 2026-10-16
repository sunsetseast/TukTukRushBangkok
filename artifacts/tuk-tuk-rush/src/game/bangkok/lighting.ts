import * as T from "three";
const stages = [
  {
    t: 0,
    sky: "#d49b83",
    fill: "#b5ccda",
    ground: "#8a675b",
    key: "#ffcb91",
    ambient: 0.78,
    sun: 2.45,
    exposure: 0.95,
  },
  {
    t: 55,
    sky: "#c8888b",
    fill: "#a8bad4",
    ground: "#74586b",
    key: "#ffb978",
    ambient: 0.76,
    sun: 2.15,
    exposure: 0.97,
  },
  {
    t: 145,
    sky: "#566183",
    fill: "#a6b9e2",
    ground: "#4b526b",
    key: "#dab6bc",
    ambient: 0.77,
    sun: 0.78,
    exposure: 1.03,
  },
  {
    t: 240,
    sky: "#172b44",
    fill: "#9cbbe2",
    ground: "#465462",
    key: "#a8c3e6",
    ambient: 0.83,
    sun: 0.36,
    exposure: 1.08,
  },
].map((s) => ({
  ...s,
  sky: new T.Color(s.sky),
  fill: new T.Color(s.fill),
  ground: new T.Color(s.ground),
  key: new T.Color(s.key),
}));
export function lightingState() {
  return {
    sky: new T.Color(),
    fill: new T.Color(),
    ground: new T.Color(),
    key: new T.Color(),
    ambient: 1,
    sun: 1,
    exposure: 1,
    night: 0,
  };
}
/** Four continuous stages; original full-night deadline remains 240 seconds. */
export function shiftLighting(elapsed: number, out = lightingState()) {
  const i = Math.min(
    stages.length - 2,
    Math.max(
      0,
      stages.findIndex(
        (s, j) => j < stages.length - 1 && elapsed < stages[j + 1]!.t,
      ),
    ),
  );
  const a = elapsed >= 240 ? stages[3]! : stages[i]!,
    b = elapsed >= 240 ? a : stages[i + 1]!,
    f = a === b ? 0 : T.MathUtils.smoothstep(elapsed, a.t, b.t);
  out.sky.copy(a.sky).lerp(b.sky, f);
  out.fill.copy(a.fill).lerp(b.fill, f);
  out.ground.copy(a.ground).lerp(b.ground, f);
  out.key.copy(a.key).lerp(b.key, f);
  out.ambient = T.MathUtils.lerp(a.ambient, b.ambient, f);
  out.sun = T.MathUtils.lerp(a.sun, b.sun, f);
  out.exposure = T.MathUtils.lerp(a.exposure, b.exposure, f);
  out.night = T.MathUtils.smoothstep(elapsed, 55, 240);
  return out;
}
