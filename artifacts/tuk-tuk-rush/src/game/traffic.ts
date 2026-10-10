import type { District, RoadNode, TrafficCar, Vehicle } from './types';

export class TrafficSystem {
  private nodes: Map<string, RoadNode>;
  private neighbors = new Map<string, string[]>();
  private seed = 982;
  private elapsed = 0;
  constructor(private district: District) {
    this.nodes = new Map(district.nodes.map(n => [n.id, n]));
    for (const node of district.nodes) this.neighbors.set(node.id, []);
    for (const road of district.roads.filter(r => !r.shortcut)) {
      this.neighbors.get(road.a)!.push(road.b); this.neighbors.get(road.b)!.push(road.a);
    }
  }
  private random() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }
  create(): TrafficCar[] {
    const colors = ['#ed58a3', '#34b5a5', '#ffcd45', '#eb6c4b', '#c3d5de'];
    return Array.from({ length: 12 }, (_, id) => {
      const from = this.district.nodes[(id * 7 + 4) % this.district.nodes.length]!.id;
      const neighbors = this.neighbors.get(from)!;
      const to = neighbors[id % neighbors.length]!;
      const a = this.nodes.get(from)!, b = this.nodes.get(to)!;
      const t = 0.15 + this.random() * 0.7;
      const heading = Math.atan2(b.x - a.x, b.z - a.z);
      return { id, from, to, x: a.x + (b.x - a.x) * t + Math.cos(heading) * 4,
        z: a.z + (b.z - a.z) * t - Math.sin(heading) * 4, heading,
        speed: 7 + id % 4, kind: id % 4 === 0 ? 'motorcycle' : id % 3 === 0 ? 'car' : 'taxi',
        color: colors[id % colors.length]!, wait: 0, nearMissCooldown: 0 };
    });
  }
  update(cars: TrafficCar[], player: Vehicle, dt: number) {
    this.elapsed += dt;
    for (const car of cars) {
      car.nearMissCooldown = Math.max(0, car.nearMissCooldown - dt);
      car.wait = Math.max(0, car.wait - dt);
      const a = this.nodes.get(car.from)!, b = this.nodes.get(car.to)!;
      const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
      const ux = dx / length, uz = dz / length;
      const targetX = b.x + uz * 4, targetZ = b.z - ux * 4;
      const remaining = (targetX - car.x) * ux + (targetZ - car.z) * uz;
      const horizontal = Math.abs(dx) > Math.abs(dz);
      // Alternating intersection phases, plus local yielding/spacing.
      const green = (Math.floor(this.elapsed / 9) % 2 === 0) === horizontal;
      let blocked = car.wait > 0 || (!green && remaining < 16 && remaining > 6);
      for (const other of cars) {
        if (other === car) continue;
        const ox = other.x - car.x, oz = other.z - car.z;
        const ahead = ox * ux + oz * uz;
        if (ahead > 0 && ahead < 9 && Math.abs(ox * uz - oz * ux) < 3) blocked = true;
      }
      const px = player.x - car.x, pz = player.z - car.z;
      if (px * ux + pz * uz > 0 && px * ux + pz * uz < 8 && Math.abs(px * uz - pz * ux) < 3) blocked = true;
      car.speed += ((blocked ? 0 : 8 + car.id % 4) - car.speed) * Math.min(1, dt * 4);
      car.x += ux * car.speed * dt; car.z += uz * car.speed * dt;
      if (remaining < 0.8) {
        const next = this.neighbors.get(car.to)!.filter(id => id !== car.from);
        const chosen = next[Math.floor(this.random() * next.length)] ?? car.from;
        car.from = car.to; car.to = chosen;
        const end = this.nodes.get(chosen)!;
        car.heading = Math.atan2(end.x - b.x, end.z - b.z);
        car.x = b.x + Math.cos(car.heading) * 4; car.z = b.z - Math.sin(car.heading) * 4;
        car.wait = 0.25 + car.id % 3 * 0.12;
      }
    }
  }
}
