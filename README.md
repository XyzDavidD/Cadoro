# Cadoro wardrobe configurator

Original Romanian-language furniture-configuration proof of concept using React, TypeScript, Vite and React Three Fiber. The application lives in **prototype/**.

## Run locally

```bash
cd prototype
npm ci
npm run dev
```

Open the local address printed by Vite. Run npm commands inside prototype, not the repository root. Node 24.18.0 was used for the local verification.

## Checks

```bash
cd prototype
npm test
npm run build
```

The local verification passed 33 unit tests and a TypeScript/Vite production build. Interactive browser and mobile QA remain unverified.

## Vercel

Import this repository and use:

| Setting | Value |
| --- | --- |
| Root Directory | prototype |
| Framework Preset | Vite |
| Install Command | npm ci |
| Build Command | npm run build |
| Output Directory | dist |
| Environment variables | None required for this demo |

The application includes prototype/vercel.json. No deployment has been verified. If Vercel was already imported with the repository root, change Root Directory to prototype and redeploy.

## Scope and limitations

A parametric single-wall wardrobe prototype with demonstration interiors, finishes, prices, JSON import/export and browser-local saving. **All furniture products, dimensions, prices and compatibility rules are demo data, not verified Cadoro inventory or real offers.**

This is not a production-ready quoting or manufacturing tool. It has no backend, account system or customer-inquiry submission. Visual/browser testing remains pending. The 3D bundle triggers a size warning and has not been benchmarked on mobile.

See prototype/README.md for implementation details. Research working papers, local evidence, generated build files, dependencies and archives are intentionally not published in this repository.

## Branding

The Cadoro wordmark was retrieved from https://www.cadoro.ro/ for this requested proof of concept. Trademark ownership remains with Cadoro; obtain approval before commercial use. No IKEA code, imagery or models are included.
