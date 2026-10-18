# Before/after rendering cost

Actual Chromium 133 / SwiftShader WebGL, 844 × 390, identical ten player poses, Fast (`low`) and Detailed (`medium`). Four warm-up frames then five samples per pose. Tables use medians. Both raw profiles have zero page errors. Counts measure rendered scene submissions, not physical-device speed. Texture bytes below are an RGBA pixel estimate, not a browser GPU memory API; geometry bytes sum generated buffer arrays and include off-screen/LOD resources.

The change increases geometry and bundle cost. LOD batching and the shared storefront/park atlases bound the increase, but they do not make the extra geometry free. The largest new local triangle increase is the Victory setting. Physical iPhone Safari performance remains unvalidated.

| Pose | Quality | Calls before → after | Triangles before → after | Software frame ms before → after |
|---|---|---:|---:|---:|
| siam | low | 199 → 221 | 255,940 → 315,244 | 114.5 → 135.7 |
| chong-nonsi | low | 169 → 171 | 290,481 → 306,651 | 22.2 → 1015.2 |
| asok | low | 118 → 126 | 164,249 → 200,310 | 609.6 → 763.4 |
| taksin | low | 140 → 142 | 249,918 → 277,106 | 749.3 → 666 |
| icon | low | 184 → 181 | 256,101 → 248,747 | 673.3 → 582.3 |
| pho | low | 173 → 174 | 318,896 → 322,960 | 585.9 → 921.7 |
| lumphini-wireless | low | 142 → 141 | 237,276 → 271,695 | 530.9 → 606.1 |
| victory-approach | low | 140 → 151 | 159,836 → 200,770 | 498.2 → 828.1 |
| flower-market | low | 158 → 154 | 259,252 → 276,108 | 496.6 → 545.1 |
| river-city | low | 116 → 129 | 184,202 → 232,318 | 363.2 → 489.8 |
| siam | medium | 346 → 375 | 391,983 → 489,981 | 274.6 → 598.4 |
| chong-nonsi | medium | 186 → 189 | 322,757 → 337,591 | 358.8 → 613.9 |
| asok | medium | 153 → 163 | 208,969 → 245,566 | 827.7 → 1250.2 |
| taksin | medium | 221 → 227 | 321,904 → 365,464 | 747.2 → 915.6 |
| icon | medium | 247 → 246 | 316,813 → 314,977 | 415.9 → 1126 |
| pho | medium | 305 → 309 | 537,960 → 561,037 | 431.8 → 790.9 |
| lumphini-wireless | medium | 274 → 262 | 431,275 → 448,195 | 405.2 → 1416.7 |
| victory-approach | medium | 186 → 201 | 203,156 → 269,120 | 395.3 → 1064.5 |
| flower-market | medium | 221 → 216 | 339,212 → 356,880 | 573.8 → 735.8 |
| river-city | medium | 157 → 170 | 227,348 → 277,488 | 304.4 → 508.5 |

Software frame-time samples vary with concurrent CPU work, Vite and SwiftShader. They are retained as raw indicators and **must not be converted into claimed iPhone FPS or a reliable hardware speedup/regression**. Draw/triangle/resource comparisons are the useful repeatable quantities here.

| Resource | Before | After | Change |
|---|---:|---:|---:|
| Generated geometry buffer bytes | 139,294,800 | 154,656,096 | +11.0% |
| Generated geometry objects | 6,098 | 6,597 | +8.2% |
| Material objects | 409 | 455 | +11.2% |
| Texture objects | 15 | 25 | +66.7% |
| Estimated texture RGBA bytes | 24,215,552 | 26,312,704 | +8.7% |
| Minified application JS bytes | 1,972,777 | 2,122,403 | +7.6% |
| Gzipped application JS bytes (Node zlib default, both builds) | 638,385 | 692,975 | +8.6% |

## Safeguards and limits

- Three public spaces use shared opaque materials, near/far batched vegetation and no individual tree draw calls. Lumphini has 398 authored trees, not hundreds of separate point lights or transparent crowns. Public-space bounds participate in distance culling; a wide park is not culled solely by distance to its center.
- Victory, historic compounds and commercial models use near/far LODs and shared glass/materials. The flower displays are batched geometry. Store configurations share one 512 × 256 atlas and gate labels another; small historic text panels account for additional texture objects.
- No new runtime dependency, real-time reflection render target, per-store light, or unbounded asset scatter was added. Existing Fast/Detailed transitions remain tested. Disposal checks cover generated geometries, materials and textures.
- This snapshot passes explicit review budgets of 400 rendered calls, 600,000 triangles, 160 MB generated geometry buffers, 470 materials, 28 textures and 2.2 MB minified application JS. These are bounded desktop/software scene-inventory limits, **not certified mobile frame-rate budgets**.

Reproduce with `CHROMIUM_PATH=/path/to/chromium node scripts/profile-city-reconstruction.mjs`. Set `CITY_LABEL=before` and run the same script against detached `9e24ada` for the baseline; `CITY_OUTPUT` selects the common evidence directory. The browser binary is a QA tool and is not a repository dependency.
