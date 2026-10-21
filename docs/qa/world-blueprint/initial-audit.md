# Independent current-main audit

Base: `c5f2e210efb3146b782f00ea58f144f7005bc110` (merged PR33). Fresh generator snapshot: 2,089 roads, 2,036 nodes, 7,084 procedural buildings, 49 scene landmarks, 93 registered places, 208 protected parcels. Road render/graph fingerprint: `1652953968`. `before-world.json.gz` and sixteen matched actual-renderer frames are the immutable comparison inputs.

| Finding | Evidence and decision |
|---|---|
| Sound shared road world | One District graph drives navigation, asphalt, traffic and map. Preserve its full geometry and IDs; no OSM replacement or additional road graph. |
| Fragmented geographic authority | layout, geographic projection, master-plan controls, historic controls, authored anchors and real-place maps all carry placement information. Migrate approval data into one versioned document; retain adapter APIs and generation order. |
| Swing reference conflict | Its real coordinate projects to an older southing knot, while the approved visible feature is 263 game metres north. Keep the global transform; declare the local residual and feature-to-model offset. Changing a global knot would move unrelated destinations. |
| Incorrect map pins | Several labels use nominal request pins instead of actual authored model origins. Derive visible map features from approved model positions; retain navigation arrival IDs. |
| Suthat child reference | Registry offset was applied relative to the visible Swing rather than the compound model origin, introducing 58m displacement. Correct the read model. |
| Pier inheritance bug | All piers spread a Chinatown Gate record. Give every pier explicit bank, district, neighboring streets, owner and provenance. |
| MRT coverage gap | Four existing canopies omit BL29–31. Add bounded sidewalk entrances after legacy base-row enumeration, preserving unrelated deterministic generation. They remain compressed surface representations, not surveyed exits. |
| Existing premium machinery is useful | Shared PBR array finishes, architectural cell batching, signage atlases and near/far layers already exist. Upgrade these rather than adding an independent decoration engine. |
| Benchmark gap | The bespoke Yaowarat emitter covers only 19 parcels/first straight stretch. Expand along the actual curved corridor, constrain floor heights to collision massing, curate trade/sign variation and deepen architectural articulation. Use it with restrained historic materials at Tha Tien. |
| Incomplete iconic coverage | Name presence does not certify architecture. Build permanent inventory including absent temples, heritage buildings, parks, stations and hotels; distinguish compound sub-places from independent models. |
| Incomplete geographic certification | Existing tests prove connectivity/clearance, not surveyed orientation or artistic resemblance. Add approval/deviation gates; retain explicit research and visual-review warnings. |

No broad road redesign, world projection change, renderer replacement, hotel relocation or global vegetation-density increase is justified by this audit. Hotel massing/orientation certification and full citywide premium art remain phased work. Physical iPhone validation is unavailable in this environment.
