# Visual and interaction redesign

- Replaced the dark two-sidebar interface with a guided light layout, presets and clearer centimetre controls.
- Added licensed local wood/floor/plaster textures and an interior lighting environment.
- Applied selected material maps to body/front components, improved panel edges, hardware and interior presentation.
- Preserved drawer containment and whole-wardrobe camera fitting.
- Fixed module/fitting identifier reuse, native input undo handling and finish/history operations.
- Added room/floor controls, front view, dimensions, styling/lighting controls and exports.
- Removed DOM-portal dimension overlays after a browser lifecycle error; labels now render in the scene and are captured in PNG.
- Enabled on-demand rendering with explicit animated-door invalidation, corrected rail/hanger centering and hinge positions.
- Reserved mobile toolbar space, kept the configuration drawer open while choosing steps and added an explicit close action.
- Forced a current-scene render before PNG capture rather than reading an old preserved frame.

Known scope limitations and executed checks are documented in README.md and docs/verification.md.
