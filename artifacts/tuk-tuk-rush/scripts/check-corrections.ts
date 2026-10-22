import assert from 'node:assert/strict';
import { ChaseCamera, ArtCameraLease } from '../src/game/chaseCamera';
import { GameEngine } from '../src/game/engine';
import { createVehicle } from '../src/game/vehicle';
import { FareDispatcher, seededRandom, passengerStops } from '../src/game/missions';
import { routeBetween, obstacleDistance } from '../src/game/world';
import { stationShell, stationSignPlacements } from '../src/game/bangkok/transit/stationGeometry';
import { channelGeometry, WATER_LEVEL } from '../src/game/bangkok/roadSurfaceGraph';
import { destinationLabel } from '../src/game/ui/destinationLabel';
import * as T from 'three';
Object.assign(globalThis, { window: { addEventListener() { }, removeEventListener() { }, matchMedia: () => ({ matches: false }) }, document: { addEventListener() { }, removeEventListener() { }, hidden: false } });
const e = new GameEngine(), d = e.model.district, c = new ChaseCamera();
e.start('free');
for (const id of ['icon', 'asiatique', 'paknam']) {
    const site = d.destinations!.find(a => a.landmarkId === id)!, n = d.nodes.find(n => n.id === site.arrivalNode)!;
    Object.assign(e.model.player, n, { heading: .5, speed: 0 });
    c.update(d, e.model.player, .05, e.cameraRevision, false, false);
    const dx = c.pos.x - n.x, dz = c.pos.z - n.z;
    assert(dx * Math.sin(.5) + dz * Math.cos(.5) < 0, 'Arrival must keep camera behind the tuk tuk');
    assert(c.pos.y < 5);
    assert(c.look.y < 4, 'Arrival cannot focus a high building');
    assert(e.viewLandmark(id));
    assert(e.model.snapshot.viewingLandmark);
    e.resume();
    assert(!e.model.snapshot.viewingLandmark);
    c.pos.set(n.x, 150, n.z);
    c.look.set(n.x, 80, n.z);
    c.update(d, e.model.player, .05, e.cameraRevision, false, false);
    assert(c.pos.y < 5, 'LOOK exit cannot retain elevated pose');
    e.restart();
    c.update(d, e.model.player, .05, e.cameraRevision, false, false);
    assert(c.pos.distanceTo({ x: e.model.player.x, y: 3, z: e.model.player.z } as never) < 15, 'Restart restores local chase');
}
for (const v of [NaN, Infinity, -Infinity]) {
    c.pos.set(0, v, v);
    c.fov = v;
    c.update(d, e.model.player, .05, e.cameraRevision, false, false);
    assert([...c.pos, ...c.look, c.fov].every(Number.isFinite));
}
Object.assign(e.model.player, { x: NaN, z: Infinity, heading: NaN, speed: NaN });
e.update(.016);
for (const [key, value] of Object.entries(createVehicle(d)))
    assert.equal(e.model.player[key as keyof typeof e.model.player], value);
const lease = new ArtCameraLease(), pose = { position: [4, 140, 4], look: [0, 30, 0] };
assert.equal(lease.read(pose, false, 0, 0), undefined);
assert.equal(lease.read(pose, true, 0, 0), pose);
assert.equal(lease.read(pose, true, 16, 0), undefined);
assert.equal(new ArtCameraLease().read({ ...pose, position: [NaN, 2, 3] }, true, 0, 0), undefined);
const sessionLease = new ArtCameraLease();
assert(sessionLease.read(pose, true, 0, 0));
assert.equal(sessionLease.read(pose, true, 1, 1), undefined);
assert.equal(sessionLease.read(pose, true, 2, 1), undefined);
assert(sessionLease.read({ ...pose }, true, 3, 1), 'An explicit new QA pose after restart receives a fresh lease');
e.returnToTitle();
e.start('shift');
assert(!e.model.snapshot.viewingLandmark);
assert.equal(e.model.snapshot.shiftTime, 1440);
e.dispose();
console.log('PASS camera arrival, restart, LOOK exit, invalid-state and QA-lease regressions');
const signatures = new Set<string>();
for (let seed = 1; seed <= 24; seed++) {
    const book = new FareDispatcher(d, seededRandom(seed)), repeat = new FareDispatcher(d, seededRandom(seed)), recent: string[] = [];
    let p = d.spawn!;
    const first: string[] = [];
    for (let i = 0; i < 12; i++) {
        const m = book.next(p);
        assert.deepEqual(m, repeat.next(p));
        assert(m.limit > 55);
        assert(m.baseFare! > 45);
        const route = routeBetween(d, m.pickup.id, m.destination.id);
        assert(route.length > 1);
        const length = route.slice(1).reduce((sum, n, j) => sum + Math.hypot(n.x - route[j]!.x, n.z - route[j]!.z), 0), pn = d.nodes.find(n => n.id === m.pickup.id)!, dn = d.nodes.find(n => n.id === m.destination.id)!;
        assert(Math.abs(length + Math.hypot(pn.x - m.pickup.x, pn.z - m.pickup.z) + Math.hypot(dn.x - m.destination.x, dn.z - m.destination.z) - m.routeDistance!) < 1e-5, 'Fare budgets use the actual directed route and curb connectors');
        const pair = [m.pickup.id, m.destination.id].sort().join('>');
        assert(!recent.includes(pair));
        recent.push(pair);
        if (recent.length > 5)
            recent.shift();
        if (i < 3) {
            first.push(pair);
            assert(m.routeDistance! < 1600, 'Early fares should be local, not compulsory city tours');
        }
        p = { ...m.destination, heading: 0 };
    }
    signatures.add(first.join('|'));
}
assert(signatures.size > 18, 'Different session seeds must offer meaningfully different opening jobs');
for (const s of passengerStops(d)) {
    assert(d.obstacles.every(o => obstacleDistance(s, o) >= 2));
    assert(routeBetween(d, d.nodes.find(n => n.id === d.landmarks.find(l => l.id === 'gate')!.accessNode)!.id, s.id).length);
    assert(destinationLabel(s.name).length <= 44);
}
for (const s of d.transit!.lines.flatMap(l => l.stations))
    for (const p of stationSignPlacements(s)) {
        const shell = stationShell(s);
        assert(p.w <= s.length * .25);
        assert(p.h + .12 <= shell.concourseHeight);
        assert.equal(p.y, shell.concourseY);
        assert(Math.abs(Math.hypot(p.x - s.x, p.z - s.z) - (shell.concourseWidth / 2 + .075)) < 1e-6);
        assert(Math.sin(p.yaw) * (p.x - s.x) + Math.cos(p.yaw) * (p.z - s.z) > 0, 'Exterior signs face away from station walls');
    }
const water = new T.Mesh(channelGeometry('water',d), new T.MeshBasicMaterial()), land = new T.Mesh(channelGeometry('land',d), new T.MeshBasicMaterial()), ray = new T.Raycaster();
water.updateMatrixWorld();
land.updateMatrixWorld();
for (const channel of [{ points: d.river! }, ...(d.canals ?? [])])
    for (const n of channel.points) {
        ray.set(new T.Vector3(n.x, 2, n.z), new T.Vector3(0, -1, 0));
        const hit = ray.intersectObject(water);
        assert(hit.length);
        assert(Math.abs(hit[0]!.point.y - WATER_LEVEL) < 1e-5);
        assert.equal(ray.intersectObject(land).length, 0, 'Terrain must have an actual opening for water');
    }
water.geometry.dispose();
land.geometry.dispose();
console.log('PASS 288 deterministic varied fares, every stop connected, fitted BTS signs, long-name labels and cut-out channels');
