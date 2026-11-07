# PR61 — Yaowarat Alive

Base: `0c84000d896922ba512d54f4c52d90881be0f105` (merged PR60). Work in progress.

The first source selection extends the same edge adapter along Yaowarat, Song Wat,
Song Sawat, Plaeng Nam, Phadung Dao, Yaowaphanit, Mangkon, Phat Sai, Ratchawong
and the connected Wanit 1 setting. No source geometry or traffic rules are edited.
The generated area is reproducible from the pinned runtime archive.

## Geographic research decisions

- Tang Toh Kang: exact pinned building `osm:way/305102098`, name/address and seven
  levels in source tags. Historic setting on Mangkon at Sampheng, not Yaowarat.
  [Mapped footprint and photograph](https://mapcarta.com/W305102098).
- Grand China: exact named source `osm:way/305102108`; individually compose its
  street frontage/podium within the source height, not an invented tower.
  [Official address](https://www.grandchina.com/contact-us/): 215 Yaowarat,
  Ratchawong intersection.
- Chinatown Hotel: exact named source `osm:way/305102087`, 526 Yaowarat.
  [Hotel listing](https://www.agoda.com/en-us/chinatown-hotel/hotel/bangkok-th.html).
- Hua Seng Heng: [official branches](https://www.huasengheng.com/en/contact/).
  Yao Phanit 418–420 map anchor 13.740462,100.50964. Nearest source building
  `449024048` has road-facing edges disabled by authoritative clearance policy.
  Do not force frontage or transfer this name to `327812626` across the road.
- Hua Seng Hong: [official site, photos and map](https://www.huasenghong.com/branch-yaowarat),
  371–373 Yaowarat; official map 13.740855,100.509102. Frontage crosses the source
  road envelope / has less than the required .35m margin. Use original restaurant
  compositions elsewhere; do not falsely attribute adjacent shops.
- Song Wat: [Thai government district reference](https://thailand.go.th/issue-focus-detail/----280?hl=en)
  supports historic merchant / contemporary cafe contrast. The node at
  [13.73809,100.50761](https://mapcarta.com/N4605868307) is a research anchor only;
  insufficient to assign a precise historic business to a nearby footprint.

## Baseline and environment

PR60 has 101 admitted edges (25 Song Wat), 1099.86m of edge length.
Initial PR61 selection has 357 edges (48 Song Wat), 4330.75m, across four chunks.
These are summed source edges, not a claim of uninterrupted shop frontage or
route length. Missing/obscured/unsafe source edges remain undecorated.

The local Chromium launch failed with process-singleton Unix socket EPERM.
No browser results are claimed from that attempt. Automated CI browser evidence
will compare the pinned PR60 source with final code under identical conditions.
No physical-iPhone certification is claimed.
