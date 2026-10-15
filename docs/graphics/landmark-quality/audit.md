# Current-main audit: PR #17

Base: merged PR #16 (`1d85bee`).

Confirmed issues:
- Wat Pho and Palace inspection camera positions are overwritten every render frame. There is no gesture state or reusable subject/viewpoint definition.
- Buddha torsos, faces and limbs are intersecting scaled spheres; robe marks are disconnected bars. Feet lack a coherent sole/inlay surface. Close inspection reveals the seams and inflated anatomy.
- Arrival sign planes sit at Y=7.45 inside a gateway crossbeam centered at Y=7.6 with 1.1m thickness. They have no offset toward the approach. DoubleSide materials show mirrored back-face text.
- Main fonts are correctly awaited before scene/atlas construction. Existing glyph subsets need verification for every new street or shop string; successful loading alone is insufficient.
- BTS routes, 24 station structures and six trains are already integrated with simulation time. They do not belong in historic Old Town. Road-level views directly under wide concourses obscure the train decks, and the map offers no nearby-station shortcut. Improve sightlines and discoverability rather than inventing rail routes.
- `sculptedLandmarks` has unreachable old Pho/Mahanakhon branches after its special-model dispatch. Several other named sites still enter generic market/retail fallback branches.

Preserve: baked road polygons and offline authoring split from PR #16; public/access road graph, collision footprints, left-hand traffic, fares and saved discovery IDs; boost timing; four-minute night transition; existing train route/service clock; locally licensed fonts and batched geometry ownership.

Art direction: purpose-built lofted sculpture surfaces and facial relief; restrained gilded materials; ceramic-relief prangs and royal chedis; distinct hall/gable/window rhythms; varied civic and commercial compositions. Hero detail uses local LOD; no photographed textures or purchased assets.
