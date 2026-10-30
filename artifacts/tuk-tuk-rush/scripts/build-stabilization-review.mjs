import fs from "node:fs";
const root = new URL("../../../", import.meta.url);
const dir = new URL("generated-artifacts/geographic-stabilization/", root);
const qa = new URL("docs/qa/geographic-stabilization/", root);
const json = p => JSON.parse(fs.readFileSync(p, "utf8"));
const before = json(new URL("before/metrics.json", dir)), after = json(new URL("after/metrics.json", dir));
const codec = json(new URL("compiled-tests.json", qa)), conflicts = json(new URL("conflict-classification.json", qa));
const results = json(new URL("regressions/results.json", qa));
if (results.length < 39) throw Error("Full extracted-command regression sweep is not finished");
const physics = json(new URL("physics-profile.json", qa));
const segments = json(new URL("driven-segments.json", qa));
const gameplay = json(new URL("gameplay/browser-report.json", dir));
const compiled = json(new URL("../public/assets/geography/compiled/report.json", import.meta.url));
if (before.sourceBaselineRef !== "266807cf4902dc4fa9a10da8555071db0b40b6f1") throw Error("Unpinned baseline");
const summary = {
  environment: "Linux Chromium / ANGLE SwiftShader, development server, 1280x800; not physical iPhone or Safari",
  base: before.sourceBaselineRef,
  before: { firstResidentMs: before.firstResidentMs, initial: before.initial, low: before.low.frameMs, medium: before.medium.frameMs },
  after: { firstResidentMs: after.firstResidentMs, initial: after.initial, low: after.low.frameMs, medium: after.medium.frameMs },
  views: after.views.map(a => {
    const b = before.views.find(b => b.name === a.name);
    for (const k of ["lon", "lat", "tlon", "tlat", "height"]) if (a[k] !== b[k]) throw Error(`Unmatched ${a.name} ${k}`);
    return { name: a.name, before: b.frameMs, after: a.frameMs, beforeCalls: b.drawCalls, afterCalls: a.drawCalls,
      beforeTriangles: b.triangles, afterTriangles: a.triangles, beforeGPU: b.buildingGPUBytes, afterGPU: a.buildingGPUBytes };
  }),
  travel: { before: before.travel, after: after.travel },
  codec, conflicts, physics, gameplay, segments, regressions: results,
};
fs.writeFileSync(new URL("comparison.json", qa), JSON.stringify(summary, null, 2) + "\n");
const median = a => [...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const mb = n => (n / 1e6).toFixed(2);
const f = n => n.toFixed(2);
const passed = results.filter(r=>r.exitCode===0).length;
const totalSource = compiled.chunks.reduce((n,r)=>n+r.sourceBytes,0), totalCompiled=compiled.chunks.reduce((n,r)=>n+r.compiledBytes,0);
const rows = summary.views.map(v=>`| ${v.name} | ${f(v.before.p50)} / ${f(v.before.p95)} | ${f(v.after.p50)} / ${f(v.after.p95)} | ${v.beforeCalls} / ${v.afterCalls} |`).join("\n");
const report = `# Geographic engine stabilization — review, not release certification

Base main: \`${before.sourceBaselineRef}\`. PR48 was verified merged before work. One draft PR; no merge, deployment or native iOS build.

## A. Startup
The unchanged startup guard initially rejected polygon-clipping in the browser graph. Building authoring is now in an offline script, with a browser-only typed-buffer decoder. No alias, dependency rename, test-budget reduction or extra runtime dependency was used. The unchanged startup check passes, including building with polygon-clipping and its dependencies unavailable. See regressions/05.log.

## B. Static generation and source fidelity
\`pnpm --filter @workspace/tuk-tuk-rush geography:compile\` derives cached static meshes from committed source chunks. Dependency preparation prewarms it before a fresh workflow needs to open its port; both dev and production build also verify the cache. No PBF download or source re-import was needed locally.

All ${codec.buildings.toLocaleString()} building records, 471 original chunk identities, EPSG:32647 frame, original IDs/versions/tags, 11 families, parts, courtyards, heights, roof types, seeds, street-facing edge metadata, landmark masks, bridge/station metadata remain. Original polygons/sourceFootprint archives are unchanged and addressable through sourceChunk + source ID. Runtime JSON omits duplicate rings, not the source archive.

Geometry uses indexed millimetre positions, signed-16 normals and RGB8 linear colors; delta/planar encoding and byte-plane gzip are offline. Position error measured at most ${codec.maxPositionError}m across ${codec.comparedChunks} distributed/corrected chunks; unchanged source edges drive collision. Normal tolerance is 0.00004/component; color tolerance 1/510. All triangle corners, batch names and LOD cells are compared against the original authoring function. Source generation was also byte-compared across five distributed chunks before relocation.

## C. Performance: gains and costs
Before profiling: a 3,507-building chunk took 558.09ms in Node, of which clipping took 252.38ms, triangulation 14.07ms and normal construction 18.66ms. This is CPU instrumentation, not Safari. See construction-profile-before.json.

| Metric | Before | After |
|---|---:|---:|
| First resident set, single matched development capture | ${f(before.firstResidentMs)}ms | ${f(after.firstResidentMs)}ms |
| Initial scene activation CPU median, not GPU upload | ${f(median(before.initial.activationMs))}ms | ${f(median(after.initial.activationMs))}ms |
| Initial scene activation maximum | ${f(Math.max(...before.initial.activationMs))}ms | ${f(Math.max(...after.initial.activationMs))}ms |
| Initial building construction median | ${f(median(before.initial.buildingBuildMs))}ms | ${f(median(after.initial.buildingBuildMs))}ms |
| Initial building GPU buffers | ${mb(before.initial.buildingGPUBytes)}MB | ${mb(after.initial.buildingGPUBytes)}MB |
| Initial compressed chunk transfer | ${mb(before.initial.activeAssetBytes)}MB | ${mb(after.initial.activeAssetBytes)}MB |
| All-city source/compiled compressed chunks, NOT preloaded | ${mb(totalSource)}MB | ${mb(totalCompiled)}MB |
| All-city theoretical building buffers, NOT resident | ${mb(codec.originalGPU)}MB | ${mb(codec.gpu)}MB |

The matched capture is one run; an earlier baseline was 6.33s rather than 9.05s, demonstrating startup variance. Do not claim a robust percentage startup gain from this alone. The final cold compiler reported about 163.5s. Warm cache loops observed 39–323ms, excluding process/import and package-manager overhead; dependency preparation was verified during a cached 13.5s frozen install.

The larger transfer is a real drawback: ${(totalCompiled/totalSource).toFixed(2)}x compressed source size. JSON parse and binary reconstruction remain on the main thread; fetch/decompression, JSON and reconstruction are separately recorded per chunk in comparison.json. GPU uploads are NOT included in activation CPU measurements. Steady-state software-rendered FPS did not materially improve. Remaining activation spikes approach ${f(Math.max(...after.initial.activationMs))}ms. Neither 30 FPS nor smooth iPhone chunk entry is certified.

| Matched view | Before frame p50 / p95 ms | After p50 / p95 ms | Draw calls before / after |
|---|---:|---:|---:|
${rows}

## D. Streaming, collision queries and memory
No whole-city mesh preload. Existing 3x3 demand, bounded 5x5 retention, two fetches and one activation/frame remain. Finished decodes and queued requests now prioritize vehicle distance and camera-forward direction. Immutable per-chunk 32m collider grids are cached; replacing one tile no longer rebuilds the entire resident 80m grid. Prefix offsets preserve contact order; replacing residency discards the old composite query cache.

Observed maximum resident count: ${Math.max(...after.travel.map(v=>v.stream.active))}, cap 25. Both runs passed repeated-location backing-storage/disposal checks; geometry and mesh counts are bounded. Final representative travel-set backing storage: ${mb(before.travel.at(-1).heapUsage.backingStorageSize)}MB before versus ${mb(after.travel.at(-1).heapUsage.backingStorageSize)}MB after. Different locations have different resident counts; first-to-last growth alone is not a leak test.

Dense/sparse collision profiling retains identical true-contact counts. See physics-profile.json; the 32m grid reduces candidates, but query overhead means not every latency percentile improves. Source contact resolution and legacy 80m behavior are unchanged.

## E. Road/building conflicts
${conflicts.candidateCount.toLocaleString()} candidates were classified, not declared mapping errors:

${Object.entries(conflicts.counts).map(([k,v])=>`- ${k}: ${v.toLocaleString()}`).join("\n")}

${conflicts.safeBuildingCandidates} conservative candidates permit derived asphalt trimming with a protected 4.6m centreline envelope. An all-road spatial query also catches roads wholly inside footprints. ${codec.restoredEdges} previously withheld ground wall segments are restored. ${conflicts.correctedRoadChunks} derived road chunks are corrected, including adjacent owner-crossing footprints. Source roads/footprints were not moved.

GEOS fixed-grid difference is offline: a polygon-clipping sweep-line difference failed on adjoining road unions and was not silently ignored. The unchanged source archives plus versioned policy/correction input make the result reproducible. Water, explicit-width, narrow-clearance, covered-passage, vertical/part/grade and genuine centreline-overlap cases remain explicit review exceptions. There is no unsupported blanket wall hiding or invented portal clearance.

The fixed screenshot uses ${conflicts.fixedViewBuilding}; cross-chunk view uses source way ${conflicts.crossChunkWay}. Named district examples, exact source road IDs and diagnosis are in conflict-classification.json. Unmatched street labels are not fabricated.

## F. Gameplay and regression scope
The production geographic controller test now uses compiled collision metadata. It exercises driving to board and deliver a real fare, wallet persistence, a real river bridge, source seam crossings, support and water blocking, and landmark disposal. Named straight source-segment drives record every sampled point from the controller, never camera teleports; unavailable eligible labels are explicitly skipped. See driven-segments.json and the gameplay certification.

These are short segment checks, not complete end-to-end corridor traversals. Exact main-road labels are preferred over similarly named sois. Captain Bush uses the source label Soi Charoen Krung 30 rather than inventing a source tag.

| Requested corridor | Actual source label | Source way | Driven meters | Contacts | Result |
|---|---|---|---:|---:|---|
${segments.map(s=>`| ${s.label} | ${s.name??"—"} | ${s.way??"—"} | ${s.driven?.toFixed(2)??"—"} | ${s.contacts??"—"} | ${s.status} |`).join("\n")}

Browser checks passed geographic UI navigation, destination selection, migrated landmark inspection, favorites/map, switching to the legacy game and returning, bounded residency and disposal. Camera/teleport movements in the gallery are ONLY loading/visual tests, not driving evidence.

Extracted workflow-command receipts: ${passed}/${results.length} passed in regressions/results.json. This is NOT an all-green hosted CI claim. Two commands did not pass: Playwright's --with-deps installer fails because apt is unavailable on Nix, and the original browser-geographic-streaming command exceeded the 300s command deadline without returning a passing result. It is explicitly recorded as a timeout, not silently replaced by the successful gallery. Genuine matched-gallery and gameplay browser checks use the provided Chromium. Initial manual build invocation lacked PORT, unlike CI; its corrected explicit PORT/BASE_PATH rerun is separately recorded. The targeted controller check was rerun after preferring exact main-road names.

Original source-import/repack steps were intentionally not repeated locally: no source geometry was edited and no large PBF was downloaded. Committed-source geometry checks, all-chunk hash/record validation and the new derived policy/correction reproducibility checks were run. The hosted workflow still performs its original source reproduction and unchanged git-diff guard. Hosted Actions status must be checked on the draft PR rather than inferred from local checks.

The workflow file itself is unchanged. Its existing geography:pack entry point now also classifies corrections and compiles static assets; its existing test:geographic-buildings entry point also runs the compiled-geometry check. This preserves the original checks while avoiding a workflow-file write rejected by the authorized GitHub connection.

## G. Actual WebGL gallery
The downloadable self-contained review.html contains ${summary.views.length} matched before/after views, including fixed-conflict and cross-chunk-seam. Baseline source modules are loaded read-only from the pinned main commit by a QA-only Vite plugin; the after run uses working source. Camera inputs, viewport and sequence match. No mockups, source renders presented as screenshots, or generated illustrations.

## H. Limits and verification environment
Physical iPhone/Safari, thermal behavior, memory-pressure eviction, real mobile bandwidth, touch reliability on device and sustained 30 FPS were NOT tested. Screens and frame timings use Linux Chromium/ANGLE SwiftShader. The generic Replit screenshot browser separately could not create a WebGL context; the WebGL-enabled browser completed the actual scene captures and gameplay checks. No code workaround conceals that environment distinction.

Remaining blockers: transfer inflation, remaining activation spikes, unresolved source/portal/width conflicts and physical-device validation. No native app, TestFlight, multiplayer, online map, account or payment system was created.

## I. Facade-engine readiness
**NO production/mobile-stability sign-off yet.** Stable source/facade metadata and static-geometry infrastructure are in place, but this draft does not justify starting a heavier facade/shader system before bandwidth, activation and physical-device budgets are established. Existing generic street courses are preserved; no advanced facade renderer was added.
`;
fs.writeFileSync(new URL("report.md", qa), report);
const esc=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll('"',"&quot;");
const image=(stage,name)=>`data:image/png;base64,${fs.readFileSync(new URL(`${stage}/${name}.png`,dir)).toString("base64")}`;
const gallery=summary.views.map(v=>`<section id="${esc(v.name)}"><h2>${esc(v.name)}</h2><div class="pair">${["before","after"].map(stage=>`<figure><img loading="lazy" alt="${stage} actual WebGL screenshot ${esc(v.name)}" src="${image(stage,v.name)}"><figcaption>${stage==="before"?"Before — pinned main":"After — stabilization"} · frame p50 ${f(v[stage].p50)}ms</figcaption></figure>`).join("")}</div></section>`).join("");
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bangkok geographic stabilization review</title><style>body{margin:0;background:#101c25;color:#e6edf0;font:16px system-ui;line-height:1.5}main{max-width:1500px;margin:auto;padding:24px}h1,h2{line-height:1.15}a{color:#87dbcf}nav{display:flex;gap:12px;flex-wrap:wrap}section{margin:38px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0}img{width:100%;display:block}figcaption{padding:8px;background:#233742}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#172a36;padding:18px;border-radius:8px}@media(max-width:800px){.pair{grid-template-columns:1fr}}</style><main><h1>Tuk Tuk Rush: geographic-engine review</h1><p>Actual WebGL captures. Not an iPhone FPS certificate. Draft only; no merge or publication.</p><nav>${summary.views.map(v=>`<a href="#${v.name}">${esc(v.name)}</a>`).join("")}</nav><p><strong>GPU buffers smaller; downloads larger. Remaining activation spikes and source conflicts prevent mobile/facade readiness sign-off.</strong></p>${gallery}<h2>Technical report</h2><pre>${esc(report)}</pre></main></html>`;
fs.writeFileSync(new URL("review.html",dir),html);
console.log(JSON.stringify({views:summary.views.length,passed,total:results.length,htmlBytes:Buffer.byteLength(html)}));
