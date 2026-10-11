# PR #6 — Yaowarat Street Density

**Draft work / do not merge before iPhone verification.**

This pass responds to review of the actual PR #5 Linux WebGL chase cameras:
large clean asphalt, long undecorated side walls, sparse signs and sidewalks.

### Implemented

- Extra wall-mounted and double-sided 3D **Chinese category signs** on
  fictional businesses within approximately 125 in-game meters of the
  verified-business corridor. No extra unverified brand/logo names are used.
- Twenty reusable Chinese-character sign atlas designs for gold, food,
  pharmacy, hotel and old commercial shops; no Chinese/Thai gibberish.
- Two blades per chosen building, with varied heights, ornate metal
  supports, individual crowns, inset borders, plus one small fascia. All
  sign supports are mounted to buildings **above 5m** and have no road bases.
- Signature real businesses keep their separate Thai-sign treatment.
- Extra window-shopping/approach pedestrians using EXISTING instanced
  meshes and vehicle-avoidance behavior, and bounded new cart/lantern
  clusters on valid sidewalks only.
- Sixteen moving traffic vehicles (including at least five motorcycles)
  across Yaowarat / Charoen Krung; no added new traffic mechanics.
- Preserved the existing roads, mission graph, collision recovery,
  left-side traffic, and original art direction.

### Authenticity

The design references genuine Yaowarat sign typologies, but fictional
business names and extra sign locations **are original arcade adaptations**.
This is not a survey-accurate rebuild; do not label a shop exact without
dated branch-matched storefront photos. Do not bundle external photographs
or copy proprietary logo images into the game.

Useful research photos: https://bangkoktype.com/category/yaowarat/
and published tourist street imagery from the Tourism Authority of
Thailand. The 152–154 Thong Bai location must not be confused with
the game's 444–444/1 shop.

### Verification and remaining limitations

Run `pnpm --filter @workspace/tuk-tuk-rush run test:sign-layers`
and all existing game, signature, street-life, roadside and asset checks.
The GitHub visual workflow produces screenshots from TWO actual chase
directions, static shop inspections and iPhone-shaped 844×390 landscape.
Review those images before further claims of improvement.

Linux SwiftShader render times are **not physical iPhone FPS**.
Extra sign faces and shopfront geometry must be verified for crowding,
occlusion, readability and mobile performance in iPhone Safari.

**Unsolved art goals:** precise building elevations and correct
shop-by-shop sign mounting at Yaowarat, rich photographic-quality
texture variation, and convincing dense road traffic throughout.
