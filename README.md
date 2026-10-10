# Cadoro wardrobe configurator

Romanian-language furniture configuration proof of concept built with React, TypeScript, Vite and React Three Fiber. **The application is at the repository root.**

## Deploy to Vercel

Import this GitHub repository into Vercel and click Deploy. Keep Root Directory at its default (the repository root). The included vercel.json declares Vite, npm ci, npm run build and dist, so no prototype subdirectory is needed.

For an existing Vercel project that was previously configured with Root Directory = prototype, reset it to the repository root before redeploying. Fresh imports should use the default root. No environment variables are required for this demonstration.

## Run locally

```bash
npm ci
npm run dev
```

From the project Mac:

```bash
cd ~/Documents/Cadoro
npm run dev
```

## Verify

```bash
npm test
npm run build
```

Node 24.18.0 is used for local verification. Generated files go to dist.

## Demonstration scope

Parametric single-wall wardrobes, editable interiors and finishes, demo price breakdowns, JSON import/export, undo/redo and browser-local saving. **All furniture products, dimensions, prices and compatibility rules are demonstrative, not approved Cadoro inventory or real offers.**

There is no backend, customer-submission service, cloud saving or manufacturing integration. Interactive desktop/mobile browser QA has not been completed. Unit tests and a production build are not proof of visual correctness. The build has a large 3D chunk warning.

## Branding

The wordmark was retrieved from https://www.cadoro.ro/ for the requested proof of concept. Trademark ownership remains with Cadoro; obtain approval before commercial use. No IKEA code, imagery or models are included.

Research working papers, local evidence, dependencies, backups and archives are kept out of this public repository.
