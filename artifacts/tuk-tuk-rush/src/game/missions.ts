import type { District, Mission, RoadNode, Point } from './types';
import { routeBetween, obstacleDistance, distanceToSegment } from './world';
import { blockedByRiver } from './bangkok/world';
import { physicsObstacleIndex } from './bangkok/clearanceIndex';
export function createMissions(district: District, seed = 1): Mission[] {
    if (district.worldId === 'bangkok') {
        const book = new FareDispatcher(district, seededRandom(seed)), result: Mission[] = [];
        let p: Point = district.spawn!;
        for (let i = 0; i < 11; i++) {
            const m = book.next(p);
            result.push(m);
            p = m.destination;
        }
        return result;
    }
    const curb = (id: string, name: string): RoadNode => {
        const node = district.nodes.find(n => n.id === id);
        if (!node)
            throw new Error(`Missing mission road node: ${id}`);
        const road = district.roads.find(r => r.a === id && !r.roundabout) ?? district.roads.find(r => r.b === id)!;
        const a = district.nodes.find(n => n.id === road.a)!, b = district.nodes.find(n => n.id === road.b)!;
        const heading = Math.atan2(b.x - a.x, b.z - a.z);
        const offset = Math.min(road.width / 2 - 2, 7);
        const p = { ...node, x: node.x + Math.cos(heading) * offset, z: node.z - Math.sin(heading) * offset, name };
        if (district.obstacles.some(o => obstacleDistance(p, o) < 2))
            throw new Error(`Blocked passenger stop: ${name}`);
        return p;
    };
    const missions: Mission[] = [
        { pickup: curb('yaowarat:3', 'Yaowarat gold-shop quarter'), destination: curb('yaowarat:8', 'Mangkon / Chinatown food stalls'), passenger: 'Mali · flower seller', limit: 55 },
        { pickup: curb('temple-stop', 'Wat Traimit'), destination: curb('station-stop', 'Hua Lamphong station'), passenger: 'Nok · evening commuter', limit: 50 },
        { pickup: curb('station-stop', 'Station noodle shop'), destination: curb('odeon:0', 'Chinatown Gate / Odeon Circle'), passenger: 'Arun · hungry explorer', limit: 65 },
        { pickup: curb('west-market', 'Dragon Alley market'), destination: curb('charoen:3', 'Charoen Krung / Plaeng Nam'), passenger: 'Dao · market chef', limit: 55 },
    ];
    for (const mission of missions) {
        if (!routeBetween(district, mission.pickup.id, mission.destination.id).length)
            throw new Error('Unreachable mission destination');
    }
    return missions;
}
/** Stable generator is injected only by tests; gameplay seeds from browser entropy. */
export function seededRandom(seed: number) { let n = seed >>> 0; return () => { n += 0x6D2B79F5; let t = Math.imul(n ^ n >>> 15, 1 | n); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function sessionRandom() { const a = new Uint32Array(1); try {
    crypto.getRandomValues(a);
}
catch {
    a[0] = (Math.random() * 4294967296) >>> 0;
} return seededRandom(a[0]!); }
export function passengerStops(d: District): RoadNode[] {
    if (d.navigation) return d.navigation.stops;
    if (d.worldId !== 'bangkok')
        return createMissions(d).flatMap(m => [m.pickup, m.destination]).filter((n, i, all) => all.findIndex(q => q.id === n.id) === i);
    const stops: RoadNode[] = [];
    for (const landmark of d.landmarks) {
        const n = d.nodes.find(n => n.id === landmark.accessNode);
        if (!n)
            continue;
        if (d.destinations?.some(a => a.landmarkId === landmark.id)) {
            stops.push({ ...n, name: `${landmark.name} · visitor drop-off` });
            continue;
        }
        const road = d.roads.find(r => r.a === n.id || r.b === n.id);
        if (!road)
            continue;
        const a = d.nodes.find(n => n.id === road.a)!, b = d.nodes.find(n => n.id === road.b)!, heading = Math.atan2(b.x - a.x, b.z - a.z), offset = Math.min(3, road.width / 2 - 2);
        let p = { ...n, x: n.x + Math.cos(heading) * offset, z: n.z - Math.sin(heading) * offset, name: `${landmark.name} · roadside stop` };
        if (d.obstacles.some(o => obstacleDistance(p, o) < 2))
            p = { ...n, name: p.name };
        if (!d.obstacles.some(o => obstacleDistance(p, o) < 2))
            stops.push(p);
    }
    return stops.filter((n, i, all) => all.findIndex(q => q.id === n.id) === i);
}
const passengers = ['Mali · flower seller', 'Nok · evening commuter', 'Dao · city visitor', 'Arun · food explorer', 'Pim · local student', 'Som · market trader', 'June · photographer', 'Lek · restaurant worker'];
/** Dispatch only connected fares, using legal road costs for pickup, trip budget and fare. */
export class FareDispatcher {
    readonly stops: RoadNode[];
    readonly pickups: RoadNode[];
    private nodes: Map<string, RoadNode>;
    private edges = new Map<string, {
        to: string;
        length: number;
    }[]>();
    private recent: string[] = [];
    private previousPassenger = '';
    private jobs = 0;
    constructor(private d: District, private random: () => number = sessionRandom()) {
        this.nodes = new Map(d.nodes.map(n => [n.id, n]));
        this.stops = passengerStops(d);
        this.pickups = [...this.stops];
        if (d.navigation) { if(this.stops.length<2) throw Error('Not enough geographic stops'); return; }
        if (d.worldId === 'bangkok') {
            const degree = new Map<string, number>();
            for (const r of d.roads)
                for (const id of [r.a, r.b])
                    degree.set(id, (degree.get(id) ?? 0) + 1);
            const index = physicsObstacleIndex(d);
            d.roads.forEach((r, i) => {
                if (i % 5 || r.bridge || r.roundabout || r.destinationId || r.shortcut || (degree.get(r.a) ?? 0) > 2)
                    return;
                const n = this.nodes.get(r.a)!, b = this.nodes.get(r.b)!, heading = Math.atan2(b.x - n.x, b.z - n.z), offset = Math.min(3, r.width / 2 - 2);
                const p = { ...n, x: n.x + Math.cos(heading) * offset, z: n.z - Math.sin(heading) * offset, name: `${r.name} · passenger pickup` };
                if (!blockedByRiver(d, p, 2) && index.query(p).every(j => obstacleDistance(p, d.obstacles[j]!) >= 2))
                    this.pickups.push(p);
            });
            this.pickups = this.pickups.filter((n, i, all) => all.findIndex(q => q.id === n.id) === i);
        }
        for (const r of d.roads) {
            const a = this.nodes.get(r.a)!, b = this.nodes.get(r.b)!, length = Math.hypot(b.x - a.x, b.z - a.z);
            for (const [from, to] of r.oneWay ? [[r.a, r.b]] : [[r.a, r.b], [r.b, r.a]]) {
                const list = this.edges.get(from!) ?? [];
                list.push({ to: to!, length });
                this.edges.set(from!, list);
            }
        }
        if (this.stops.length < 2)
            throw Error('Not enough connected passenger stops');
    }
    private distances(starts: [
        string,
        number
    ][]) {
        const costs = new Map(starts), open = new Set(starts.map(([id]) => id));
        while (open.size) {
            let at = '', best = Infinity;
            for (const id of open)
                if (costs.get(id)! < best) {
                    at = id;
                    best = costs.get(id)!;
                }
            open.delete(at);
            for (const edge of this.edges.get(at) ?? [])
                if (best + edge.length < (costs.get(edge.to) ?? Infinity)) {
                    costs.set(edge.to, best + edge.length);
                    open.add(edge.to);
                }
        }
        return costs;
    }
    private fromPosition(p: Point) {
        let best = Infinity, starts: [
            string,
            number
        ][] = [];
        for (const r of this.d.roads) {
            const a = this.nodes.get(r.a)!, b = this.nodes.get(r.b)!, q = distanceToSegment(p, a, b);
            if (q.distance >= best)
                continue;
            best = q.distance;
            const da = Math.hypot(p.x - a.x, p.z - a.z), db = Math.hypot(p.x - b.x, p.z - b.z);
            starts = da < 1 ? [[a.id, da]] : db < 1 ? [[b.id, db]] : r.oneWay ? [[b.id, q.distance + Math.hypot(q.point.x - b.x, q.point.z - b.z)]] : [[a.id, q.distance + Math.hypot(q.point.x - a.x, q.point.z - a.z)], [b.id, q.distance + Math.hypot(q.point.x - b.x, q.point.z - b.z)]];
        }
        return this.distances(starts);
    }
    next(position: Point): Mission {
        const from = this.d.navigation ? this.d.navigation.distances(position,this.pickups) : this.fromPosition(position), near = this.pickups.filter(s => Number.isFinite(from.get(s.id))).sort((a, b) => from.get(a.id)! - from.get(b.id)!);
        if (!near.length)
            throw Error('No reachable passenger pickup');
        const closest = from.get(near[0]!.id)!, choices = near.filter(s => from.get(s.id)! <= closest + (this.jobs < 3 ? 220 : 450)).slice(0, 4);
        // Random local shortlist; every pickup has a known legal route from the vehicle.
        const pickup = choices[Math.floor(this.random() * choices.length)]!, costs = this.d.navigation ? this.d.navigation.distances(pickup,this.stops) : this.distances([[pickup.id, 0]]);
        const candidates = this.stops.filter(s => s.id !== pickup.id && Number.isFinite(costs.get(s.id)) && !this.recent.includes([pickup.id, s.id].sort().join(">")));
        if (!candidates.length && this.d.navigation) {
            this.recent = [];
            candidates.push(...this.stops.filter(s => s.id !== pickup.id && Number.isFinite(costs.get(s.id))));
            if(!candidates.length) throw Error('No connected fare');
        }
        if(!candidates.length) throw Error('No fresh connected fare');
        const roll = this.random(), range = this.jobs < 3 ? [150, 1400] : roll < .65 ? [180, 1000] : roll < .92 ? [800, 1900] : [1600, 3600];
        const fitting = candidates.filter(s => costs.get(s.id)! >= range[0]! && costs.get(s.id)! <= range[1]!);
        const pool = fitting.length ? fitting : candidates.sort((a, b) => costs.get(a.id)! - costs.get(b.id)!).slice(0, 3);
        const destination = pool[Math.floor(this.random() * pool.length)]!, routeDistance = costs.get(destination.id)! + Math.hypot(pickup.x - this.nodes.get(pickup.id)!.x, pickup.z - this.nodes.get(pickup.id)!.z) + Math.hypot(destination.x - this.nodes.get(destination.id)!.x, destination.z - this.nodes.get(destination.id)!.z);
        const people = passengers.filter(p => p !== this.previousPassenger), passenger = people[Math.floor(this.random() * people.length)]!;
        this.previousPassenger = passenger;
        this.recent.push([pickup.id, destination.id].sort().join(">"));
        if (this.recent.length > 5)
            this.recent.shift();
        this.jobs++;
        return { pickup, destination, passenger, routeDistance, limit: Math.ceil(routeDistance / 7 + 55), baseFare: Math.round(45 + routeDistance * .16) };
    }
}
