# Represented transit review

Primary references: [BTS operator route page](https://www.bts.co.th/eng/routemap.html), [operator PDF with future-station legend](https://www.bts.co.th/btsroutes/btsroutes.pdf), and the [operator route/road description](https://www.bts.co.th/eng/library/system-structuer.html), checked 21 October 2026. Operator material is linked, not redistributed. MRT identities/context use the BEM station pages linked in [sources](sources.md).

| Runtime line | Represented sequence | Review |
|---|---|---|
| Sukhumvit | Mo Chit → Saphan Khwai → Ari → Sanam Pao → Victory Monument → Phaya Thai → Ratchathewi → Siam → Chit Lom → Phloen Chit → Nana → Asok → Phrom Phong | Relative order matches the operator map within represented scope. North segment follows authored Phaya Thai/Phahonyothin controls; east segment follows Rama I/Phloen Chit/Sukhumvit controls. The real line continues beyond both ends. |
| Silom | National Stadium → Siam → Ratchadamri → Sala Daeng → Chong Nonsi → Saint Louis → Surasak → Saphan Taksin → Krung Thon Buri → Wongwian Yai | Relative order retained, including river crossing to the west bank. Station/road alignments use existing snapped corridors. The real line continues westward beyond this slice. |
| Gold | Krung Thon Buri → Charoen Nakhon → Khlong San | Three-stop sequence retained; G2 serves the ICONSIAM context. Existing separate guideway/train representation is preserved. |

Sena Ruam (N6) appears as a **future** station symbol on the operator map rather than an operating stop. It is explicitly excluded from this playable slice's station list; numbering gaps alone are not evidence of missing service. Recheck official status before implementing it. The inventory does not invent its coordinates.

MRT: four inherited surface representations remain at their old coordinates; Sanam Chai BL31, Sam Yot BL30 and Wat Mangkon BL29 add three bounded entrances. Sanam Chai's operator references connect Museum Siam/Palace/Wat Pho and river approaches; the game represents this with one compressed sidewalk canopy, not a surveyed reconstruction of every exit. All MRT rail remains underground.

Existing rail network, supports, train stopping/movement, Siam grade separation and clearance tests pass in the master-plan regression group. Before/after transit arrays are identical. Station envelopes and support avoidance remain authoritative existing systems. This validates preservation and internal clearance, **not** every platform's photographic architecture or exact WGS84 track alignment. Station-specific roof profiles, skywalk/entrance bearings and escalator details remain a researched art phase. No support/track relocation is justified or claimed in this PR.
