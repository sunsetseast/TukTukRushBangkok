/** Explicit PR37 approval for the eleven old / ten fitted waterfront kiosk
 * footprints. Historic snapshot guards still reject every unrelated change. */
import assert from "node:assert/strict";
import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import type { District, Obstacle } from "../src/game/types";
import { roadManeuvers } from "../src/game/bangkok/roadManeuvers";
const out = new URL(
  "../../../docs/qa/waterfront-certification/",
  import.meta.url,
);
const approval = JSON.parse(
  fs.readFileSync(new URL("placement-approval.json", out), "utf8"),
) as { version: string; removed: Obstacle[]; added: Obstacle[] };
const baseline = JSON.parse(
  gunzipSync(fs.readFileSync(new URL("before-world.json.gz", out))).toString(),
) as District;
export const footprintKey = (o: Obstacle) =>
  [o.x, o.z, o.w, o.d, o.yaw ?? 0].map((n) => n.toFixed(4)).join(":");
const keys = new Set(
  [...approval.removed, ...approval.added].map(footprintKey),
);
let checked = false;
function validateApproval() {
  if (checked) return;
  assert.equal(approval.version, "waterfront-maneuvers-v1");
  const plan = roadManeuvers(baseline);
  const direct = approval.removed.filter((o) =>
    plan.conflicts(o).some((s) => s.kind === "arrival-reversal"),
  );
  for (const o of approval.removed)
    assert(
      direct.includes(o) ||
        (direct.some((q) => Math.hypot(q.x - o.x, q.z - o.z) < 12) &&
          approval.added.some((q) => Math.hypot(q.x - o.x, q.z - o.z) < 12)),
      "Only a turning conflict or its immediately refitted frontage neighbor can approve an old footprint: " +
        o.environmentId,
    );
  for (const o of approval.added) {
    assert(
      plan.clear(o),
      "Fitted footprint must clear the same physical maneuver",
    );
    assert(
      approval.removed.some((old) => Math.hypot(old.x - o.x, old.z - o.z) < 12),
      "Refit must stay beside the existing frontage",
    );
  }
  checked = true;
}
export function approvedWaterfrontParcel(o: Obstacle) {
  validateApproval();
  return keys.has(footprintKey(o));
}
export function assertApprovedManeuverMigration(d: District) {
  validateApproval();
  const before = new Set(baseline.buildings.map(footprintKey)),
    after = new Set(d.buildings.map(footprintKey));
  const removed = baseline.buildings
      .filter((o) => !after.has(footprintKey(o)))
      .map(footprintKey)
      .sort(),
    added = d.buildings
      .filter((o) => !before.has(footprintKey(o)))
      .map(footprintKey)
      .sort();
  assert.deepEqual(
    removed,
    approval.removed.map(footprintKey).sort(),
    "No additional old frontage may disappear",
  );
  assert.deepEqual(
    added,
    approval.added.map(footprintKey).sort(),
    "No unapproved new frontage reflow",
  );
}
