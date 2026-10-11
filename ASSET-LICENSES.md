# Cadoro Redesign - Asset Licenses

All third-party assets in `public/assets/` are **CC0 1.0 (public domain)**, downloaded from Poly Haven on the date of packaging. CC0 permits any use, including commercial, with no attribution required. Attribution below is recorded for provenance and good practice, not as a legal requirement.

| Asset | Provider / ID | Author | License | Source URL | Role | Local path |
|---|---|---|---|---|---|---|
| Oak Veneer 01 | Poly Haven `oak_veneer_01` | Jenelle van Heerden | CC0 1.0 | https://polyhaven.com/a/oak_veneer_01 | Primary oak veneer (carcass, doors) | `public/assets/materials/oak/` |
| Walnut Veneer 02 | Poly Haven `walnut_veneer_02` | Jenelle van Heerden | CC0 1.0 | https://polyhaven.com/a/walnut_veneer_02 | Accent walnut veneer | `public/assets/materials/walnut/` |
| Smoked Oak (derived) | derived from Poly Haven `oak_veneer_01` | Jenelle van Heerden (source) | CC0 1.0 | https://polyhaven.com/a/oak_veneer_01 | Dark accent veneer | `public/assets/materials/smoked-oak/` |
| Herringbone Parquet | Poly Haven `herringbone_parquet` | Jenelle van Heerden, Sergej Majboroda | CC0 1.0 | https://polyhaven.com/a/herringbone_parquet | Room floor | `public/assets/materials/floor/` |
| White Plaster 02 | Poly Haven `white_plaster_02` | Rob Tuytel | CC0 1.0 | https://polyhaven.com/a/white_plaster_02 | Room wall surface | `public/assets/materials/plaster/` |
| Lythwood Room HDRI | Poly Haven `lythwood_room` | Greg Zaal | CC0 1.0 | https://polyhaven.com/a/lythwood_room | Interior environment lighting | `public/assets/room/lythwood-room_1k.hdr` |

## Notes

- **License reference:** https://polyhaven.com/license and Creative Commons CC0 1.0: https://creativecommons.org/publicdomain/zero/1.0/
- **Conversion:** Original Poly Haven JPG downloads were downscaled and re-encoded locally to WebP (see `public/assets/materials/manifest.json` for exact parameters and color-space intent). No source material was altered beyond resize/re-encode, except the smoked-oak tint derived from the oak veneer as described in the manifest.
- **Smoked oak** is a controlled dark tint of the oak veneer grain, not a separate species. The source oak grain is preserved; the tint is applied locally via PIL per the derivation note in the manifest.
- **No IKEA assets or Cadoro furniture models/product imagery** were copied, re-hosted, or derived. The pre-existing Cadoro wordmark and favicon remain in the app for the requested branded demonstration; those are not CC0 assets and remain Cadoro trademarks. The IKEA PAX planner (https://www.ikea.com/addon-app/storageone/pax/web/latest/ro/ro/#/planner) and cadoro.ro were used only as visual/UX reference. No reusable Cadoro furniture model was found in the pages reviewed; this does not establish that the company has none internally.
- **No runtime hotlinks.** All assets are committed locally under `public/assets/`.
- Total asset package size: ~11 MB (uncompressed, all WebP + 1 HDRI file).
