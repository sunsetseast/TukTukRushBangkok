import type { RailStation } from './network';
/** Shared concourse dimensions keep wayfinding attached to real station fascia. */
export function stationShell(s: RailStation) { return { concourseWidth: s.id === 'siam' ? 20 : s.line === 'gold' ? 13 : 16, concourseY: 8.9, concourseHeight: 1.5 }; }
export function stationSignPlacements(s: RailStation) {
    const shell = stationShell(s), w = Math.min(s.line === 'gold' ? 6.6 : 7.2, s.length * .24), h = w * 96 / 512;
    return [-1, 1].map(side => ({ x: s.x + Math.cos(s.yaw) * side * (shell.concourseWidth / 2 + .075), z: s.z - Math.sin(s.yaw) * side * (shell.concourseWidth / 2 + .075), y: shell.concourseY, yaw: s.yaw + side * Math.PI / 2, w, h, side }));
}
