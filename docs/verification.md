# Verified scope and limits

## Executed checks

- PASS: desktop startup and all six categories
- PASS: dimension labels rendered natively in canvas
- PASS: walnut updates carcass and door data and render
- PASS: smoked oak then white door-only finish
- PASS: undo and redo restore finish data
- PASS: door, dimension and front/perspective transitions stable
- PASS: room and floor controls reachable and persistent
- PASS: centimetre input converts to millimetres
- PASS: PNG download is real and nonempty
- PASS: JSON export
- PASS: legacy JSON import and duplicate rejection
- PASS: print summary visible and PDF produced
- PASS: reload preserves current design
- PASS: mobile viewport and editing drawer usable
- PASS: no browser runtime or failed asset errors

93/93 unit tests passed; production build passed. Browser page/console errors: 0. Failed asset requests: 0.

PNG was downloaded and inspected as a nonblank rendered image. JSON download, valid legacy import and duplicate rejection were exercised. Print media produced a readable summary PDF; this is browser printing, not a server PDF service. Mobile drawer, category selection and summary entry were exercised at 390x844.

## Limits

This is a bounded regression suite, not exhaustive validation. Rendering used software acceleration, so there are no hardware FPS or load-time guarantees. Safari, Firefox, real touch hardware, real Cadoro manufacturing constraints, checkout and tenant isolation were not verified. Sliding-door transforms have unit coverage; the browser transition case used the default hinged-door design. Price values remain demo.

The measurement-label check asserts native canvas rendering; label visibility was additionally inspected in screenshots. Browser persistence is localStorage, not cloud saving. The final GitHub/Vercel deployment requires separate confirmation.
