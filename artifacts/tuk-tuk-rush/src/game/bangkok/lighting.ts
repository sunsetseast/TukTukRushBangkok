import * as T from "three";
const stages = [
  {
    t: 0,
    sky: "#e5a18c",
    fill: "#9ca9e7",
    ground: "#85728a",
    key: "#ffd1a0",
    ambient: 0.72,
    sun: 2.65,
    exposure: 0.95,
  },
  {
    t: 55,
    sky: "#d88bab",
    fill: "#a2a9e5",
    ground: "#85758b",
    key: "#ffb878",
    ambient: 0.76,
    sun: 2.15,
    exposure: 0.97,
  },
  {
    t: 145,
    sky: "#69628f",
    fill: "#a1b5f1",
    ground: "#697d9d",
    key: "#e8b5cf",
    ambient: 0.86,
    sun: 0.78,
    exposure: 1.03,
  },
  {
    t: 240,
    sky: "#233659",
    fill: "#a6c3ed",
    ground: "#687e9d",
    key: "#a4bff0",
    ambient: 0.98,
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
