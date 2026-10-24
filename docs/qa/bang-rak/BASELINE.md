# PR41 production baseline audit

Main was cloned and verified at `14919cdc70e4cd832cb3cfbc124603c2385ad932`.
There was no previous PR42 branch. Read the complete PR41 report, PR42 blueprint,
streetfront standard, relevant production plans, batching, signage, clearance,
road identity and crowd systems before changing the game.

`validation/baseline-inventory.json` records **184 existing buildings** in the
survey collar, with complete roads, physical obstacles, landmark origins, existing
sites and entrances. `validation/pr41-world.json.gz` records the entire baseline.
The saved matched `before/` images come from this original production renderer,
not an earlier PR's approximate camera.

| Class | Baseline finding | Disposition |
|---|---|---|
| Existing protected landmarks | River City at (−276,784), Mandarin Oriental at (−200,1040), Holy Rosary at (−256,696); State Tower / downstream hotels outside selected new lots | Preserve origins, architecture, approaches, river interface and transit. |
| Missing primary landmarks | Grand Postal / TCDC and Warehouse 30 absent; postal deferred in prior iconic inventory | Implement within fitted new parcels. |
| Street relationships | Charoen Krung retained; no represented Soi 30/32. Existing Wanit 2 reaches River City; direct Si Phraya connection missing | Add two bounded public approach lanes; retain northern graph. Direct Si Phraya is an explicit remaining deficiency. |
| Generic / repetitive frontage | Legacy shophouse and urban-block plots do not distinguish the creative quarter; no low warehouse cluster | Recompose selected mutable arterial/court parcels with six architectural recipes. |
| Rear blocks / gaps | Unplanned mutable lots occupy the new civic/warehouse sites; broad roadsides and exposed distant ground remain simple | Replace only ledgered lots; fit rear merchant row and protected civic forecourt. Wider district is not fully rebuilt. |
| Incorrect orientation / access | No postal or warehouse entrance can be inspected because those buildings do not exist | New east-facing postal frontage and lane-facing warehouse thresholds; existing origins not moved. |
| Intersections / overlap risk | New connections near preserved Chinatown rows and Silom corner require fitting | Keep every Chinatown parcel; reject the conflicting arterial corner proposal. |
| Baseline resource cost | 117,073,964 geometry/instance bytes; 14,828,558 retained triangles; 987,093 instances; 410 materials / 9 Node textures | Same inventory method used after. Browser label/depth textures counted separately. |

Architecture already approved outside this bounded work is inherited; no new
claim that every old Bangkok parcel has been visually certified. The known broad
city density, simplified distant masses and physical-device gate remain relevant.
