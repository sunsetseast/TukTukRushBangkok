# Measured performance

Baseline is PR36/main; corrected is the exact PR37 runtime used in the gallery. The resource inventory constructs the complete city, including retained LODs and chunks, without a browser canvas. Browser measurements use a fresh scene/context on both sides, matching 640×360 medium-quality cameras, elapsed 40 s, traffic disabled, eight warmup frames then 24 recorded frames. Browsers run sequentially on this shared host. Raw submitted mesh groups are retained in the browser JSON to inspect visibility and batching without changing visibility.

| Complete scene inventory | Before | After |
|---|---:|---:|
| buildings | 7,205 | 7,204 |
| roads | 2,087 | 2,087 |
| geometryBuffersBytes | 115,253,648 | 115,239,060 |
| geometries | 9,890 | 9,896 |
| materials | 394 | 394 |
| textures | 8 | 8 |
| trianglesAllLevels | 14,893,663 | 14,889,797 |
| instances | 996,818 | 996,661 |
| constructionMs | 46,244 | 42,134 |
| constructionCpuMs | 52,399 | 48,203 |

Retained geometry buffers change by -14,588 bytes (-0.0127%). Both inventories dispatch geometry, material and texture disposal for every counted resource. Construction timings are one observation each, not a statistically established speedup. Maneuver indexing is startup-only and cached; its 80-unit spatial cells are not rebuilt per driving frame. Contact telemetry is optional and creates no contact record when unused.

| Matched view | Draw calls before → after | Triangles before → after | Software frame median ms before → after |
|---|---:|---:|---:|
| icon-street | 349 → 348 | 345563 → 343555 | 154.5 → 470.8 |
| taksin-driving | 334 → 334 | 387893 → 387967 | 298.3 → 310.1 |
| oriental-river | 396 → 397 | 529961 → 526991 | 428.8 → 429.5 |

Raw [browser baseline](browser/before-qa.json), [browser corrected](browser/after-qa.json), [inventory baseline](validation/before-inventory.json), [inventory corrected](validation/after-inventory.json) and [comparison](performance-comparison.json) retain all samples and CDP garbage-collected heap readings. The preserved shoreline batching, materials, culling and water mesh are unchanged. No scenery is hidden to reduce calls. This focused correction does not reverse PR36’s draw-call increase; its local object count and buffer impact are measured here.

SwiftShader uses a software renderer and frame times on this host are unsuitable for estimating iPhone FPS. Physical iPhone Safari, thermal behavior, battery use and sustained real-device performance remain unverified. The four requested viewports are browser layout checks; portrait driving retains the existing rotate-to-landscape guard.

The first corrected performance pass followed the UI/reset checks in the same browser process (with a fresh page/context); its raw samples remain in [after-qa-initial.json](browser/after-qa-initial.json). The reported corrected comparison repeats the three views in a fresh browser process, matching the baseline process protocol. ICONSIAM software frame timing is still slower in that repeated run despite one fewer draw call and fewer triangles. This host measurement is unresolved; it is not presented as a speedup or dismissed as a proven driver artifact. Real-device profiling is the next performance gate.
