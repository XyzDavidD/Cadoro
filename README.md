# Cadoro wardrobe configurator

Original Romanian-language furniture configurator with a light interface, local wood textures, room presets and guided editing. The application is at the repository root for a default Vercel import.

## Run

Use Node 24 (or a supported Node >=22 release).

```bash
npm ci
npm run dev
npm test
npm run build
```

## Vercel

Import this GitHub repository and leave Root Directory at the repository root. vercel.json declares Vite, npm ci, npm run build and dist. No environment variables or backend service are required. Existing projects with an old prototype Root Directory override must clear that override.

## Features

- Cadoro wordmark, responsive light UI, six guided categories and valid starting presets.
- User-facing centimetres with integer millimetres internally; carcass and overall plinth-inclusive height are distinguished.
- Real locally served oak/walnut wood-grain maps, derived smoked oak, lacquer and demo glass finishes; apply to body, doors or both.
- Softly lit room, floor/wall presets, hardware, contained drawers and optional hanger/lighting details.
- Orbit/front view, auto-fit, measurement labels, eased hinged/sliding door transforms.
- History, browser-local saving, legacy JSON import/export, PNG capture and printable demonstration summary.

## Verification

93 unit tests and a TypeScript/Vite production build passed in the final cloud run. A bounded 15-case browser suite passed at desktop (1440x900) and mobile (390x844) viewport sizes with no recorded page/console errors or failed asset requests. Screenshots were inspected separately. Browser tests used Chromium with SwiftShader software rendering; they do not establish real-device GPU performance or cross-browser compatibility. See docs/verification.md.

## Important limitations

All furniture dimensions, rules and prices remain demonstrative, not verified Cadoro inventory or real offers. Materials are visual examples, not calibrated Cadoro finish samples. No cloud accounts, online design links, customer submission, authoritative server quotation, manufacturing/CAD export or multi-tenant SaaS is implemented. Mobile viewport testing is not physical-device certification. The large Three.js chunk warning remains. Development/test dependency advisories require separate maintenance; there is no claim of a complete security audit.

## Assets

See ASSET-LICENSES.md and public/assets/materials/manifest.json for CC0 texture sources and derivations. Cadoro branding remains Cadoro's property and is not covered by the material assets' CC0 license. No IKEA code, artwork or proprietary models are included.
