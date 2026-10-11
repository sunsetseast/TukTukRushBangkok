# Yaowarat Signature Corridor — First Handcrafted Production Slice

**Scope:** 418–456 Yaowarat Road cluster, Bangkok Chinatown. The game is an
arcade-compressed 3D miniature; these locations are **not yet photogrammetrically
or parcel-level reconstructed**, and none of the new signs are copied logos.

## Primary-source storefront research

| In-game ID | Business reference | Address evidence | In-game treatment | Accuracy |
|---|---|---|---|---|
| `hua418` | Hua Seng Heng — Yao Phanit branch | https://www.huasengheng.com/en/contact/ | Red/gold full-height pilasters, rounded canopy, large fascia | Name and address verified; architecture inspired, not exact |
| `nai442` | Nai Ek Roll Noodles | https://www.timeout.com/bangkok/restaurants/nai-ek-roll-noodles | Low white/red fascia, open stainless counter, noodle pots | Address and business verified; restaurant sits by Soi 9; frontage/surface reconstructed approximately |
| `thong444` | Thong Bai Yaowaraj branch 1 | https://thongbai.com/ | Gold shop with red/yellow/green/blue layered lightbox and upper windows | Address verified; do not confuse with 152–154 branch photographed by BangkokType |
| `so456` | So Seng Heng | https://www.sosengheng.com/contact-us | Tall red/gold blade crowned with an original dragon-inspired sculpted ornament | Name/address verified, silhouette inspired by sign references; text/logo illustration not exact |
| `tea-house` | Fictional contextual filler | — | Wooden shutters, tea-house balconies | Fictional |
| `traditional-medicine` | Fictional contextual filler | — | Green pharmacy cross, small medicine display | Fictional |
| `heritage-balcony` | Fictional contextual filler | — | Aged shophouse, tiered balconies | Fictional |

## Sources for setting and sign composition

- https://bangkoktype.com/category/yaowarat/ — signs and letterforms in context (reference-only).
- https://www.timeout.com/bangkok/things-to-do/things-to-do-in-yaowarat — environmental context.
- https://gemstreasure.git.or.th/storage/2yTpGSOR7n3j9yHubCsqLwCT4s5p1M-metaSVNTVUUgMDAzLUdPTEQgT0JTRVNTRUQucGRm-.pdf — gold-shop district locator; an illustrated overview, not elevation/survey data.
- https://www.sosengheng.com/about-us — business history and identity.
- https://www.thongbai.com/ — branch names, locations and business details.

## Architectural and mapping limitations

Four named shops now use **independently sourced approximate geotags**
projected onto the **same sampled curved road graph used by traffic, collisions
and driving**. Their geographic positions and side-of-street are no longer
inferred from numerical address order. Buildings may move several game meters
from those projections to preserve arcade vehicle clearance and junctions;
their facade widths and heights are artistic approximations.

| Shop | Approximate lat, lon used | Secondary position evidence |
|---|---|---|
| Hua Seng Heng 418–420 | 13.740462, 100.509640 | Local map listing, cross-checked against the Yaowarat alignment |
| Nai Ek 442 | 13.740258, 100.509982 | https://johorkaki.blogspot.com/2019/10/nai-ek-roll-noodles-michelin-plate-kway.html |
| Thong Bai 444 | 13.740420, 100.509940 | https://bangkok.worldplaces.me/th/review/78162130.html (low-authority estimate; must recheck) |
| So Seng Heng 456 | 13.739890, 100.510480 | https://mapcarta.com/N3096836187 (OpenStreetMap-derived) |

The three context shops are **explicitly fictional** with approximate authorship
positions. Additional opposite-side fictional facades are permitted only where
they clear all roads and existing shops, and not represented as actual named
businesses.

These geotags are not surveyed shop entrances or storefront parcel boundaries.
Precise current storefront photos, Nai Ek/Soi 9 corner geometry, Yao Phanit
junction geometry, and real shop-sign designs still need a location-matched
physical/photo survey. Do not claim these assets are identical to the real road.

This is a production-quality **asset prototype**, not a certification that the
whole road looks identical to reality. The wider street remains largely
procedural. No copied photo, trademark logo, or proprietary map tile has
been included. Clearance of commercial logos should precede publication.

## QA

Run: `pnpm --filter @workspace/tuk-tuk-rush run test:signature`.

A separate GitHub workflow captures **actual WebGL screenshots** with a
Linux/Chromium art-inspection camera. It saves matching hero-shop viewpoints,
street overview and 844×390 landscape. These are *not* user iPhone screenshots,
60 FPS claims, or completed photo-matching studies. The screenshots are
automatically uploaded as workflow artifacts so a reviewer can inspect them.
They show original stylized models; a real-world visual match has not been
established. The fidelity bar remains higher than this initial build.

### Still required to declare the full 12-point vision complete

- True storefront survey and photograph-matched facade proportions.
- Exact multi-language sign lettering, typography and verified placements;
  clearance before copying distinctive branded artwork.
- Verified Yaowa Phanit and Soi 9 connections with proper geometry.
- Opposite-side 6-building handcrafted streetscape and alleys.
- Wider prop kit, more localized night-food activity, licensed commercial textures.
- Verified daylight-vs-night presets, actual iPhone walkthrough and FPS.
- Matched photo/in-game comparisons with camera and source coordinates.
