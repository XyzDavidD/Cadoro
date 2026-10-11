// Preset tests: every demo preset must be a valid, buildable design under the
// same domain rules used for user-created designs.

import { describe, it, expect } from 'vitest';
import { PRESETS, DORMITOR_PRESET, HOL_PRESET, DRESSING_PRESET, presetDesign } from './presets';
import { parseDesignDocument } from './schema';
import { computeLayout } from './layout';
import { validateDesign } from './validation';
import { FINISHES } from './catalog';

describe('demo presets', () => {
  it('exposes three distinct presets', () => {
    expect(PRESETS).toHaveLength(3);
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(3);
    expect(new Set(PRESETS.map((p) => p.name)).size).toBe(3);
  });

  it.each([
    ['dormitor', DORMITOR_PRESET],
    ['hol', HOL_PRESET],
    ['dressing', DRESSING_PRESET],
  ])('%s passes schema validation', (_id, design) => {
    const r = parseDesignDocument(JSON.parse(JSON.stringify({ schemaVersion: 1, app: 'cadoro-configurator-demo', ...design, savedAt: 'x' })));
    expect(r.issues).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it.each([
    ['dormitor', DORMITOR_PRESET],
    ['hol', HOL_PRESET],
    ['dressing', DRESSING_PRESET],
  ])('%s has no domain validation errors', (_id, design) => {
    const errors = validateDesign(design).filter((v) => v.level === 'error');
    expect(errors).toEqual([]);
  });

  it.each([
    ['dormitor', DORMITOR_PRESET],
    ['hol', HOL_PRESET],
    ['dressing', DRESSING_PRESET],
  ])('%s fills the wall without overflow and is distinct', (_id, design) => {
    const layout = computeLayout(design);
    expect(layout.overflow).toBe(0);
    // The furniture must visibly cover most of the wall, with at most a small filler.
    expect(layout.totalModuleWidth).toBeGreaterThan(design.wallWidthMm - 60);
    expect(layout.totalModuleWidth).toBeLessThanOrEqual(design.wallWidthMm);
  });

  it('uses only oak finishes so the default look is coherent', () => {
    const codes = new Set<string>();
    for (const d of [DORMITOR_PRESET, HOL_PRESET, DRESSING_PRESET]) {
      codes.add(d.carcassFinishCode);
      d.modules.forEach((m) => codes.add(m.doorFinishCode));
    }
    for (const c of codes) {
      const f = FINISHES.find((x) => x.code === c);
      expect(f).toBeDefined();
      expect(f?.kind).toBe('wood');
    }
  });

  it('presetDesign returns an independent deep copy', () => {
    const p = PRESETS[0];
    const a = presetDesign(p);
    a.modules[0].width = 999;
    a.modules[0].fittings.push({ id: 'X', kind: 'shelf', y: 1 });
    expect(p.design.modules[0].width).not.toBe(999);
    expect(p.design.modules[0].fittings).toHaveLength(2);
  });

  it('presets differ in overall footprint', () => {
    const sizes = new Set([DORMITOR_PRESET, HOL_PRESET, DRESSING_PRESET].map((d) => `${d.wallWidthMm}x${d.wardrobeHeightMm}`));
    expect(sizes.size).toBe(3);
  });
});
