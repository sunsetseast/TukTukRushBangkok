# Actual-renderer comparison gallery

All gameplay images below are unretouched Chromium 138 / SwiftShader WebGL captures at 768 × 432, medium quality. Baseline is main `c5f2e210` (PR33); after is this branch. Identical player poses, cameras, sunset/night times, quality, mission target and traffic-disabled state are recorded in [before capture metadata](before-matched/capture.json) and [after capture metadata](after/capture.json). UI is hidden for comparison; **no city objects are hidden**. Elevated and river inspection cameras are explicitly distinguished from ordinary chase-camera views. These static camera setups are not journey tests.

Licensed references are separate photographs with different dates and viewpoints; they are not a pixel-registration target. No Google imagery or AI-generated evidence is used.

| Real reference | Attribution / use |
|---|---|
| ![Yaowarat reference](../landmark-accuracy/references/yaowarat.jpg) | Ninara, CC BY 2.0; [full attribution](../landmark-accuracy/references/ATTRIBUTION.md). Dense mixed-height rows, projecting signs and selective shop illumination guide the benchmark. |
| ![Chinatown Gate reference](../landmark-accuracy/references/gate.jpg) | Marcin Konsek, CC BY-SA 4.0; same attribution library. Existing gate model retained; surrounding ordinary commerce is upgraded. |
| ![Tha Tien reference](../historic-visual-fidelity/references/tha-tien.jpg) | Weerayas, CC BY-SA 3.0; [source record](../historic-visual-fidelity/sources.md). Low-rise pitched-roof historic commerce guides the contrasting facade treatment. |

## Chinatown Gate approach

| PR33 before | PR34 after |
|---|---|
| ![Chinatown Gate approach before sunset](before-matched/gate-drive-sunset.jpg) | ![Chinatown Gate approach after sunset](after/gate-drive-sunset.jpg) |
| ![Chinatown Gate approach before night](before-matched/gate-drive-night.jpg) | ![Chinatown Gate approach after night](after/gate-drive-night.jpg) |

## Yaowarat entrance

| PR33 before | PR34 after |
|---|---|
| ![Yaowarat entrance before sunset](before-matched/yaowarat-entry-sunset.jpg) | ![Yaowarat entrance after sunset](after/yaowarat-entry-sunset.jpg) |
| ![Yaowarat entrance before night](before-matched/yaowarat-entry-night.jpg) | ![Yaowarat entrance after night](after/yaowarat-entry-night.jpg) |

## Commercial row

| PR33 before | PR34 after |
|---|---|
| ![Commercial row before sunset](before-matched/yaowarat-gold-row-sunset.jpg) | ![Commercial row after sunset](after/yaowarat-gold-row-sunset.jpg) |
| ![Commercial row before night](before-matched/yaowarat-gold-row-night.jpg) | ![Commercial row after night](after/yaowarat-gold-row-night.jpg) |

## Curved road section

| PR33 before | PR34 after |
|---|---|
| ![Curved road section before sunset](before-matched/yaowarat-curve-sunset.jpg) | ![Curved road section after sunset](after/yaowarat-curve-sunset.jpg) |
| ![Curved road section before night](before-matched/yaowarat-curve-night.jpg) | ![Curved road section after night](after/yaowarat-curve-night.jpg) |

## Chinatown elevated inspection

| PR33 before | PR34 after |
|---|---|
| ![Chinatown elevated inspection before sunset](before-matched/yaowarat-elevated-sunset.jpg) | ![Chinatown elevated inspection after sunset](after/yaowarat-elevated-sunset.jpg) |
| ![Chinatown elevated inspection before night](before-matched/yaowarat-elevated-night.jpg) | ![Chinatown elevated inspection after night](after/yaowarat-elevated-night.jpg) |

## Tha Tien street approach

| PR33 before | PR34 after |
|---|---|
| ![Tha Tien street approach before sunset](before-matched/tha-tien-drive-sunset.jpg) | ![Tha Tien street approach after sunset](after/tha-tien-drive-sunset.jpg) |
| ![Tha Tien street approach before night](before-matched/tha-tien-drive-night.jpg) | ![Tha Tien street approach after night](after/tha-tien-drive-night.jpg) |

## Tha Tien river approach

| PR33 before | PR34 after |
|---|---|
| ![Tha Tien river approach before sunset](before-matched/tha-tien-river-sunset.jpg) | ![Tha Tien river approach after sunset](after/tha-tien-river-sunset.jpg) |
| ![Tha Tien river approach before night](before-matched/tha-tien-river-night.jpg) | ![Tha Tien river approach after night](after/tha-tien-river-night.jpg) |

## Tha Tien elevated inspection

| PR33 before | PR34 after |
|---|---|
| ![Tha Tien elevated inspection before sunset](before-matched/tha-tien-elevated-sunset.jpg) | ![Tha Tien elevated inspection after sunset](after/tha-tien-elevated-sunset.jpg) |
| ![Tha Tien elevated inspection before night](before-matched/tha-tien-elevated-night.jpg) | ![Tha Tien elevated inspection after night](after/tha-tien-elevated-night.jpg) |

## Review findings

Yaowarat now maintains deeper, coordinated facades through the curved segment rather than switching back to shallow generic boxes. Projecting cabinets have supports, floor heights remain inside collision massing, and generic trade labels replace arbitrary real-brand assignments. This is a substantial corridor-wide improvement, although repeated balcony/window modules remain visible. It is a compressed district grammar, not a reconstruction of every real shop.

Tha Tien gains restrained cream-and-green elevations, deep storefronts, arched upper-window details and continuous pitched-roof language. The ordinary driving view benefits more than the elevated view. Wide service spaces and repeated detached massing remain apparent from above; the real market's complete block plan and public passages are not reproduced. Do not interpret detailed facades as geographic certification of those blocks.

Night signs remain readable and selectively emissive, but ambient storefront illumination is too even for a finished premium night scene. Geometry/readability are ahead of lighting nuance. The [scorecard](scorecard.md) records these limits.

The [citywide survey](citywide/capture.json) uses actual destination arrival nodes, with additional elevated views. These are uncurated inspection views, including obstructions and weak composition; they do not certify all hotels or districts.

Capture validation also checks the actual rendered camera position against the requested pose. Slow software rendering initially expired the QA camera lease; those elevated/river frames were recaptured with per-read lease renewal and replaced. Normal driving camera behavior is unchanged.
