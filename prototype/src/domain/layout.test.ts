import { describe, expect, it } from 'vitest';
import { computeLayout, heightOf, planDoorLeaves, placeElements } from './layout';
import type { Design, Fitting } from './types';

function design(partial: Partial<Design>): Design {
  return { wallWidthMm: 2500, wardrobeHeightMm: 2300, carcassFinishCode: 'DEMO-lacquer-white', modules: [], ...partial };
}

describe('geometry placement', () => {
  it('places modules left to right with running x offsets', () => {
    const d = design({
      modules: [
        { id: 'M01', width: 600, doorType: 'none', doorFinishCode: 'DEMO-lacquer-white', fittings: [] },
        { id: 'M02', width: 800, doorType: 'none', doorFinishCode: 'DEMO-lacquer-white', fittings: [] },
      ],
    });
    const layout = computeLayout(d);
    expect(layout.modules[0].x).toBe(0);
    expect(layout.modules[1].x).toBe(600);
    expect(layout.totalModuleWidth).toBe(1400);
  });

  it('creates a filler only for leftover between 1 and 50 mm', () => {
    const mod = (id: string, w: number) => ({ id, width: w, doorType: 'none' as const, doorFinishCode: 'DEMO-lacquer-white', fittings: [] as Fitting[] });
    expect(computeLayout(design({ wallWidthMm: 1050, modules: [mod('M01', 1000)] })).filler).toEqual({ x: 1000, width: 50 });
    expect(computeLayout(design({ wallWidthMm: 1100, modules: [mod('M01', 1000)] })).filler).toBeNull();
    expect(computeLayout(design({ wallWidthMm: 1500, modules: [mod('M01', 1000)] })).filler).toBeNull();
  });

  it('reports overflow when modules exceed the wall', () => {
    const d = design({ wallWidthMm: 1200, modules: [{ id: 'M01', width: 1000, doorType: 'none', doorFinishCode: 'DEMO-lacquer-white', fittings: [] }, { id: 'M02', width: 500, doorType: 'none', doorFinishCode: 'DEMO-lacquer-white', fittings: [] }] });
    const layout = computeLayout(d);
    expect(layout.overflow).toBe(300);
    expect(layout.violations.some((v) => v.code === 'wall-range' || v.level === 'error')).toBe(true);
  });

  it('stacks fittings bottom-up with 100 mm clear gaps', () => {
    const elems = placeElements(
      [
        { id: 'f1', kind: 'shelf', y: 0 },
        { id: 'f2', kind: 'shelf', y: 10 },
      ],
      2200
    );
    expect(elems[0].y).toBe(0);
    expect(elems[1].y).toBeGreaterThanOrEqual(elems[0].y + elems[0].height + 100);
  });

  it('drawer bank height follows the block sizes', () => {
    expect(heightOf({ id: 'a', kind: 'drawers', y: 0, drawersCount: 2 })).toBe(340);
    expect(heightOf({ id: 'b', kind: 'drawers', y: 0, drawersCount: 3 })).toBe(510);
    expect(heightOf({ id: 'c', kind: 'shelf', y: 0 })).toBe(18);
  });

  it('plans hinged leaves so no leaf exceeds 600 mm', () => {
    const leaves = planDoorLeaves({ id: 'M01', width: 1000, doorType: 'hinged', doorFinishCode: 'x', fittings: [] }, 2300);
    expect(leaves.length).toBe(2);
    expect(leaves.every((l) => l.width <= 600)).toBe(true);
  });

  it('sliding doors always produce two leaves', () => {
    const leaves = planDoorLeaves({ id: 'M01', width: 800, doorType: 'sliding', doorFinishCode: 'x', fittings: [] }, 2300);
    expect(leaves.length).toBe(2);
  });
});
