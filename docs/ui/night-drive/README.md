# Bangkok Night Drive

A UI rebuild on main `9bd832e` (merged PR #17). The existing scene, driving model, mission rules, save identifiers, left-hand road graph, BTS service, boost and LOOK camera remain the foundations.

## Design research → implemented decisions

- [The Crew Motorfest accessibility spotlight](https://news.ubisoft.com/en-ca/article/OUUpCEKxrkfv6I5sGAeWz/the-crew-motorfest-accessibility-spotlight): readable HUD backgrounds over a fast, visually busy world; reinforce color with text and symbols. Implementation: dark opaque-enough text surfaces, gold/coral pickup/drop-off labels, control labels, typed map icons, named boost states. No animated blur or SVG filters.
- [Motorfest map filter improvements](https://www.ubisoft.com/en-gb/game/the-crew/motorfest/news-updates/h6fET5uYvOZWThvUxurHq): simplify exploration with meaningful filters. Implementation: Places and BTS layers, persistent fare route, contextual place panel, optional nearby-station list. No permanent sidebar.
- [Forza Horizon 5 accessibility features, Xbox](https://news.xbox.com/en-us/2021/11/04/gaming-for-everyone-the-accessibility-features-of-forza-horizon-5/): preferences for motion, text and background presentation. Implementation: system/reduced motion, standard/large pedals, control surface opacity, settings accessible before driving. The title camera is stable and aligned with the street rather than orbiting through buildings.
- [Apple layout guidance](https://developer.apple.com/design/human-interface-guidelines/layout): group related controls and preserve content visibility. Implementation: local context upper-left, navigation and pause upper-right, deliberate bottom thumb zones, safe-area-aware boundaries and full-canvas map.

These are design principles, not copied artwork or layouts. All interface graphics are code-authored or existing Lucide icons. Typography uses the platform's licensed system fonts (Avenir Next on supported Apple devices, system-ui elsewhere) and the existing OFL Noto Sans Thai subset; the Thai license and provenance remain in `public/assets/fonts`. No remote font request, purchased art or additional UI framework.

## Architecture

`src/game/ui/night-drive.css` owns the theme: color, type, spacing, radii, elevation, motion and states. The obsolete game CSS has been removed from `index.css`. `Surface` owns menu focus, Escape and keyboard isolation. `preferences.ts` validates and persists a separate versioned preference record; it does not touch discovery saves. `Onboarding` records demonstrated actions and offers one dismissible hint at a time.

`App` owns entry/drive/pause/results, map restoration and inspection. The engine retains simulation ownership. The HUD remains mounted but invisible beneath overlays so the banner clock survives a pause. Paused snapshots do not trigger the regular App UI polling updates. Controls unmount and clear held input when the player opens map or inspection. No new account, inventory, career, housing or other speculative surface is exposed.

## Navigation contract

- `navigation.ts` creates one reverse shortest-path field per active target and district, reusing the existing directed road graph. HUD, minimap and city map use the same path.
- Route guidance looks 22 world metres along that route. Route distance is in the game's compressed world metres. A short connector from the player's lane to the road centerline is included.
- One-way edges are never reversed. At a junction, legal outgoing edges remain available. Disconnected targets return no path; the HUD explicitly labels direct distance and asks the player to check the map, without drawing a fictitious cross-city line.
- Engine straight-line distance remains the pickup/drop-off radius contract. Mission rewards, boarding timing and vehicle physics are unchanged.
- Navigation banner: compact upper-right while traveling; tap opens center details for 5,000 ms of active gameplay, repeated taps reset one timer. Pause/map/LOOK suspend the remaining time. Mission/session change clears it. Road-distance approach latch enters at 90 m and exits above 120 m. Inside the existing 9 m arrival radius, instructions and boarding progress replace travel guidance.
- The main movement is a 300 ms transform; a constant-size surface scales and extra text fades. No frame-driven React animation. Both system and explicit reduced-motion preferences remove transitions.

## Map

Layered river banks, canals, protected greenery, sampled building footprints, subdued undiscovered regions, road hierarchy, bridge highlights, typed discovered-place markers, heading-aware tuk-tuk symbol, and connected fare route. Optional BTS lines use their existing service data. Discovered-place icons use mission/type priority and screen-space separation; zoom reveals the remaining places without crowding the city overview. Labels reduce at city scale. Collision-aware placement prioritizes discovered places and interchanges, deduplicates shared stations, and reserves space for map controls; station markers remain visible even when their labels are culled. Selection shows existing name, district, category and discovery status; no attraction descriptions are invented. Controls support touch pan/pinch, plus/minus, recenter, whole city, layer toggles, keyboard pan/zoom, Escape and a focus loop.

## Review evidence

Before and after screenshots use actual gameplay, not mockups. A state without a separate pre-existing UI (compact/expanded banner or separate settings screen) uses the original fixed HUD/inline settings as the baseline. The documented arrival and results poses seed real engine state to reproducibly show those interfaces; gameplay journey regressions independently exercise actual fares.

See `qa.md` and JSON results for the final measured checks and limitations.

## Before / after screenshots

| Screen | Main | This branch |
| --- | --- | --- |
| Title | [Before](before/title.jpg) | [After](after/title.jpg) |
| Normal driving | [Before](before/driving.jpg) | [After](after/driving.jpg) |
| Compact navigation | [Before](before/compact.jpg) | [After](after/compact.jpg) |
| Expanded navigation | [Before](before/expanded.jpg) | [After](after/expanded.jpg) |
| Approach | [Before](before/approach.jpg) | [After](after/approach.jpg) |
| Passenger arrival | [Before](before/arrival.jpg) | [After](after/arrival.jpg) |
| City map | [Before](before/map.jpg) | [After](after/map.jpg) |
| Selected landmark | [Before](before/map-selected.jpg) | [After](after/map-selected.jpg) |
| BTS layer | [Before](before/map-bts.jpg) | [After](after/map-bts.jpg) |
| Pause | [Before](before/pause.jpg) | [After](after/pause.jpg) |
| Settings | [Before](before/settings.jpg) | [After](after/settings.jpg) |
| Shift results | [Before](before/results.jpg) | [After](after/results.jpg) |
| Landmark inspection | [Before](before/inspection.jpg) | [After](after/inspection.jpg) |
| Night driving | [Before](before/night.jpg) | [After](after/night.jpg) |

Additional captures cover portrait map/settings/inspection and larger landscape driving. The still-capture script holds simulation time for repeatable frames; interaction tests run the real simulation separately.

[Fully discovered city overview](after/map-all-discovered.jpg) verifies that the marker hierarchy also works after long-term exploration.
