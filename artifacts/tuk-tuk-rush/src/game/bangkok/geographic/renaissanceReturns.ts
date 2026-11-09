import type { Facade } from "./chinatownFacades";
import type { RuntimeBuilding, BuildingEdge } from "./buildings";
import type { Place } from "./renaissanceArchitecture";
/** Visible, source-backed side elevations at corners. Party walls are excluded
 * by the same source visibility index as retail frontages. No new footprint. */
export function emitRenaissanceReturns(
  f: Facade,
  b: RuntimeBuilding,
  put: Place,
  eligible: (e: BuildingEdge) => boolean,
) {
  const yaw = Math.atan2(f.nx, f.nz),
    song = f.style === "songwat",
    stone = song ? "#e4d4b1" : "#ded2ba";
  const wall = (
    song
      ? ["#cdbb96", "#ddd0ae", "#bbb6a0", "#d8c8aa"]
      : ["#c8b18f", "#b9c5b6", "#d2b9a2", "#9db1b4", "#cebfa4", "#b6b3a5"]
  )[f.seed % (song ? 4 : 6)]!;
  const winding =
    (f.edge.b[1] - f.edge.a[1]) * f.nx - (f.edge.b[0] - f.edge.a[0]) * f.nz > 0
      ? 1
      : -1;
  for (const e of b.edges) {
    if (!eligible(e)) continue;
    const dx = e.b[0] - e.a[0],
      dz = e.b[1] - e.a[1],
      W = Math.hypot(dx, dz);
    if (W < 2) continue;
    const nx = (winding * dz) / W,
      nz = (-winding * dx) / W,
      ang = Math.atan2(nx, nz),
      rotation = ang - yaw;
    const fx = (f.edge.a[0] + f.edge.b[0]) / 2,
      fz = (f.edge.a[1] + f.edge.b[1]) / 2,
      x = (e.a[0] + e.b[0]) / 2,
      z = (e.a[1] + e.b[1]) / 2;
    const place = (
      u: number,
      y: number,
      v: number,
      w: number,
      h: number,
      d: number,
      color: string,
      surface: Parameters<Place>[10] = "plaster",
    ) => {
      const wx = x + Math.cos(ang) * u + nx * v - fx,
        wz = z - Math.sin(ang) * u + nz * v - fz;
      put(
        wx * f.nz - wz * f.nx,
        y,
        wx * f.nx + wz * f.nz,
        w,
        h,
        d,
        color,
        "core",
        "box",
        rotation,
        surface,
      );
    };
    place(0, f.height / 2, 0.042, W - 0.03, f.height, 0.065, wall);
    place(0, f.height - 0.16, 0.16, W, 0.28, 0.42, stone);
    place(0, 3.35, 0.12, W, 0.16, 0.28, stone);
    const bays = Math.max(1, Math.min(4, Math.floor(W / 4.8)));
    for (let j = 0; j < bays; j++) {
      const u = -W / 2 + (W / bays) * (j + 0.5);
      for (let floor = 1; floor < f.floors; floor++) {
        const y = (floor * f.height) / f.floors + (f.height / f.floors) * 0.52,
          hh = Math.min(1.8, (f.height / f.floors) * 0.58),
          ww = Math.min(2, (W / bays) * 0.58);
        place(u, y, 0.09, ww + 0.18, hh + 0.2, 0.13, stone);
        place(u, y, 0.17, ww, hh, 0.045, song ? "#405f51" : "#355460", "panel");
        place(u, y - hh / 2, 0.24, ww + 0.32, 0.1, 0.34, stone);
      }
    }
  }
}
