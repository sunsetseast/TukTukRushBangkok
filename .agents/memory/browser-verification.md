---
name: WebGL browser verification
description: Distinguishing a capture-browser GPU limitation from a broken game or physical-iPhone performance
---
The built-in screenshot browser may lack WebGL 2 even when the game renders successfully in a WebGL-enabled Chromium browser.

**Why:** The capture browser showed the game's unsupported-WebGL screen while separate real WebGL scene captures completed without JavaScript, asset or GL errors.

**How to apply:** Check browser WebGL capability before treating a blank/unsupported preview as an application or server regression. Verify 3D work in an enabled browser and report that environment explicitly. Software-renderer frame times never establish physical-iPhone FPS, Safari compatibility or thermal behavior.
