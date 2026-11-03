# PR #58 — Thai/Bangkok geographic road signage

## References (researched 3 November 2026)
1. Thailand Ministry of Transport, Office of Transport and Traffic Policy and Planning (OTP), **Traffic Markings and Traffic Signal Manuals**: https://www.otp.go.th/post/view/2098. This is the relevant primary reference for regulatory/traffic-control standards, intersections and signal apparatus.
2. Thailand Ministerial Regulation on installation of highway traffic signs, marks and lights, B.E. 2563 (2020), clause 5: https://lawplayer.com/th/article/ocs-%E0%B8%970006-2B-0027/k-5. Defines mandatory **หยุด** (stop), **ให้ทาง** (give way), entry prohibitions, parking restrictions, speed-limit signs, one-way controls and others. **Do not create signs with no grounded applicable restriction.**
3. Bangkok real-world BMA visual style: blue street name plaques displaying **Thai text above English**: https://www.istockphoto.com/photos/bangkok-street-sign. The physical posts and plaques here are stylized original art, not copyrighted photo extracts.
4. Source inventory: `data/bangkok/real-scale/traffic-controls.v1.json.gz.b64`, original JSON SHA-256 `c404139a87a573a0737631fc4119885c29959f7b3c58307a37cc558aab5f1cc9`. The 2026-11-03 Thailand OSM snapshot is newer than the reference geographic graph. **Only node-ID-and-coordinate-aligned source controls may govern AI traffic.**

## Implementation

### Actual source-backed regulatory controls
- `controlImport.ts` preserves original OSM control tags alongside the existing exact source node IDs and coordinates.
- `thaiSignFaces.ts` draws an 8-sided **หยุด** stop plate in red with white border and Thai text; an inverted white/red **ให้ทาง** triangle; and **only when explicit matching OSM signs exist**, no-entry, no parking, no stopping, no U-turn, and numeric km/h speed-limit faces. Other regulatory categories remain gated on exact source evidence.
- Source `traffic_sign=maxspeed` without an explicit numeric `maxspeed` is **not sufficient** to render a speed limit. The actually imported dataset has six such unspecified labels, one `city_limit` and one `traffic_sign=yes`. PR #58 deliberately **omits generic blank blue panels**, since those could falsely imply legal instructions or speed values.
- Traffic lights have a dark three-lens vertical housing with red, amber and green lens glass, per-approach orientation and simulated red/amber/green phases. The simulation schedule is **gameplay-only**, not Bangkok's measured phasing. A separate 4-second interphase clearance remains in effect.
- Only the **48 closest tagged controls** are considered per 200 ms tick. The hardware and symbol plates are instanced in fixed-size GPU pools; sign textures are cached once by category/value and disposed on unmount.
- Standalone regulatory plates without a uniquely verified approach do **not** materialize at the middle of a road. Signal poles without source approach direction remain unlit.

### Named source roads
- `thaiStreetNames.ts` reads the actual source `name:th` / `name:en` values already retained in the packed geographic road graph. It never translates missing names automatically, invents missing local alley names, or creates an unsourced district label.
- `ThaiStreetNameActors.tsx` renders up to **six** reusable blue/white bilingual plaques along nearby source-named drivable roads. Thai text is above English where both exist; a single language appears where only one is available.
- Each plaque is an **artistic, deterministic sample mounting position** on that real road segment. It is not claimed to reproduce the exact position, mounting height, route shield, district marker or administrative emblem of an actual installed BMA street sign.
- The road-name art is intentionally omitted from bridges and grade-separated routes. Fonts use Thai-capable browser font fallbacks `Noto Sans Thai`, `Thonburi` and `Tahoma`, without shipping external fonts.
- Exactly **six CanvasTextures** are allocated for street names and painted only when a name changes, with no citywide texture cache. Road name signs and traffic controls persist when the optional AI fleet is disabled.

### This PR does not invent signs
- No invented traffic-light poles at intersections without real OSM evidence.
- No fabricated Thai speed limits from missing values or a 50 km/h assumption.
- No automatic stop or yield duty on unspecified direction edges.
- No unsourced English transliterations, no decorative "BMA" city seal, no fictional junction-name plates.
- No claim that every installed physical roadside sign in Bangkok has been surveyed. The upstream source contains 495 tagged control nodes in the geographic area; it is not a complete municipality-wide sign inventory.

## Testing and release gate

1. `pnpm --filter @workspace/tuk-tuk-rush typecheck`
2. `pnpm --filter @workspace/tuk-tuk-rush test:thai-road-signage`: strict tags; real bilingual names only; bridge/junction guardrails; left-side signage.
3. `pnpm --filter @workspace/tuk-tuk-rush test:geographic-control-import` and `test:geographic-controls-ready`: hash/source-node and legal-action verification.
4. `node scripts/browser-thai-sign-textures-webkit.mjs`: browser-generated texture atlas image and pixel checks for Thai glyphs and colors. Runs in the focused geographic CI action.
5. `node scripts/browser-thai-road-signage.mjs`: real mobile viewport, real OSM map data, moving traffic sign scene and name plaque evidence captured in Chromium WebGL. Runs in geography QA action.
6. Existing geographic map transport, chunks/building rendering, driving and source-data checks remain mandatory.

**Release status:** A code-complete PR still requires all corresponding GitHub Actions results and a physical **iPhone 17 Pro Max** Safari driving/visual review. WebKit engine on Linux and Chromium SwiftShader are useful regression checks, not a device performance certificate. Do not auto-merge or deploy this PR.
