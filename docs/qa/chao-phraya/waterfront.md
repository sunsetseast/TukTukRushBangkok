# Waterfront reconciliation

## Models and placement

Asiatique is the only relocated landmark origin. It moves from X=-340.86582838174553 to X=-450.86582838174553 at the same Z=2046.1939766255643. The 110-world-unit shift reconnects the inherited inland plot to the sourced east bank while keeping enough dry room for its existing wheel/warehouse model and visitor loop. A first candidate closer to the bank was rejected by the parcel-safety checks; the implemented position is the reviewed dry alternative, not an automatic nearest-point snap.

The existing approved origin generates the model, collision, entrance, loop and protected grounds together. Two short approach segments replace four, connecting to the existing road at the new nearest appropriate node. Seven Asiatique nodes move and two obsolete connector nodes disappear. The stable landmark ID and `arrival:asiatique:loop5` passenger/discovery access remain. [Exact before/after graph objects](graph-approval-delta.json).

ICONSIAM, Millennium Hilton, Peninsula, Mandarin Oriental, River City, Shangri-La, Capella, Four Seasons and Anantara retain their origins and authored structural wings. Their source-backed banks remain correct. Hotel terrace/ground reservations adapt to the actual bank; those surfaces are not the protected architectural models. Terminal 21 and MahaNakhon's architecture is unchanged. The existing Gold Line beam still affects ICONSIAM's street composition and is documented rather than hidden for screenshots.

The parcel ledger records **258 removed / 377 added footprints**, from 7,086 to 7,205 buildings. Most reconciliation is at the old/new water corridor. The summary lists every change more than 400 world units from the new bank: a small number of secondary infill changes remain due to the existing capped solver. Stable PR35 rear-row parent keys prevent the much larger unrelated reshuffle produced by the old `i % 3` rule. No registered landmark is replaced by generic infill.

## Crossings

| Crossing | Geographic reference | Implemented verification / approximation |
|---|---|---|
| Phra Pinklao | OSM Somdet Phra Pinklao road/bridge ways 25715010/25715011 | Existing crossing and approaches remain connected across the approved banks; controller crossing succeeds. Exact real bearing is compressed with the existing street network. |
| Memorial / historic bridge reach | OSM Memorial Bridge 25706395 and neighboring Prajadhipok ways | Existing `memorial` crossing remains usable on both banks. The compressed crossing represents the existing game bridge; this PR does not newly model both real parallel bridges. |
| Saphan Taksin | OSM Krung Thon Buri bridge ways and Sathorn interchange references | Existing deck, approaches and rail crossing stay connected; water blocking exempts the real deck lane. Controller crossing succeeds in both the broader journeys and the dedicated crossing route. |

The reference map records real bridge geometry. Retained game approach bearings are explicit arcade approximations rather than a claim of exact surveyed road reconstruction. No ordinary road ribbon is allowed to pass through the new main-channel water; road-edge samples and bridge-center samples are tested separately.

Guideways and station origins remain fixed. A few bank-dependent support choices can change as their existing clearance solver evaluates the corrected water. The source's downstream Krungthep/Rama III bridge/support context is not a newly built road crossing here. Tagged support footprints are boat exclusions, not unsupported terrain islands. Completing omitted crossings belongs with the following street/bridge authoring pass.

## Piers and ambient craft

All 12 existing named landings remain represented: Tha Tien, Wat Arun, ICONSIAM, Asiatique, Oriental, Peninsula, Hilton, Shangri-La, River City, Tha Chang, Sathorn and Song Wat. The [geometry report](validation/geometry.json) gives their actual bank, water-side pose and land-side shore point.

Every landing selects a sufficiently long actual bank edge, stays off roads, has land behind it and water in front, and receives a physical gangway. The historic public landings additionally test their entire paved connection against real building footprints. That check caught and corrected a newly exposed Tha Tien obstruction; its pier is now aligned with the reserved public passage. Sathorn remains south of the driving crossing rather than underneath its deck.

Seven ambient river loops follow the approved spine. Rounded turns join parallel lanes without instantaneous ping-pong reversals. Precomputed paths reject banks, bridge lanes and the five source overwater structure exclusions. The tests sample 3,584 actual poses, hull clearance and heading continuity. Existing canal craft remain separate ambient routes; no boat-driving game is introduced.

## Shore treatment and south edge

Walls/caps sample the polygon boundary, not a nominal offset. Historic masonry, warehouse/commercial edges and hotel garden reaches use different finishes and lighting spacing; the old continuous railing/lamp repetition is reduced. Existing hotel terraces, palms and private grounds remain attached to their preserved models. No blanket promenade is invented across every property.

The playable rectangle ends at Z=2750 while the approved source water continues downstream into scenic terrain. Ordinary roads stop at their existing destinations/approaches, rather than being extended into new southern districts. Production fog/clipping hides the remote water termination. The full geographic inspection deliberately removes that atmospheric concealment to show the stored world; it is not a normal driving draw-distance benchmark.

## Matched traffic contacts

Seed 26, 38 traffic vehicles per journey. Values are contact **frames**, not collision counts. These runs do not certify all possible traffic encounters.

| Route | PR35 | River v2 |
|---|---:|---:|
| gate → river-city | 32 | 32 |
| river-city → oriental | 0 | 0 |
| hilton → icon | 0 | 0 |
| icon → peninsula | 0 | 0 |
| oriental → peninsula | 0 | 0 |
| peninsula → shangri | 0 | 0 |
| shangri → capella | 0 | 0 |
| capella → four-seasons | 0 | 0 |
| four-seasons → asiatique | 0 | 0 |
| asiatique → anantara | 62 | 93 |
| anantara → icon | 62 | 62 |
| pho → arun | 62 | 62 |
| pinklao-west → pinklao-east | 31 | 31 |
| memorial-west → memorial-east | 31 | 31 |
| taksin-west → taksin-east | 0 | 0 |
