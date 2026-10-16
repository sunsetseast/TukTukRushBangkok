# Living Bangkok graphics milestone

This PR improves the existing city through material response, facade depth, district-specific modules, atmospheric lighting and bounded animation. It also reduces static attribute storage, caches map cartography and suspends 3D rendering behind the map. PR18's premium interface and the existing gameplay/transport/geography remain in place.

- [Architecture and implementation](architecture.md)
- [Measured performance and map investigation](performance.md)
- [QA, workflow repair and iPhone/Replit instructions](qa.md)
- [Primary references and asset provenance](references.md)

## Matched gameplay survey

**Left: current main at `b83e2f6` (PR18). Right: this PR.** These are actual WebGL gameplay screenshots with the normal chase camera and live HUD, not isolated model renders. The survey positions the vehicle at deterministic road/access-node fixtures; it does not claim to have driven every link between captures. Both runs use 844×390, identical poses, elapsed times and quality modes. World simulation is frozen after one fixture update to keep lighting/camera stable. Dynamic traffic and pedestrian pool differences are not an artistic comparison metric. `medium` is the Detailed UI option; `low` is Fast.

The 90-second views show the intermediate evening stage. Separate Yaowarat views cover sunset, dusk and full night. [Before metadata](before/survey.json) and [after metadata](after/survey.json) include coordinates, heading, camera, time, quality and draw statistics. Screenshot runs overlapped in the shared environment, so their frame/startup timings are **not** used for performance conclusions.

| Area | Main | PR |
| --- | --- | --- |
| Odeon Circle / Chinatown Gate | ![Main: Odeon Circle / Chinatown Gate](before/gate-90-medium.jpg) | ![PR: Odeon Circle / Chinatown Gate](after/gate-90-medium.jpg) |
| Wat Traimit | ![Main: Wat Traimit](before/traimit-90-medium.jpg) | ![PR: Wat Traimit](after/traimit-90-medium.jpg) |
| Wat Pho | ![Main: Wat Pho](before/pho-90-medium.jpg) | ![PR: Wat Pho](after/pho-90-medium.jpg) |
| Wat Arun | ![Main: Wat Arun](before/arun-90-medium.jpg) | ![PR: Wat Arun](after/arun-90-medium.jpg) |
| Grand Palace | ![Main: Grand Palace](before/palace-90-medium.jpg) | ![PR: Grand Palace](after/palace-90-medium.jpg) |
| Wat Paknam | ![Main: Wat Paknam](before/paknam-90-medium.jpg) | ![PR: Wat Paknam](after/paknam-90-medium.jpg) |
| Khao San / Banglamphu | ![Main: Khao San / Banglamphu](before/khaosan-90-medium.jpg) | ![PR: Khao San / Banglamphu](after/khaosan-90-medium.jpg) |
| Talat Noi | ![Main: Talat Noi](before/talatnoi-90-medium.jpg) | ![PR: Talat Noi](after/talatnoi-90-medium.jpg) |
| Siam | ![Main: Siam](before/paragon-90-medium.jpg) | ![PR: Siam](after/paragon-90-medium.jpg) |
| Asok / Terminal 21 | ![Main: Asok / Terminal 21](before/terminal-90-medium.jpg) | ![PR: Asok / Terminal 21](after/terminal-90-medium.jpg) |
| Silom / Sathorn | ![Main: Silom / Sathorn](before/mahanakhon-90-medium.jpg) | ![PR: Silom / Sathorn](after/mahanakhon-90-medium.jpg) |
| Chong Nonsi BTS | ![Main: Chong Nonsi BTS](before/chongnonsi-90-medium.jpg) | ![PR: Chong Nonsi BTS](after/chongnonsi-90-medium.jpg) |
| Saphan Taksin / river approach | ![Main: Saphan Taksin / river approach](before/taksin-90-medium.jpg) | ![PR: Saphan Taksin / river approach](after/taksin-90-medium.jpg) |
| ICONSIAM | ![Main: ICONSIAM](before/icon-90-medium.jpg) | ![PR: ICONSIAM](after/icon-90-medium.jpg) |
| Asiatique | ![Main: Asiatique](before/asiatique-90-medium.jpg) | ![PR: Asiatique](after/asiatique-90-medium.jpg) |
| Yaowarat · sunset | ![Main: Yaowarat · sunset](before/yaowarat-0-medium.jpg) | ![PR: Yaowarat · sunset](after/yaowarat-0-medium.jpg) |
| Yaowarat · dusk | ![Main: Yaowarat · dusk](before/yaowarat-150-medium.jpg) | ![PR: Yaowarat · dusk](after/yaowarat-150-medium.jpg) |
| Yaowarat · night / Detailed | ![Main: Yaowarat · night / Detailed](before/yaowarat-300-medium.jpg) | ![PR: Yaowarat · night / Detailed](after/yaowarat-300-medium.jpg) |
| Yaowarat · night / Fast | ![Main: Yaowarat · night / Fast](before/yaowarat-300-low.jpg) | ![PR: Yaowarat · night / Fast](after/yaowarat-300-low.jpg) |
| Residential street · sunset / Fast | ![Main: Residential street · sunset / Fast](before/residential-0-low.jpg) | ![PR: Residential street · sunset / Fast](after/residential-0-low.jpg) |
| Bridge approach · dusk | ![Main: Bridge approach · dusk](before/bridge-150-medium.jpg) | ![PR: Bridge approach · dusk](after/bridge-150-medium.jpg) |
| Silom · night | ![Main: Silom · night](before/silom-300-medium.jpg) | ![PR: Silom · night](after/silom-300-medium.jpg) |
| Sukhumvit · night | ![Main: Sukhumvit · night](before/sukhumvit-300-medium.jpg) | ![PR: Sukhumvit · night](after/sukhumvit-300-medium.jpg) |

## Critical visual assessment

The largest street-scale improvements are the modeled window/door surrounds, distinct roughness and surface grain, paving and dry asphalt, and the cooler nighttime separation of buildings from the sky. Silom's ribs, residential plaster/trim, Talat Noi's workshop bases and Khao San's guesthouse frontage now use different architectural vocabularies. The survey caught blank side/rear elevations at Terminal 21 and Asiatique; these were refined with glazing, structural bays, entrances and shallow canopies before the final capture. Existing recognizable temples, sculptures, BTS structures and signs were preserved.

The result is still deliberately low-poly. Trees retain faceted silhouettes; some rear walls and upper facades remain simple, and distant riverbank massing is schematic. The very close access-node camera can crop tall landmarks beneath the HUD; LOOK provides the authored overview and detail cameras. Ground projections improve grounding but cannot cast architectural self-shadows. This is a substantive rendering and environment improvement, not a claim that every asset now has final commercial art quality.

The river/bridge views remain comparatively sparse, and full photorealistic reflections, dynamic sun shadows and dense rigged crowds were not added to mask that. No measured physical-device frame-rate claim is made.

## Additional browser evidence

| View | Capture |
| --- | --- |
| Portrait map · 375×812 | [Screenshot](after/map-375x812.jpg) |
| Portrait map · 430×932 | [Screenshot](after/map-430x932.jpg) |
| Night HUD · 844×390 | [Screenshot](after/night-drive-844x390.jpg) |
| Night HUD · 932×430 | [Screenshot](after/night-drive-932x430.jpg) |
| Night HUD · 1280×800 | [Screenshot](after/night-drive-1280x800.jpg) |
| Wat Arun LOOK | [Overview](after/look-arun.jpg) · [alternate viewpoint](after/look-arun-second-view.jpg) |
| Wat Pho LOOK | [Overview](after/look-pho.jpg) · [alternate viewpoint](after/look-pho-second-view.jpg) |
| Wat Paknam LOOK | [Overview](after/look-paknam.jpg) · [alternate viewpoint](after/look-paknam-second-view.jpg) |

The supplemental live screenshots test controls and viewpoint transitions. Their actors and elapsed times are not matched baseline fixtures.
