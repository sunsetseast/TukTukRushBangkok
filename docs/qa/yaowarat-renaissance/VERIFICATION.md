# PR62 verification

Runtime under test: `a52700300da6cd44bcc2ae00657dff1be6090bdf`. Pinned PR61 reference: `b1ebccdf536a6b72a0cf8afb45bcdcd409a6d735`.

- TypeScript and the Vite production build pass. Vite reports the existing bundle-size advisory.
- The finish checks cover deterministic layers, material separation, world-space shop sampling and scene texture ownership. Opening checks compare source bytes and collision edges before and after masking and verify that new index buffers transfer from the workers.
- Geographic checks cover the full 357-edge inventory, source projection and road rules, left-hand traffic, contact, streaming and cancellation, landmark caching, Thai and Chinese glyphs, and the worker-to-renderer handoff.
- A full navigation run drives a real pickup and delivery across the packed geography. Career, UI navigation, driven mission and graphics foundation checks pass.
- The pinned map data, navigation packs, original models, fonts and condensed game source have an empty Git diff against the PR61 reference. The change to source wall presentation is confined to runtime draw indices.
- The final render job passed and captured 25 geographic views with zero reported WebGL errors. Two additional captures use controlled daylight on the condensed scene. [GitHub Actions run](https://github.com/sunsetseast/TukTukRushBangkok/actions/runs/42544455241)
- Browser gameplay passes touch steering, throttle, brake, boost, map and pause, a saved fare, context loss recovery and original condensed Free Roam. WebKit decodes the packed map, navigation, road rules and compiled chunk. Browser transport fallback and explicit network retry pass.
- Three leave-and-return cycles verify exact disposal of every retired geometry and instance stream. Both matched profiling passes finish with zero WebGL errors. [Performance and resource results](PERFORMANCE.md)
