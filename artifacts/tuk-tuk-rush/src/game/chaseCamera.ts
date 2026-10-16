import { Vector3 } from 'three';
import type { District, Vehicle } from './types';
import { obstacleLocal } from './world';
import { physicsObstacleIndex } from './bangkok/clearanceIndex';
const finite = (v: Vector3) => Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
/** Driving owns a ground-level follow pose. Landmark composition belongs to LOOK. */
export class ChaseCamera {
    readonly pos = new Vector3();
    readonly look = new Vector3();
    fov = 58;
    private heading = 0;
    private initialized = false;
    private revision = -1;
    update(d: District, p: Vehicle, delta: number, revision: number, title: boolean, boosted: boolean, horizon = 1.4) {
        const dt = Number.isFinite(delta) ? Math.max(0, Math.min(delta, .1)) : 0;
        const fallback = d.spawn ?? { x: -280, z: 40, heading: Math.PI / 2 };
        const x = Number.isFinite(p.x) ? p.x : fallback.x, z = Number.isFinite(p.z) ? p.z : fallback.z;
        const heading = Number.isFinite(p.heading) ? p.heading : fallback.heading;
        const speed = Number.isFinite(p.speed) ? Math.min(1, Math.abs(p.speed) / 31) : 0;
        const snap = !this.initialized || revision !== this.revision || !finite(this.pos) || !finite(this.look) || !Number.isFinite(this.fov) || Math.hypot(x - this.pos.x, z - this.pos.z) > 40 || this.pos.y > 9 || this.pos.y < 1;
        this.revision = revision;
        this.initialized = true;
        if (snap || title)
            this.heading = heading;
        else {
            const angle = heading - this.heading;
            this.heading += Math.atan2(Math.sin(angle), Math.cos(angle)) * (1 - Math.exp(-4.5 * dt));
        }
        // After a sharp collision/recovery, never remain in front of the vehicle.
        if (Math.cos(this.heading - heading) < .15)
            this.heading = heading;
        const fx = Math.sin(this.heading), fz = Math.cos(this.heading), distance = title ? 12 : 7.8 + 3 * speed + (boosted ? .7 : 0), height = title ? 4.7 : 3.3 + 1.3 * speed;
        const index = d.worldId === 'bangkok' ? physicsObstacleIndex(d) : undefined;
        const occupied = (px: number, py: number, pz: number) => {
            const point = { x: px, z: pz };
            const candidates = index ? index.query(point) : d.buildings.map((_, i) => i);
            return candidates.some(i => { const b = (index ? d.obstacles : d.buildings)[i]!; if (b.height < 2.4 || py > b.height + .5)
                return false; const q = obstacleLocal(point, b); return Math.abs(q.x) < b.w / 2 + .8 && Math.abs(q.z) < b.d / 2 + .8; });
        };
        const blocked = (k: number) => occupied(x - fx * distance * k, 1.6 + (height - 1.6) * k, z - fz * distance * k);
        // Test the entire boom from the vehicle, rather than just its far endpoint.
        let k = .12;
        for (let step = 2; step <= 10; step++) {
            const next = step / 10;
            if (blocked(next))
                break;
            k = next;
        }
        const tx = x - fx * distance * k, ty = 1.6 + (height - 1.6) * k, tz = z - fz * distance * k;
        const f = snap || title ? 1 : 1 - Math.exp(-(k < 1 ? 18 : 9) * dt);
        if (snap || title)
            this.pos.set(tx, ty, tz);
        else {
            this.pos.x += (tx - this.pos.x) * f;
            this.pos.y += (ty - this.pos.y) * f;
            this.pos.z += (tz - this.pos.z) * f;
        }
        // Interpolation itself can cut a corner. Snap inwards if that pose is occupied.
        if (occupied(this.pos.x, this.pos.y, this.pos.z))
            this.pos.set(tx, ty, tz);
        this.look.set(x + fx * (title ? 24 : 6), title ? 3.1 : horizon, z + fz * (title ? 24 : 6));
        const fov = title ? 56 : 58 + speed * 14 + (boosted ? 3 : 0);
        this.fov = snap || title ? fov : this.fov + (fov - this.fov) * (1 - Math.exp(-3 * dt));
    }
}
export type ArtCamera = {
    position: number[];
    look: number[];
};
/** QA is opt-in even on a Replit development build. A lease cannot outlive a session. */
export class ArtCameraLease {
    private value?: ArtCamera;
    private until = 0;
    private revision = -1;
    read(value: ArtCamera | undefined, enabled: boolean, now: number, revision: number) {
        if (!enabled || !value)
            return;
        if (this.revision !== -1 && this.revision !== revision && value === this.value) {
            this.until = 0;
            this.revision = revision;
            return;
        }
        if (value !== this.value) {
            this.value = value;
            this.until = now + 15;
            this.revision = revision;
        }
        if (now >= this.until || !Array.isArray(value.position) || !Array.isArray(value.look) || value.position.length !== 3 || value.look.length !== 3 || ![...value.position, ...value.look].every(Number.isFinite))
            return;
        return value;
    }
}
