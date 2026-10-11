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

The run of plots is generated from `yaowarat:3` to `yaowarat:6`
via the **same sampled curved road graph used by driving and collisions**.
Each building has a distinct collision shell and hand-authored facade layer.
Plot spacing and street side were selected to preserve playable arcade lanes.
They were not derived from surveyed front-door GPS points or measured
architectural elevations. Actual street-corner placement for Nai Ek/Soi 9,
the precise Yaowa Phanit intersection, and the neighboring building order
require stronger location-aligned visual evidence.

This is a production-quality **asset prototype**, not a certification that the
whole road looks identical to reality. The wider street remains largely
procedural. No copied photo, trademark logo, or proprietary map tile has
been included. Clearance of commercial logos should precede publication.

## QA

Run: `pnpm --filter @workspace/tuk-tuk-rush run test:signature`.

A separate GitHub workflow captures **actual WebGL screenshots** with a
Linux/Chromium art-inspection camera. It saves matching hero-shop viewpoints,
street overview and 844×390 landscape. These are *not* user iPhone
screenshots, 60 FPS claims, or completed photo-matching studies.

### Still required to declare the full 12-point vision complete

- True storefront survey and photograph-matched facade proportions.
- Exact multi-language sign lettering, typography and verified placements;
  clearance before copying distinctive branded artwork.
- Verified Yaowa Phanit and Soi 9 connections with proper geometry.
- Opposite-side 6-building handcrafted streetscape and alleys.
- Wider prop kit, more localized night-food activity, licensed commercial textures.
- Verified daylight-vs-night presets, actual iPhone walkthrough and FPS.
- Matched photo/in-game comparisons with camera and source coordinates.
