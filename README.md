# Cadoro configurator project

Start with research/final-report.md. This is a logic-tested prototype, NOT browser-tested or production-ready. All furniture products, rules and prices are demo data.

## Run locally

```bash
cd prototype
npm ci
npm run dev
```

Dependencies are already installed on the project Mac. Test: npm test. Production build: npm run build.

## Vercel

If this whole folder is your repository, set Root Directory to prototype. Framework: Vite. Install: npm ci. Build: npm run build. Output: dist. No environment variables needed. No deployment has been performed.

## Contents

- prototype/: application source, package lock, tests and Vercel configuration.
- assets/: retrieved Cadoro brand assets; obtain approval before public use.
- research/: final report, detailed working papers and correction notes.
- evidence/: actual local test/build, HTTP and dependency audit records; manual browser checklist.

Use Cadoro-delivery.zip instead of older prototype ZIPs. It excludes node_modules and dist. Browser mode remains unavailable, so screenshots and interactive verification are not claimed.
# Cadoro
