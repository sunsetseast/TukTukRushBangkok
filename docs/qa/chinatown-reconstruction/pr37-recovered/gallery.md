# Matched actual WebGL gallery

PR36/main at `d3823427bced0b04729beafe87a68ab444f98329` versus PR37 runtime at `61ce535afa6784721fd4e2b4ef17fb496ba41d40`. These are actual application frames, captured with Chromium/SwiftShader at 768×432, medium quality, elapsed 40 s (sunset) or 720 s (night). Traffic is disabled on both sides. No city objects are hidden, and no extended fog or clip override is active. Three scene families use the normal follow camera; the other explicitly recorded cameras inspect local approaches. The elevated shoreline view is 145 world units high. These are browser frames, not photographs or physical-iPhone results.

The [manifest](gallery-manifest.json) records matching camera/FOV/lighting and SHA-256 image hashes. The approved PR36 [geographic comparisons](../chao-phraya/README.md) remain authoritative; this PR does not redraw the river.

| Scene / lighting | Before | After |
|---|---|---|
| icon-river / sunset | ![Before](before/icon-river-sunset.jpg) | ![After](after/icon-river-sunset.jpg) |
| icon-river / night | ![Before](before/icon-river-night.jpg) | ![After](after/icon-river-night.jpg) |
| icon-street / sunset | ![Before](before/icon-street-sunset.jpg) | ![After](after/icon-street-sunset.jpg) |
| taksin-driving / sunset | ![Before](before/taksin-driving-sunset.jpg) | ![After](after/taksin-driving-sunset.jpg) |
| taksin-driving / night | ![Before](before/taksin-driving-night.jpg) | ![After](after/taksin-driving-night.jpg) |
| oriental-river / sunset | ![Before](before/oriental-river-sunset.jpg) | ![After](after/oriental-river-sunset.jpg) |
| collision-building / sunset | ![Before](before/collision-building-sunset.jpg) | ![After](after/collision-building-sunset.jpg) |
| collision-tree / sunset | ![Before](before/collision-tree-sunset.jpg) | ![After](after/collision-tree-sunset.jpg) |
| oriental-approach / sunset | ![Before](before/oriental-approach-sunset.jpg) | ![After](after/oriental-approach-sunset.jpg) |
| river-city-street / sunset | ![Before](before/river-city-street-sunset.jpg) | ![After](after/river-city-street-sunset.jpg) |
| asiatique-entry / sunset | ![Before](before/asiatique-entry-sunset.jpg) | ![After](after/asiatique-entry-sunset.jpg) |
| asiatique-entry / night | ![Before](before/asiatique-entry-night.jpg) | ![After](after/asiatique-entry-night.jpg) |
| asiatique-loop / sunset | ![Before](before/asiatique-loop-sunset.jpg) | ![After](after/asiatique-loop-sunset.jpg) |
| shoreline-local / sunset | ![Before](before/shoreline-local-sunset.jpg) | ![After](after/shoreline-local-sunset.jpg) |
| river-city-gameplay / sunset | ![Before](before/river-city-gameplay-sunset.jpg) | ![After](after/river-city-gameplay-sunset.jpg) |
| chinatown-waterfront-gameplay / sunset | ![Before](before/chinatown-waterfront-gameplay-sunset.jpg) | ![After](after/chinatown-waterfront-gameplay-sunset.jpg) |
| chinatown-waterfront-gameplay / night | ![Before](before/chinatown-waterfront-gameplay-night.jpg) | ![After](after/chinatown-waterfront-gameplay-night.jpg) |
| asiatique-gameplay / sunset | ![Before](before/asiatique-gameplay-sunset.jpg) | ![After](after/asiatique-gameplay-sunset.jpg) |

The collision kiosk retains a compact street building and the vegetation correction allows the existing tropical tree planner to produce a taller tree. The ICONSIAM Gold Line still overlaps parts of the fixed street-view composition, as on main; this is not hidden for the comparison. Ordinary follow-camera views retain production fog, drawing distance and sunset/night lighting.
