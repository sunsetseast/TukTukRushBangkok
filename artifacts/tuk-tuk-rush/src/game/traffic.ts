import type { District, Road, RoadNode, TrafficCar, Vehicle } from './types';

/** Left-hand directed road graph; ordinary sampled curve nodes are not signals. */
export class TrafficSystem {
  private nodes: Map<string, RoadNode>;
  private neighbors = new Map<string, string[]>();
  private edges = new Map<string, Road>();
  private degrees = new Map<string, number>();
  private seed = 982;
  private elapsed = 0;
  constructor(private district: District) {
    this.nodes = new Map(district.nodes.map(n => [n.id, n]));
    for (const node of district.nodes) this.neighbors.set(node.id, []);
    for (const road of district.roads) {
      for (const id of [road.a, road.b]) this.degrees.set(id, (this.degrees.get(id) ?? 0) + 1);
      this.neighbors.get(road.a)!.push(road.b);
      this.edges.set(`${road.a}>${road.b}`, road);
      if (!road.oneWay) {
        this.neighbors.get(road.b)!.push(road.a);
        this.edges.set(`${road.b}>${road.a}`, road);
      }
    }
  }
  private random() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }
  get horizontalGreen() { return Math.floor(this.elapsed / 9) % 2 === 0; }
  create(): TrafficCar[] {
    const colors = ['#e872a8', '#4da995', '#e6bc54', '#db8f78', '#b9c9cf'];
    const main = this.district.roads.filter(r => this.district.worldId === 'bangkok' ? r.corridor === 'yaowarat' || r.corridor === 'charoen_s' : r.name === 'Yaowarat Road' && !r.roundabout);
    const support = this.district.roads.filter(r => this.district.worldId === 'bangkok' ? !r.shortcut && !r.bridge && r.corridor !== 'yaowarat' && r.corridor !== 'charoen_s' : r.name === 'Charoen Krung Road');
    // Chinatown's main spine should not look deserted when viewed from the
    // tuk-tuk. 16 vehicles, with extra motorcycles, remain small enough for
    // the existing instanced/batched model and deterministic traffic AI.
    const mainCount=11,supportCount=this.district.worldId === 'bangkok' ? 13 : 5;
    return Array.from({ length: mainCount+supportCount }, (_, id) => {
      const list = id < mainCount ? main : support;
      const road = list[Math.floor((id < mainCount ? id/mainCount :
        (id-mainCount)/supportCount) * list.length)]!;
      const a = this.nodes.get(road.a)!, b = this.nodes.get(road.b)!, t = 0.12 + this.random() * 0.7;
      const heading = Math.atan2(b.x - a.x, b.z - a.z);
      return { id, from: road.a, to: road.b, x: a.x + (b.x - a.x) * t - Math.cos(heading) * Math.min(3, road.width / 4),
        z: a.z + (b.z - a.z) * t + Math.sin(heading) * Math.min(3, road.width / 4), heading,
        speed: 7 + id % 4, kind: id % 3 === 0 ? 'motorcycle' : id % 5 === 0 ? 'car' : 'taxi',
        color: colors[id % colors.length]!, wait: 0, nearMissCooldown: 0 };
    });
  }
  update(cars: TrafficCar[], player: Vehicle, dt: number) {
    this.elapsed += dt;
    for (const car of cars) {
      car.nearMissCooldown = Math.max(0, car.nearMissCooldown - dt);
      car.wait = Math.max(0, car.wait - dt);
      const a = this.nodes.get(car.from)!, b = this.nodes.get(car.to)!;
      const road = this.edges.get(`${car.from}>${car.to}`)!;
      const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
      const ux = dx / length, uz = dz / length;
      const progress = Math.max(0, Math.min(length, (car.x - a.x) * ux + (car.z - a.z) * uz));
      const remaining = length - progress;
      const junction = (this.degrees.get(b.id) ?? 0) >= 3;
      const signal = junction && !road.roundabout && !b.id.startsWith('odeon:');
      const green = this.horizontalGreen === (Math.abs(dx) > Math.abs(dz));
      let blocked = car.wait > 0 || (signal && !green && remaining < 13 && remaining > 5);
      for (const other of cars) {
        if (other === car) continue;
        const ox = other.x - car.x, oz = other.z - car.z;
        if (ox * ux + oz * uz > 0 && ox * ux + oz * uz < 8 && Math.abs(ox * uz - oz * ux) < 2.5) blocked = true;
        // Entering vehicles yield to circulating traffic, without stopping every arc node.
        if (!road.roundabout && b.id.startsWith('odeon:') && remaining < 14 &&
          this.edges.get(`${other.from}>${other.to}`)?.roundabout && Math.hypot(other.x - b.x, other.z - b.z) < 11) blocked = true;
      }
      const px = player.x - car.x, pz = player.z - car.z;
      if (px * ux + pz * uz > 0 && px * ux + pz * uz < 7 && Math.abs(px * uz - pz * ux) < 2.7) blocked = true;
      car.speed += ((blocked ? 0 : road.roundabout ? 6.5 : 8 + car.id % 4) - car.speed) * Math.min(1, dt * 4);
      const lane = road.roundabout ? 0 : Math.min(3, road.width / 4);
      const nextProgress = Math.min(length, progress + car.speed * dt);
      // Ease to junction center for a continuous join; the exact curve remains common data.
      const join = Math.min(1, nextProgress / 5, (length - nextProgress) / 5);
      const targetX = a.x + ux * nextProgress - uz * lane * join;
      const targetZ = a.z + uz * nextProgress + ux * lane * join;
      const oldX = car.x, oldZ = car.z;
      car.x = targetX; car.z = targetZ;
      if (car.speed > 0.2) {
        const desired = Math.atan2(car.x - oldX, car.z - oldZ);
        const delta = Math.atan2(Math.sin(desired - car.heading), Math.cos(desired - car.heading));
        car.heading += delta * Math.min(1, dt * 8);
      }
      if (nextProgress >= length - 0.01) {
        let options = this.neighbors.get(car.to)!.filter(id => id !== car.from);
        if (!options.length) options = this.neighbors.get(car.to)!;
        if (!options.length) throw new Error(`Traffic dead end at ${car.to}`);
        // Roundabout traffic favors continuation, but can take its exits.
        const chosen = options[Math.floor(this.random() * options.length)]!;
        car.from = car.to; car.to = chosen;
        car.x = b.x; car.z = b.z;
        if (signal) car.wait = 0.12;
      }
    }
  }
}
