# Root-cause audit and geographic correction

Base: merged PR34 main `1fb92d765d98157b7015543ee9d4f29500c26323`. The active renderer uses `buildRealArchitecture → realCommercial → sculptedLandmark`; editing an older mall fallback does not improve the actual scene. Review the fixed-pose gallery rather than relying on a PR description.

| Site | Primary defects | Implemented response / retained limitations |
|---|---|---|
| Terminal 21 | West vehicle arrival sees blank silver podium; detail was on +Z. Detached procedural shops block the east Asok frontage. | Glazed west entrance, wrapped south/east retail grid and curved corner; retain Y-plan hotel. Canonical pedestrian apron removes east row. Exact west vehicle-gate/curb legality remains unverified. |
| ICONSIAM | Flat secondary west glass; weak gold roof profile and undifferentiated road/river approaches. Existing internal +90° rotation correctly faces river east. | Layered retail, folded glass, gold peaks, separate entrances/terraces and planting. Keep Gold Line and river. Existing 65×65 compressed plot remains too small to reproduce the real broad development. |
| MahaNakhon | Weak narrow ribbon, complete cubes with hidden faces, generic podium; close arrival crops/obscures tower. | Connected carved occupancy, exposed faces only, same far silhouette, asymmetric crown and glass lobby. Distant public-road view improves recognition; close precinct still needs Cube/plaza work. |
| Hilton | Broad pale slab, weak rooftop/lounge enclosure and generic lobby. | Slender pale rounded slab, dark spine, glazed ThreeSixty roof, finer spandrels and distinct street/river lobbies. Grounds and storey proportions remain compressed. |
| Peninsula | Wave plan represented by four crude slabs; flat generic windows/entry. | Angled bays, punched glazing, pale piers, stepped crown, formal rear entry and river pavilions. Exact W and property garden/pool plan remain approximate. |
| Oriental | Historic/modern wings already distinct; rear canopy dominates, weak bay detail and grounds. | Preserve River/Garden/Authors identity; thin supported portico, rear curtain wall, heritage shutters and planted terrace. Compound remains compressed. |

Paragon, Central Embassy, River City, Chatuchak, Wat Paknam and Khao San were reviewed as follow-ups: podium/arrival depth, market/park context, precinct density and facade variety remain production work. They are not wholesale reconstructed here.

## Terminal east apron

Official Terminal transport guidance identifies Sukhumvit Soi 19, BTS Asok exit 1 and MRT Sukhumvit exit 3. The attributed Asok street photograph shows mall frontage on this side, rather than a detached shop row. The new `cityData.v1.json.architecturalAprons` entry declares local centre (65,−5), 40×60 pedestrian space and a 30m bounded residual-infill collar. This adapts the existing miniature setback, not a surveyed parcel boundary or new vehicle gate.

Four intersecting shop footprints are removed; three smaller side parcels refill outside the protected pavement. Total buildings 7,087 → 7,086; parcels 208 → 209. Paving/visible curbs match a low 0.24m pedestrian collider. The collider is introduced after legacy base-row enumeration, avoiding unrelated deterministic reshuffling. All original 208 protected parcels, road graph, landmark origins/yaws, arrivals, river and transit stay fixed. Strict baseline comparisons reject unrelated removal/refill; no geographic approval hash is changed.
