import { bangRakCompletionState } from "./bangRakCompletion";
import { bangRakSeamState } from "./bangRakSeam";
import type { District, Point } from "../types";
import type { StreetPerson } from "../streetLife";
import { bangRakState, bangRakLocal } from "./bangRakPlan";
/** Staged people share the existing 360-candidate/32-visible budget. Full paths
 * are sampled against production collision and road clearance, not endpoints. */
export function bangRakPeople(d: District, clear: (p: Point) => boolean) {
  const state = bangRakState(d);
  if (!state) return [];
  const people: StreetPerson[] = [];
  const add = (
    start: Point,
    end: Point,
    heading: number,
    pose: StreetPerson["pose"],
    role: StreetPerson["role"],
  ) => {
    const steps = Math.ceil(Math.hypot(end.x - start.x, end.z - start.z) / 0.4);
    for (let i = 0; i <= steps; i++) {
      const t = steps ? i / steps : 0;
      if (
        !clear({
          x: start.x + (end.x - start.x) * t,
          z: start.z + (end.z - start.z) * t,
        })
      )
        return;
    }
    people.push({
      ...start,
      start,
      end,
      heading,
      pose,
      role,
      seed: 2100 + people.length,
      height: 0.98,
      region: "bang-rak",
    });
  };
  for (const z of [952, 960, 1014, 1022])
    add({ x: 94, z }, { x: 94, z: z + 2 }, Math.PI / 2, "talk", "customer");
  for (const p of state.parcels) {
    const b = p.body,
      F = b.d / 2;
    for (const [i, u] of [-b.w * 0.22, b.w * 0.2].entries()) {
      const start = bangRakLocal(b, u, F + 1.4),
        end = bangRakLocal(b, u + 3, F + 1.4);
      add(
        start,
        i ? start : end,
        (b.yaw ?? 0) + Math.PI,
        i ? (p.trade === "workshop" ? "work" : "browse") : undefined,
        i ? (p.trade === "workshop" ? "vendor" : "customer") : "walker",
      );
    }
  }
  const completion=bangRakCompletionState(d);
  const original=people.splice(0,completion?8:16);
  people.length=0;
  for(const b of bangRakSeamState(d)?.parcels??[]) {
    const F=b.d/2;
    const start=bangRakLocal(b,-b.w*.2,F+1.5),end=bangRakLocal(b,b.w*.2,F+1.5);
    add(start,end,(b.yaw??0)+Math.PI,undefined,"walker");
    if(people.length>=(completion?8:16))break;
  }
  if(completion) {
    const candidates=completion.parcels;
    for(let i=0;i<16;i++) {
      const b=candidates[Math.floor(i*candidates.length/16)];if(!b)continue;
      const start=bangRakLocal(b,-b.w*.25,b.d/2+1.4),end=bangRakLocal(b,b.w*.25,b.d/2+1.4);
      const vendor=i%4===0;
      add(start,vendor?start:end,(b.yaw??0)+Math.PI,vendor?"work":undefined,vendor?"vendor":"walker");
    }
  }
  return [...original,...people].slice(0,32);
}
