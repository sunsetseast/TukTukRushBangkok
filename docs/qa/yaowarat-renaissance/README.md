# Geographic Yaowarat visual renaissance

PR #62 stacks on PR #61 and rebuilds the existing real-scale Chinatown coverage around a roughly 180 m signature corridor. The reconstruction uses all 357 previously admitted source frontages, including 48 in Song Wat. The original compressed world remains the visual reference.

## In-game comparison gallery

The images come from the running WebGL game at 844×390. Paired geographic views use the same poses. The condensed views use comparable street and shop compositions at their own map scale. Its golden-hour and night images use production lighting. The controlled daylight reference changes the lighting in the QA browser only.

| View | PR #61 and condensed reference | Rebuilt geography |
|---|---|---|
| Day street | [PR #61](views/baseline-01-yaowarat-day.png), [condensed daylight](views/originalday-day.png) | [Day](views/final-01-yaowarat-day.png) |
| Golden hour | [PR #61](views/baseline-21-yaowarat-golden.png), [condensed](views/original-golden.png) | [Golden hour](views/final-21-yaowarat-golden.png) |
| Night street | [PR #61](views/baseline-02-yaowarat-night.png), [condensed](views/original-night.png) | [Night](views/final-02-yaowarat-night.png) |
| Gold gallery | [PR #61](views/baseline-03-gold-shop.png) | [Gold gallery](views/final-03-gold-shop.png) |
| Kitchen and vendor | [PR #61](views/baseline-16-wok-house.png) | [Kitchen](views/final-16-wok-house.png), [second vendor pose](views/final-vendor-frame-b.png) |
| Surfaces and recesses | [Condensed close-up](views/original-shop-golden.png) | [Window and storefront detail](views/final-22-materials-windows-day.png) |
| Signs and infrastructure | [PR #61](views/baseline-06-signs-and-cables.png) | [Signs and supports](views/final-06-signs-and-cables.png) |
| Corner and side street | [PR #61](views/baseline-05-varied-frontage.png) | [Adjoining blocks](views/final-05-varied-frontage.png), [corner](views/final-23-corner-side-street.png) |
| Chinatown Gate | [PR #61](views/baseline-07-gate-approach.png) | [Approach](views/final-07-gate-approach.png) |
| Song Wat | [PR #61](views/baseline-19-songwat-merchant.png) | [Merchant house](views/final-19-songwat-merchant.png), [historic street](views/final-08-songwat-historic.png) |
| Tang To Kang | [PR #61](views/baseline-13-tang-to-kang.png) | [Goldsmith](views/final-13-tang-to-kang.png) |
| Graphics quality | [PR #61 Fast](views/baseline-09-fast.png) | [Fast](views/final-09-fast.png), [Pretty](views/final-10-pretty.png) |
| Native chase | | [Driving with HUD](views/final-24-native-gameplay-driving.png) |
| Source alignment | [PR #61](views/baseline-11-elevated-alignment.png) | [Elevated view](views/final-11-elevated-alignment.png) |
| Connected coverage | [PR #61](views/baseline-20-wide-continuity.png) | [Wide view](views/final-20-wide-continuity.png), [western storefronts](views/final-18-western-tea.png) |

## Rendering and source ownership

One shared 512 KiB finish array supplies repeatable plaster, concrete, masonry, tile, wood, commercial metal, cloth and glass patterns. Vertex lighting supplies the directional palette, metal highlights and the glass sky tint. Facades take one filtered finish sample per pixel. The world-space shop field gives pavement local warm pools and uses vertex sampling on smaller facade pieces. Each scene owns its textures, and each streamed chunk owns its geometry and instance buffers.

The shop rooms, window openings, balconies, canopy supports and side elevations follow the existing source edges. A worker substitutes the visual draw indices for selected wall triangles while preserving the source arrays and collision edges. Core instances let the connected corridor use the same construction grammar. Song Wat has its own brick, timber and shutter palette. Real business signs retain their pinned source IDs. Thai road plaques use the shipped font. Road-edge paint follows source carriageway widths and leaves intersections clear.

The gold gallery and tiled kitchen have deep back walls, supported canopies and local light. The shared street-life instance stream gives cooks tapered silhouettes and independent motion phases. Simple figures, quiet streets outside shop clusters and visible source gaps remain part of the current stylized world. The original's compressed layout still gives it greater density in some views.

[Checkpoint history](PROGRESS.md) · [Initial visual audit](VISUAL-GAP.md) · [Final camera records](final-captures.json) · [Pinned PR #61 records](baseline-captures.json)

## Visual review

The final image review covered 25 geographic views and two controlled-daylight condensed views. The tighter gold and kitchen shots show the recesses and local light. Song Wat's corner view shows the new side elevation. Tang To Kang's lettering clears the cornice after the fascia band was reserved. Day, dusk, and night use distinct sky and street palettes. Fast retains the sign silhouettes, window depth and paving. The native chase shot shows the reconstruction from the driving camera with the gameplay HUD.

The original condensed street still has more individual storefront silhouettes and more activity between shops. In the geographic version, some source-constrained side streets and the Gate's surrounding blocks still read as simple massing. The driving view and the elevated view show the transitions directly.
