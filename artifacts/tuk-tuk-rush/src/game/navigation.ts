import type { District, Point, RoadNode } from "./types";
import { distanceToSegment } from "./world";
type Field = {
  nodes: Map<string, RoadNode>;
  costs: Map<string, number>;
  next: Map<string, string>;
};
const fields = new WeakMap<District, { target: string; field: Field }>();
/** Reverse shortest-path tree, shared by HUD and both maps. One-way edges stay directed. */
function fieldFor(d: District, target: RoadNode): Field {
  const cached = fields.get(d);
  if (cached?.target === target.id) return cached.field;
  const nodes = new Map(d.nodes.map((n) => [n.id, n])),
    incoming = new Map<string, { from: string; length: number }[]>();
  for (const r of d.roads) {
    const a = nodes.get(r.a),
      b = nodes.get(r.b);
    if (!a || !b) continue;
    for (const [from, to] of r.oneWay
      ? [[a, b]]
      : [
          [a, b],
          [b, a],
        ]) {
      const list = incoming.get(to!.id) ?? [];
      list.push({ from: from!.id, length: Math.hypot(a.x - b.x, a.z - b.z) *
        // A narrow two-way service shortcut cannot comfortably pass opposing
        // vehicles. Prefer normal streets for through guidance; keep the lane
        // connected for local destinations and voluntary exploration. This is
        // route-time preference, never a changed access rule or smaller collider.
        (r.shortcut && !r.oneWay && r.width < 7 ? 2 : 1) });
      incoming.set(to!.id, list);
    }
  }
  const costs = new Map<string, number>(),
    next = new Map<string, string>(),
    open = new Set<string>();
  if (nodes.has(target.id)) {
    costs.set(target.id, 0);
    open.add(target.id);
  }
  while (open.size) {
    let at = "",
      best = Infinity;
    for (const id of open)
      if (costs.get(id)! < best) {
        at = id;
        best = costs.get(id)!;
      }
    open.delete(at);
    for (const edge of incoming.get(at) ?? [])
      if (best + edge.length < (costs.get(edge.from) ?? Infinity)) {
        costs.set(edge.from, best + edge.length);
        next.set(edge.from, at);
        open.add(edge.from);
      }
  }
  const field = { nodes, costs, next };
  fields.set(d, { target: target.id, field });
  return field;
}
export function navigationPath(
  d: District,
  p: Point,
  target: RoadNode,
): Point[] {
  if (d.navigation) return d.navigation.path(p,target);
  if (!d.roads.length) return [];
  const { nodes, costs, next } = fieldFor(d, target);
  let road = d.roads[0]!,
    nearest = Infinity;
  for (const r of d.roads) {
    const a = nodes.get(r.a),
      b = nodes.get(r.b);
    if (!a || !b) continue;
    const distance = distanceToSegment(p, a, b).distance;
    if (distance < nearest) {
      nearest = distance;
      road = r;
    }
  }
  const a = nodes.get(road.a),
    b = nodes.get(road.b);
  if (!a || !b) return [];
  const projection = distanceToSegment(p, a, b).point;
  // Already at a junction: allow any legal outgoing edge, not an arbitrary nearest road.
  const junction = [a, b].find((n) => Math.hypot(n.x - p.x, n.z - p.z) < 1);
  const choices = junction
    ? [junction.id]
    : road.oneWay
      ? [road.b]
      : [road.a, road.b];
  let start = "",
    best = Infinity;
  for (const id of choices) {
    const n = nodes.get(id)!;
    const cost =
      Math.hypot(n.x - projection.x, n.z - projection.z) +
      (costs.get(id) ?? Infinity);
    if (cost < best) {
      start = id;
      best = cost;
    }
  }
  if (!start) return []; // Never draw a fictitious straight route across disconnected geography.
  const result: Point[] = [p, ...(junction ? [] : [projection])];
  let id: string | undefined = start;
  for (let guard = 0; id && guard <= nodes.size; guard++) {
    result.push(nodes.get(id)!);
    id = next.get(id);
  }
  // Passenger stops can be a few metres beside their graph node. Preserve
  // that final curbside position so guidance and controller arrivals agree.
  // Only append after reaching the target's connected node; never bridge a
  // missing route with a fabricated straight segment.
  const end = result.at(-1) as RoadNode | undefined;
  if (
    end?.id === target.id &&
    Math.hypot(end.x - target.x, end.z - target.z) <= 8
  )
    result.push({ x: target.x, z: target.z });
  return result.filter(
    (q, i) =>
      !i || Math.hypot(q.x - result[i - 1]!.x, q.z - result[i - 1]!.z) > 0.01,
  );
}
export type Guidance = {
  path: Point[];
  distance: number | null;
  bearing: number;
};
export function guidanceFor(
  d: District,
  p: Point,
  heading: number,
  target: RoadNode,
): Guidance {
  const path = navigationPath(d, p, target);
  let distance = 0,
    look = 22,
    ahead = path.at(-1) ?? p;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!,
      b = path[i]!,
      length = Math.hypot(b.x - a.x, b.z - a.z);
    distance += length;
    if (look > 0 && length > 0) {
      const t = Math.min(1, look / length);
      ahead = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
      look -= length;
    }
  }
  const angle = Math.atan2(ahead.x - p.x, ahead.z - p.z) - heading;
  return {
    path,
    distance: path.length ? distance : null,
    bearing: Math.atan2(Math.sin(angle), Math.cos(angle)),
  };
}
