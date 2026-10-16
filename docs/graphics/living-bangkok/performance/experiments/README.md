# Exploratory measurements

These reports are retained for traceability and excluded from the final summary. They are not a controlled comparison of individual shader features.

- `initial-pr.json`: source checkpoint 2f522d5, before the Fast PBR/sky work.
- `reduced-sampling-pr.json`: working-tree probe during the 3be69b6 changes; not a final-source measurement.
- `main-1.json`, `main-2.json`: earlier baseline repetitions, before the final comparison sequence.
- `before-array-pr-1.json`, `before-array-pr-2.json`, `before-array-scenes-pr.json`: final comparison fixtures before the texture-array / aligned-storage / vertex-sky changes (application source f44326a).

Use the top-level `main-*`, `pr-*`, `scenes-*` and `stability-180s` folders for reported results. The final PR runs are hashed in `final-manifest.json`.
