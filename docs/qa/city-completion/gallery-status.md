# Visual acceptance remains pending

**No new before/after WebGL screenshots were captured. No new fidelity grades are awarded.**

The managed preview workflow requires control-browser, which is unavailable in this session. The implemented source has structural/geometry tests, but those do not establish visual quality. Physical iPhone Safari and browser touch QA also remain unperformed.

The [PR27 gallery](../geographic-city-reconstruction/gallery.md) is the actual starting baseline. Its B/C grades are historical; they are not new acceptance grades.

The supplied capture harness defines 35 locations and 82 views per version. These are **prepared poses, not delivered screenshots**. Do not treat this manifest as meeting the requested 30-view comparison requirement.

| Location | Requested views | Status |
|---|---|---|
| Lumphini Park lake geography | elevated | Pending capture/review |
| Lumphini Wireless Road entrance | road, elevated, night | Pending capture/review |
| Lumphini lakes and island | ground, elevated | Pending capture/review |
| Victory Monument roundabout | elevated | Pending capture/review |
| Victory Monument Phaya Thai approach | road, night | Pending capture/review |
| Sanam Luang ceremonial field | elevated, road | Pending capture/review |
| Giant Swing civic square | elevated, road, night | Pending capture/review |
| Wat Suthat compound south of Giant Swing | elevated, ground | Pending capture/review |
| Pak Khlong Talat flower market | elevated, road, night | Pending capture/review |
| Jim Thompson House canal compound | elevated, road | Pending capture/review |
| MBK Center / Pathum Wan | elevated, road, night | Pending capture/review |
| Siam Discovery | elevated, road | Pending capture/review |
| Siam Center | elevated, road | Pending capture/review |
| Siam Paragon | elevated, road, night | Pending capture/review |
| CentralWorld / Ratchaprasong | elevated, road, night | Pending capture/review |
| Siam Square commercial streets | elevated, road | Pending capture/review |
| Terminal 21 / Asok | elevated, road, night | Pending capture/review |
| River City Si Phraya waterfront | elevated, road, river | Pending capture/review |
| 7-Eleven Chinatown storefront | road, night | Pending capture/review |
| 7-Eleven modern commercial storefront | road, night | Pending capture/review |
| Bang Rak Charoen Krung corridor | elevated, road | Pending capture/review |
| Ratchadamri formerly exposed corridor | elevated, road | Pending capture/review |
| ICONSIAM / Khlong San surroundings | elevated, road, night | Pending capture/review |
| One Bangkok / Lumphini east edge | elevated, road | Pending capture/review |
| Wat Pho historic perimeter | elevated, road | Pending capture/review |
| Khao San urban frontage | elevated, road | Pending capture/review |
| Benjakitti accessible public space | elevated, road | Pending capture/review |
| Terminal 21 corrected northwest Asok site | elevated, road, night | Pending capture/review |
| Asok intersection and MRT/BTS context | road, elevated | Pending capture/review |
| Victory commercial/bus quarter | road, elevated | Pending capture/review |
| ICONSIAM river-facing architecture | river, elevated, night | Pending capture/review |
| Mandarin Oriental and Charoen Krung | road, elevated, night | Pending capture/review |
| Shangri-La and Saphan Taksin context | road, elevated, night | Pending capture/review |
| Chinatown driving corridor | road, night | Pending capture/review |
| Benjakitti western forest/wetland topology | elevated, road, night | Pending capture/review |

Reproduce in an environment with supported browser QA: run `node scripts/capture-city-completion.mjs` from the game package with `CITY_LABEL=before` against main `da73397`, then `CITY_LABEL=after` against this branch and the same `CITY_OUTPUT`. Use the same viewport, poses, quality, and scenery. The old Terminal location is retained alongside the corrected northwest site.
