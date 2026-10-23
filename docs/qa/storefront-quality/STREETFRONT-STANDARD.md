# Reusable streetfront standard

`storefrontMounts.ts` owns fascia height, cabinet depth, physical lettering relief,
the protected lettering band, canopy height and cornice relationship. Local +u
runs along the facade; +v points toward its street. Use `facadePoint` for transforms.

| Area | Production rule |
|---|---|
| Architecture | Align floors, windows, jambs and lintels. Keep actual recessed rooms and correctly proportioned commercial openings. Upper balcony levels must clear the fascia. |
| Identity | One supported primary fascia per commercial bay. Rear service masses do not inherit unsupported retail lettering. Retire duplicate cabinets when the district system already owns the sign. |
| Lettering | At least 8cm physical relief beyond the cabinet and its edge rails. Preserve normal depth testing, front winding, licensed fonts and atlas shaping. |
| Reserved band | Read `protectedBottom`/`protectedTop`; keep awnings, cornices, balcony rails and supports out of intended road sightlines. Never solve clashes with renderOrder or disabled depth testing. |
| Mounts | Short returns attach recessed cabinets to their own wall. Blade arms end at/behind the cabinet, never through lettering. Both correctly oriented blade faces are certified. |
| Proportions | Choose blade height only after reserving overhead space; a low building retains its fascia instead of receiving an oversized blade. Secondary signs occupy available opposite-side facade area. |
| Neighborhoods | Keep Song Wat mercantile and subdued, Talat Noi mechanical/residential, Yaowarat lively and luminous, modern retail appropriate to its own district. |
| Ownership | Every emitted architectural piece carries its property/site ID. Do not support a sign from an unrelated building. |
| Pavement | Keep doors/corners usable, equipment in the existing property/apron and entire pedestrian paths clear. Service yards and protected compounds remain working/private spaces. |
| Street life | Face customers toward displays and workers toward their activity; keep 360 city candidates, 32 nearby people and 20 on Low. Reuse existing instanced geometry and poses. |
| Rendering | Shared atlases/materials, opaque detail, spatial batching, existing LOD/culling and resource disposal. No new per-store point lights, transparency layers or per-frame static rebuilding. |

`test:sign-visibility` samples the production architectural emitters using their
actual transforms and conservative oriented volumes. Each sign has 45 lettering
samples from four roadward approaches. More than 4/45 self-blocked samples is a
substantial obstruction failure. The report retains every commercial bay and both
blade faces, decorative blockers, neighboring-building obstruction and incidental
perspective overlap. Retired rear/duplicate signs are inventoried explicitly.

`browser-storefront-quality.mjs` uses the production world, controller, seeded
traffic and chase camera, plus explicit inspection fixtures. Its packed-depth
pass uses actual rendered meshes and Three r186's packing convention. It checks
all front-facing signs within 65m, at least 8px tall and at least 25 on-screen
samples, with 8cm raster/depth tolerance. Poles, cars and unrelated buildings stay
in the scene. An empty population is never a visibility pass.

Inspect matched full-resolution renders as well as the reports. Keep camera/FOV,
viewport, quality, time, traffic and replay fixed; include production driving,
four viewport sizes, ownership/clearance, font coverage, legal traffic journeys,
resource disposal and remote CI status. Browser software timing does not certify
physical Safari FPS, thermal behavior or device startup.
