# Matched actual-WebGL comparisons

19 persisted poses × sunset/night = 38 comparisons, 76 original game screenshots. Before is untouched merged PR34 main `1fb92d7`; after is this branch. Chromium 138 / SwiftShader, 768×432, medium quality, elapsed 40s/720s. Camera/heading/FOV and configuration are recorded in each manifest. No city geometry is hidden; HUD is hidden for art review. These static views are separate from controller-driven journey tests.

Ordinary scenes retain the unchanged normal chase camera at 3.3m. River/elevated views explicitly use the existing QA inspection override. Cropped/weak views remain included; hotel `river-full` comparisons add a higher look target to both refs. See [scorecard](scorecard.md), [references](sources.md), [performance](performance.md), [before manifest](before/capture.json) and [after manifest](after/capture.json).

## terminal-arrival

Ordinary driving-camera pose on the approved destination access

| State | PR34 main | PR35 |
|---|---|---|
| sunset | ![Before terminal-arrival sunset](before/terminal-arrival-sunset.jpg) | ![After terminal-arrival sunset](after/terminal-arrival-sunset.jpg) |
| night | ![Before terminal-arrival night](before/terminal-arrival-night.jpg) | ![After terminal-arrival night](after/terminal-arrival-night.jpg) |

## terminal-street

Ordinary driving-camera pose on the Phloen Chit / Sukhumvit

| State | PR34 main | PR35 |
|---|---|---|
| sunset | ![Before terminal-street sunset](before/terminal-street-sunset.jpg) | ![After terminal-street sunset](after/terminal-street-sunset.jpg) |
| night | ![Before terminal-street night](before/terminal-street-night.jpg) | ![After terminal-street night](after/terminal-street-night.jpg) |

## terminal-asok

Ordinary driving-camera pose on the Asok Montri / Phetchaburi approach

| State | PR34 main | PR35 |
|---|---|---|
| sunset | ![Before terminal-asok sunset](before/terminal-asok-sunset.jpg) | ![After terminal-asok sunset](after/terminal-asok-sunset.jpg) |
| night | ![Before terminal-asok night](before/terminal-asok-night.jpg) | ![After terminal-asok night](after/terminal-asok-night.jpg) |

## terminal-overview

Explicit river/elevated inspection view; not a driving-camera claim.

| State | PR34 main | PR35 |
|---|---|---|
| sunset | ![Before terminal-overview sunset](before/terminal-overview-sunset.jpg) | ![After terminal-overview sunset](after/terminal-overview-sunset.jpg) |
| night | ![Before terminal-overview night](before/terminal-overview-night.jpg) | ![After terminal-overview night](after/terminal-overview-night.jpg) |

## icon-arrival

Ordinary driving-camera pose on the approved destination access

| State | PR34 main | PR35 |
|---|---|---|
| sunset | ![Before icon-arrival sunset](before/icon-arrival-sunset.jpg) | ![After icon-arrival sunset](after/icon-arrival-sunset.jpg) |
| night | ![Before icon-arrival night](before/icon-arrival-night.jpg) | ![After icon-arrival night](after/icon-arrival-night.jpg) |

## icon-street

Ordinary driving-camera pose on the Charoen Nakhon / ICONSIAM access

| State | PR34 main | PR35 |
|---|---|---|
| sunset | ![Before icon-street sunset](before/icon-street-sunset.jpg) | ![After icon-street sunset](after/icon-street-sunset.jpg) |
| night | ![Before icon-street night](before/icon-street-night.jpg) | ![After icon-street night](after/icon-street-night.jpg) |

## icon-goldline

Ordinary driving-camera pose on the Charoen Nakhon / ICONSIAM access

| State | PR34 main | PR35 |
|---|---|---|
| sunset | ![Before icon-goldline sunset](before/icon-goldline-sunset.jpg) | ![After icon-goldline sunset](after/icon-goldline-sunset.jpg) |
| night | ![Before icon-goldline night](before/icon-goldline-night.jpg) | ![After icon-goldline night](after/icon-goldline-night.jpg) |

## icon-river

Explicit river/elevated inspection view; not a driving-camera claim.

| State | PR34 main | PR35 |
|---|---|---|
| sunset | ![Before icon-river sunset](before/icon-river-sunset.jpg) | ![After icon-river sunset](after/icon-river-sunset.jpg) |
| night | ![Before icon-river night](before/icon-river-night.jpg) | ![After icon-river night](after/icon-river-night.jpg) |

## mahanakhon-arrival

Ordinary driving-camera pose on the approved destination access

| State | PR34 main | PR35 |
|---|---|---|
| sunset | ![Before mahanakhon-arrival sunset](before/mahanakhon-arrival-sunset.jpg) | ![After mahanakhon-arrival sunset](after/mahanakhon-arrival-sunset.jpg) |
| night | ![Before mahanakhon-arrival night](before/mahanakhon-arrival-night.jpg) | ![After mahanakhon-arrival night](after/mahanakhon-arrival-night.jpg) |

## mahanakhon-street

Ordinary driving-camera pose on the Silom corridor

| State | PR34 main | PR35 |
|---|---|---|
| sunset | ![Before mahanakhon-street sunset](before/mahanakhon-street-sunset.jpg) | ![After mahanakhon-street sunset](after/mahanakhon-street-sunset.jpg) |
| night | ![Before mahanakhon-street night](before/mahanakhon-street-night.jpg) | ![After mahanakhon-street night](after/mahanakhon-street-night.jpg) |

## mahanakhon-silhouette

Explicit river/elevated inspection view; not a driving-camera claim.

| State | PR34 main | PR35 |
|---|---|---|
| sunset | ![Before mahanakhon-silhouette sunset](before/mahanakhon-silhouette-sunset.jpg) | ![After mahanakhon-silhouette sunset](after/mahanakhon-silhouette-sunset.jpg) |
| night | ![Before mahanakhon-silhouette night](before/mahanakhon-silhouette-night.jpg) | ![After mahanakhon-silhouette night](after/mahanakhon-silhouette-night.jpg) |

## hilton-arrival

Ordinary driving-camera pose on the approved destination access

| State | PR34 main | PR35 |
|---|---|---|
| sunset | ![Before hilton-arrival sunset](before/hilton-arrival-sunset.jpg) | ![After hilton-arrival sunset](after/hilton-arrival-sunset.jpg) |
| night | ![Before hilton-arrival night](before/hilton-arrival-night.jpg) | ![After hilton-arrival night](after/hilton-arrival-night.jpg) |

## hilton-river

Explicit river/elevated inspection view; not a driving-camera claim.

| State | PR34 main | PR35 |
|---|---|---|
| sunset | ![Before hilton-river sunset](before/hilton-river-sunset.jpg) | ![After hilton-river sunset](after/hilton-river-sunset.jpg) |
| night | ![Before hilton-river night](before/hilton-river-night.jpg) | ![After hilton-river night](after/hilton-river-night.jpg) |

## hilton-river-full

Explicit river/elevated inspection view; not a driving-camera claim.

| State | PR34 main | PR35 |
|---|---|---|
| sunset | ![Before hilton-river-full sunset](before/hilton-river-full-sunset.jpg) | ![After hilton-river-full sunset](after/hilton-river-full-sunset.jpg) |
| night | ![Before hilton-river-full night](before/hilton-river-full-night.jpg) | ![After hilton-river-full night](after/hilton-river-full-night.jpg) |

## peninsula-arrival

Ordinary driving-camera pose on the approved destination access

| State | PR34 main | PR35 |
|---|---|---|
| sunset | ![Before peninsula-arrival sunset](before/peninsula-arrival-sunset.jpg) | ![After peninsula-arrival sunset](after/peninsula-arrival-sunset.jpg) |
| night | ![Before peninsula-arrival night](before/peninsula-arrival-night.jpg) | ![After peninsula-arrival night](after/peninsula-arrival-night.jpg) |

## peninsula-river

Explicit river/elevated inspection view; not a driving-camera claim.

| State | PR34 main | PR35 |
|---|---|---|
| sunset | ![Before peninsula-river sunset](before/peninsula-river-sunset.jpg) | ![After peninsula-river sunset](after/peninsula-river-sunset.jpg) |
| night | ![Before peninsula-river night](before/peninsula-river-night.jpg) | ![After peninsula-river night](after/peninsula-river-night.jpg) |

## peninsula-river-full

Explicit river/elevated inspection view; not a driving-camera claim.

| State | PR34 main | PR35 |
|---|---|---|
| sunset | ![Before peninsula-river-full sunset](before/peninsula-river-full-sunset.jpg) | ![After peninsula-river-full sunset](after/peninsula-river-full-sunset.jpg) |
| night | ![Before peninsula-river-full night](before/peninsula-river-full-night.jpg) | ![After peninsula-river-full night](after/peninsula-river-full-night.jpg) |

## oriental-arrival

Ordinary driving-camera pose on the approved destination access

| State | PR34 main | PR35 |
|---|---|---|
| sunset | ![Before oriental-arrival sunset](before/oriental-arrival-sunset.jpg) | ![After oriental-arrival sunset](after/oriental-arrival-sunset.jpg) |
| night | ![Before oriental-arrival night](before/oriental-arrival-night.jpg) | ![After oriental-arrival night](after/oriental-arrival-night.jpg) |

## oriental-river

Explicit river/elevated inspection view; not a driving-camera claim.

| State | PR34 main | PR35 |
|---|---|---|
| sunset | ![Before oriental-river sunset](before/oriental-river-sunset.jpg) | ![After oriental-river sunset](after/oriental-river-sunset.jpg) |
| night | ![Before oriental-river night](before/oriental-river-night.jpg) | ![After oriental-river night](after/oriental-river-night.jpg) |

