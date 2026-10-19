import { REAL_PLACES } from './realPlaces';
import type { District, Obstacle } from '../types';
import type { ArtPiece } from './architecturalBatch';
import { placementIndex } from './environmentPlan';
import { stableHash } from './buildingGrammar';
const plans = new WeakMap<District, Obstacle[]>();
/** Bounded landscaped pockets close exposed banks without paving or filling water. */
export function planLandscape(d: District) {
    const cached = plans.get(d);
    if (cached)
        return cached;
    const result: Obstacle[] = [], index = placementIndex(d);
    const add = (x: number, z: number, yaw: number) => {
        if (result.length >= 240)
            return;
        const o: Obstacle = { x, z, w: 6, d: 8, height: 1, yaw, color: '#79ad62', artRole: 'furniture', environmentId: `garden:${Math.round(x)}:${Math.round(z)}` };
        if (!index.clear(o))
            return;
        result.push(o);
        d.obstacles.push(o);
        index.insert(o);
    };
    for (const l of d.landmarks.filter(l => ['paknam', 'icon', 'asiatique', 'arun', ...REAL_PLACES.filter(p=>p.bank).map(p=>p.id)].includes(l.id!))) {
        const p = l.plot!;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 10)
            for (const radius of [l.size! * .65 + 18, l.size! * .65 + 45])
                add(p.x + Math.sin(a) * radius, p.z + Math.cos(a) * radius, a);
    }
    for (const water of [{ points: d.river!, width: d.riverWidth! }, ...(d.canals ?? [])])
        for (let i = 1; i < water.points.length; i++) {
            const a = water.points[i - 1]!, b = water.points[i]!, length = Math.hypot(b.x - a.x, b.z - a.z), ux = (b.x - a.x) / length, uz = (b.z - a.z) / length;
            for (let t = 18; t < length; t += 54)
                for (const side of [-1, 1])
                    add(a.x + ux * t + uz * side * (water.width / 2 + 10), a.z + uz * t - ux * side * (water.width / 2 + 10), Math.atan2(ux, uz));
        }
    plans.set(d, result);
    return result;
}
export function emitLandscape(d: District, emit: (p: ArtPiece) => void) {
    for (const o of planLandscape(d)) {
        const seed = stableHash(o.environmentId!), put = (x: number, y: number, z: number, w: number, h: number, depth: number, color: string, shape: ArtPiece['shape'] = 'box', surface: ArtPiece['surface'] = 'plaster') => emit({ x, y, z, w, h, d: depth, color, yaw: o.yaw ?? 0, shape, surface });
        put(o.x, .13, o.z, 6, .24, 8, '#d2bf91');
        put(o.x, .3, o.z, 5.5, .15, 7.5, '#6da865');
        // Species planting is emitted once through tropicalPlan.
        if (seed % 3 === 0)
            put(o.x, .65, o.z + 2.5, 3, .35, .9, '#c99c60', 'box', 'wood');
    }
}
