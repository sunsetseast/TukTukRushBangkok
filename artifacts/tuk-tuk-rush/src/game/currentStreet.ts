import type { District, Point, Road } from "./types";
import { distanceToSegment } from "./world";
import { chinatownStreetName } from "./bangkok/chinatownPlan";
import { STREET_NAMES } from "./bangkok/signPlacement";
type Segment = {
  road: Road;
  a: Point;
  b: Point;
  english: string;
  thai?: string;
  key: string;
};
export type CurrentStreet = {
  english: string;
  thai?: string;
  corridor: string;
};
const indexes = new WeakMap<District, Map<string, Segment[]>>();
function streetIndex(d: District) {
  let index = indexes.get(d);
  if (index) return index;
  index = new Map();
  indexes.set(d, index);
  const nodes = new Map(d.nodes.map((n) => [n.id, n]));
  for (const road of d.roads) {
    if (
      road.destinationId ||
      road.surface === "arrival" ||
      road.shortcut ||
      !road.name
    )
      continue;
    const verified = chinatownStreetName(road.corridor ?? ""),
      named = STREET_NAMES.find((n) => n[0] === road.corridor);
    if (
      !verified &&
      !named &&
      /access|arrival|connector|service|junction|approach/i.test(road.name)
    )
      continue;
    const a = nodes.get(road.a)!,
      b = nodes.get(road.b)!,
      s = {
        road,
        a,
        b,
        english: verified?.name ?? named?.[2] ?? road.name,
        thai: verified?.thai ?? named?.[1],
        key: road.corridor ?? road.name,
      };
    const pad = road.width / 2 + 12;
    for (
      let x = Math.floor((Math.min(a.x, b.x) - pad) / 64);
      x <= Math.floor((Math.max(a.x, b.x) + pad) / 64);
      x++
    )
      for (
        let z = Math.floor((Math.min(a.z, b.z) - pad) / 64);
        z <= Math.floor((Math.max(a.z, b.z) + pad) / 64);
        z++
      ) {
        const k = x + ":" + z;
        if (!index.has(k)) index.set(k, []);
        index.get(k)!.push(s);
      }
  }
  return index;
}
/** One spatial-cell query at most 5Hz. Intersections retain the reliable street
 * until a heading-consistent alternative wins twice. Unnamed arrival/service
 * roads and short off-road excursions retain the last real named street. */
export class CurrentStreetTracker {
  private index: Map<string, Segment[]>;
  private lastAt = -Infinity;
  private pending = "";
  private wins = 0;
  current: CurrentStreet | undefined;
  queries = 0;
  lastCandidateCount = 0;
  constructor(d: District) {
    this.index = streetIndex(d);
  }
  update(p: Point, heading: number, now: number) {
    if (now < this.lastAt) {
      this.lastAt = -Infinity;
      this.current = undefined;
      this.pending = "";
      this.wins = 0;
    }
    if (now - this.lastAt < 200) return this.current;
    this.lastAt = now;
    this.queries++;
    const candidates =
      this.index.get(Math.floor(p.x / 64) + ":" + Math.floor(p.z / 64)) ?? [];
    this.lastCandidateCount = candidates.length;
    const ranked = candidates
      .map((s) => {
        const q = distanceToSegment(p, s.a, s.b),
          dx = s.b.x - s.a.x,
          dz = s.b.z - s.a.z,
          len = Math.hypot(dx, dz),
          align =
            1 -
            Math.abs((dx * Math.sin(heading) + dz * Math.cos(heading)) / len);
        return {
          s,
          distance: q.distance,
          score: Math.max(0, q.distance - s.road.width * 0.22) + align * 5,
        };
      })
      .filter((c) => c.distance <= c.s.road.width / 2 + 8)
      .sort((a, b) => a.score - b.score);
    const best = ranked[0];
    if (!best) return this.current;
    if (this.current?.english === best.s.english) {
      this.pending = "";
      this.wins = 0;
      return this.current;
    }
    const old = ranked.find((c) => c.s.english === this.current?.english);
    if (old && old.score < best.score + 2.5) return this.current;
    if (this.pending === best.s.key) this.wins++;
    else {
      this.pending = best.s.key;
      this.wins = 1;
    }
    if (!this.current || this.wins >= 2) {
      this.current = {
        english: best.s.english,
        thai: best.s.thai,
        corridor: best.s.key,
      };
      this.pending = "";
      this.wins = 0;
    }
    return this.current;
  }
}
