import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
const root = new URL("../../../docs/qa/storefront-quality/", import.meta.url);
const read = (f) => {
  const file = new URL(f, root);
  return JSON.parse(
    fs.existsSync(file)
      ? fs.readFileSync(file, "utf8")
      : gunzipSync(fs.readFileSync(new URL(f + ".gz", root))).toString("utf8"),
  );
};
const before = read("before-certified/capture.json"),
  after = read("after-certified/capture.json");
assert(before.pass && after.pass);
assert(after.scenes.length >= 12);
assert.equal(after.errors.length, 0);
assert.equal(before.errors.length, 0);
const pairs = [];
for (const a of after.scenes) {
  const b = before.scenes.find((b) => b.id === a.id);
  assert(b, `Missing baseline ${a.id}`);
  for (const key of ["cameraPose", "viewport", "quality", "dpr", "elapsed"])
    assert.deepEqual(a[key], b[key], `${a.id}: matched ${key}`);
  assert.deepEqual(
    a.replay,
    b.replay,
    `${a.id}: production player/traffic replay`,
  );
  assert(
    a.signDepth.population > 0 && b.signDepth.population > 0,
    "Nonempty complete sign population",
  );
  const primary = [];
  for (const f of a.signDepth.records.filter((f) => f.height <= 1.1)) {
    const old = b.signDepth.records.find(
      (q) =>
        q.owner === f.owner &&
        q.key === f.key &&
        Math.abs(q.height - f.height) < 0.01,
    );
    if (old)
      primary.push({
        owner: f.owner,
        key: f.key,
        before: old.occludedFraction,
        after: f.occludedFraction,
        samples: [old.total, f.total],
      });
  }
  pairs.push({
    id: a.id,
    pass: true,
    viewport: a.viewport,
    mode: a.mode,
    camera: a.cameraPose,
    calls: { before: b.samples.at(-1).calls, after: a.samples.at(-1).calls },
    triangles: {
      before: b.samples.at(-1).triangles,
      after: a.samples.at(-1).triangles,
    },
    depth: {
      before: { eligible: b.signDepth.faces, obscured: b.signDepth.obscured },
      after: { eligible: a.signDepth.faces, obscured: a.signDepth.obscured },
    },
    primary,
  });
}
assert.equal(pairs.length, before.scenes.length);
// Reproduce the known rendered defects, then require a material improvement.
// Keep the foreground pole in the Yaowarat fixtures; do not demand x-ray text.
const visibilityTargets = [
  ["storefront-detail", "bkk:-10899:-16880:29617", 0.15, 0.16],
  ["yaowarat-fascia", "bkk:-10899:-16880:29617", 0.15, 0.16],
  ["ratchawong-sign", "bkk:-29192:-17634:-18925", 0.15, 0],
  ["song-wat-merchant", "bkk:-21934:17677:30916", 0.15, 0],
  ["siam-sign", "bkk:75600:-55200:31416", 0.25, 0],
].map(([id, owner, minimumGain, maximumAfter]) => {
  const target = pairs.find((p) => p.id === id)?.primary.find((f) => f.owner === owner);
  assert(target, `${id}: known primary fascia must remain in the population`);
  assert(target.before - target.after >= minimumGain, `${id}: rendered visibility must improve`);
  assert(target.after <= maximumAfter, `${id}: residual rendered obstruction`);
  return { id, ...target, minimumGain, maximumAfter };
});
const files = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f);
    else
      files.push([
        path.relative("src/game", f),
        createHash("sha256").update(fs.readFileSync(f)).digest("hex"),
      ]);
  }
}
process.chdir(new URL("../", import.meta.url).pathname);
walk("src/game");
const runtimeHash = createHash("sha256")
  .update(JSON.stringify(files.sort()))
  .digest("hex");
assert.equal(
  after.runtimeSourceSha256,
  runtimeHash,
  "Delivered source must equal captured runtime source",
);
const geometry = read("validation/sign-geometry.json"),
  oldGeometry = read("validation/sign-geometry-before.json");
assert.equal(geometry.failures, 0);
const report = {
  pass: true,
  matchedPairs: pairs.length,
  unobscuredWebglPairs: pairs.filter((p) => p.viewport[0] >= p.viewport[1]).length,
  portraitGuardChecks: pairs.filter((p) => p.viewport[0] < p.viewport[1]).length,
  runtimeSourceSha256: runtimeHash,
  visibilityTargets,
  geometry: {
    before: {
      faces: oldGeometry.faces,
      substantialSelfClashes: oldGeometry.failures,
    },
    after: { faces: geometry.faces, substantialSelfClashes: geometry.failures },
    externallyScreened: geometry.results
      .filter((f) => f.externalOcclusionAllViews)
      .map((f) => ({ id: f.id, region: f.region, views: f.views })),
    residualPerspectiveOverlap: geometry.results.filter(
      (f) => f.perspectiveOverlap,
    ).length,
  },
  note: "Raw rendered-depth obstruction includes poles, traffic and foreign buildings; it is not silently relabeled as zero. Geometry audit distinguishes own architecture. Retired duplicate/rear/undersized-building sign classes are inventoried in README.",
  pairs,
};
fs.writeFileSync(
  new URL("validation/comparisons.json", root),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    pass: true,
    pairs: pairs.length,
    sourceHash: runtimeHash,
    geometry: report.geometry.after,
  }),
);
