# Geographic Bangkok traffic foundation — PR #56

## Honest scope: source-directed moving vehicles, not finished Bangkok traffic laws

This is the first actual moving AI fleet **in the geographic world**. Vehicles follow the existing OSM graph rather than the old compressed city. Taxis, ordinary cars, motorbikes and tuk-tuks are rendered as **temporary low-poly, fixed-budget instanced meshes**. The realistic exterior car art, traffic noise and dense parking will follow after physical iPhone performance certification.

### Implemented
- **One-way legality:** AI respects OSM source `oneway=yes/true/1/-1`, and implicit motorways/roundabouts from the pinned source pack. Untagged/two-way roads remain bidirectional; the player retains arcade freedom.
- **Real motor-road access:** the already pinned source road data is audited for source footpaths, cycle lanes, pedestrian lanes, `access=private/no`, `motorcar=no`, `motor_vehicle=no` and non-motor highway classes. A sparse `blockedMotor` list is derived by `pack-geographic-road-rules.ts` and verified for **every sourced way**. This neither rebuilds geometry nor changes the global navigation ABI. If Replit loads an older valid road-rules pack without this metadata, the AI fleet fails closed (remains off), but the geographic map and player driving still work.
- **Left-side traffic:** the local lane offset is derived from world-space road direction and 3D width, rather than placing all vehicles directly down the road center. Road start/end offsets taper into junctions; bridge/tunnel elevation is respected.
- **Deterministic movement:** vehicles traverse source-connected nodes, never phantom corner connections; grade-incompatible or non-drivable segments are rejected. They may disappear at legal dead ends. The fixed-step-capped simulation bounds worst-frame displacement and uses source-aware car-following distances, conservative conflict waiting, and proximity yielding to the player.
- **Streaming-compatible local fleet:** the source spatial edge index samples only nearby roads. Max 16 agents at medium quality, 9 at low; distance-based despawn. Geometry is drawn with **five instanced mesh batches**, not one mesh per AI car. All state is local and reset when not playing; the user can disable it via **Local traffic OFF** or `?world=geographic&geoTraffic=0`.
- **Future traffic controls:** the simulation accepts *verified, source-linked* stop/signalled approach controls and tests red/green phases and complete stop dwell. **No actual Bangkok stop sign or signal nodes have yet been imported into the current runtime.** No fake lights or signs are placed at unverified junctions.

### Important remaining items
1. Real **tagged traffic-signal, stop/yield node and OSM turn-restriction relation import** from the pinned full Thailand PBF, tied to the correct approach edges and verified against street geometry. These are missing from the currently retained runtime source; do **not** fill them in with synthetic junction inference.
2. Protected signal groups, timed phases, real right-of-way, turn restrictions, legal local speed limits, merging/overtaking, motorcycle filtering and realistic congestion. The current junction-conflict yield is a basic safety proxy, not a complete Bangkok intersection model.
3. Vehicle collision response in the player physics system; currently cars avoid the player but physical bump reactions are not implemented.
4. More realistic car/motorbike/tuk-tuk models, authentic Thai taxis and station/road signs; validated mobile LOD and audio.
5. Physical iPhone 17 Pro Max test at startup, night/traffic density, 5+ minute driving, streaming crossovers, memory and p95 frame times before increasing agent count.

### Tests
- Dedicated action **Geographic Bangkok local traffic foundation** runs: strict TypeScript, synthetic deterministic AI regression, and full OSM source-to-motor-access audit using existing pinned runtime files.
- Existing geographic gameplay tests run traffic regression first. Legacy visual/mission and native source layout remain unchanged.
- `pnpm --filter @workspace/tuk-tuk-rush test:geographic-traffic` checks graph legality, source-only vehicle roads, actual left-side position, identical-seed replay, bounded fleet, player-free startup, red signal and tagged stop dwell.
- Browser preview: `?world=geographic`, Free roam, **Local traffic ON**. For a clean benchmark, use `?world=geographic&geoPerf=1`; turning traffic OFF should remove all AI meshes, without changing player GPS or collision data.

This is not a production signal/traffic-law certification. It is a meaningful moving-traffic foundation for a visually lively Yaowarat/Bang Rak pilot.
