import { describe, expect, it } from 'vitest';
import { validateDesign, validateFittings, suggestFix } from './validation';
import type { Design } from './types';

function design(partial: Partial<Design>): Design {
  return { wallWidthMm: 2500, wardrobeHeightMm: 2300, carcassFinishCode: 'DEMO-lacquer-white', modules: [], ...partial };
}

describe('dimension rules', () => {
  it('rejects heights outside 2000-2400', () => {
    const v = validateDesign(design({ wardrobeHeightMm: 2500 }));
    expect(v.some((x) => x.code === 'height-range')).toBe(true);
  });

  it('rejects non-module widths', () => {
    const v = validateDesign(design({ modules: [{ id: 'M01', width: 650, doorType: 'none', doorFinishCode: 'x', fittings: [] }] }));
    expect(v.some((x) => x.code === 'bad-width')).toBe(true);
  });

  it('rejects wall width outside the supported range', () => {
    const v = validateDesign(design({ wallWidthMm: 10000 }));
    expect(v.some((x) => x.code === 'wall-range')).toBe(true);
  });
});

describe('fitting rules', () => {
  const interior = { w: 564, h: 2264 };

  it('accepts a rail with 1100 mm hanging space below', () => {
    const v = validateFittings([{ id: 'f1', kind: 'rail', y: 1200 }], interior.w, interior.h);
    expect(v).toHaveLength(0);
  });

  it('rejects a rail without hanging space', () => {
    const v = validateFittings([{ id: 'f1', kind: 'rail', y: 100 }], interior.w, interior.h);
    expect(v.some((x) => x.code === 'rail-clearance')).toBe(true);
  });

  it('rejects overlapping elements closer than 100 mm', () => {
    const v = validateFittings(
      [
        { id: 'f1', kind: 'shelf', y: 500 },
        { id: 'f2', kind: 'shelf', y: 560 },
      ],
      interior.w,
      interior.h
    );
    expect(v.some((x) => x.code === 'clearance')).toBe(true);
  });

  it('rejects a drawer block overflowing the interior', () => {
    const v = validateFittings([{ id: 'f1', kind: 'drawers', y: 2200, drawersCount: 3 }], interior.w, interior.h);
    expect(v.some((x) => x.code === 'drawer-overflow')).toBe(true);
  });

  it('suggestFix resolves a rail clearance violation', () => {
    const fixed = suggestFix([{ id: 'f1', kind: 'rail', y: 100 }], interior.h);
    const v = validateFittings(fixed, interior.w, interior.h);
    expect(v).toHaveLength(0);
  });
});

describe('door rules', () => {
  it('rejects sliding doors on modules narrower than 750 mm', () => {
    const v = validateDesign(design({ modules: [{ id: 'M01', width: 600, doorType: 'sliding', doorFinishCode: 'DEMO-lacquer-white', fittings: [] }] }));
    expect(v.some((x) => x.code === 'sliding-narrow')).toBe(true);
  });

  it('accepts a valid mixed configuration without errors', () => {
    const v = validateDesign(design({
      modules: [
        { id: 'M01', width: 600, doorType: 'none', doorFinishCode: 'DEMO-lacquer-white', fittings: [{ id: 'M01-F1', kind: 'rail', y: 1200 }, { id: 'M01-F2', kind: 'shelf', y: 1400 }] },
        { id: 'M02', width: 800, doorType: 'hinged', doorFinishCode: 'DEMO-lacquer-white', fittings: [{ id: 'M02-F1', kind: 'drawers', y: 0, drawersCount: 3 }, { id: 'M02-F2', kind: 'rail', y: 1650 }] },
      ],
    }));
    expect(v.filter((x) => x.level === 'error')).toHaveLength(0);
  });
});
