// Pure geometry/projection tests for the drawer fix. No three.js, no browser:
// BoxSpec coordinates are checked directly in millimeters.
import { describe, expect, it } from 'vitest';
import { CARCASS_DEPTH_MM, INTERIOR_DEPTH_MM, PANEL_MM } from '../domain/catalog';
import { computeLayout } from '../domain/layout';
import type { Design, ModuleSpec } from '../domain/types';
import { fittingGeometry, type BoxSpec } from './geometry';

function moduleSpec(over: Partial<ModuleSpec> = {}): ModuleSpec {
  return {
    id: 'm1',
    width: 600,
    doorType: 'hinged',
    doorFinishCode: 'DEMO-lacquer-white',
    fittings: [],
    ...over,
  };
}

function design(mods: ModuleSpec[], heightMm = 2200): Design {
  return {
    wallWidthMm: mods.reduce((s, m) => s + m.width, 0),
    wardrobeHeightMm: heightMm,
    carcassFinishCode: 'DEMO-wood-oak',
    modules: mods,
  };
}

/** Axis-aligned extent [min, max] of a BoxSpec in local mm. */
function extent(b: BoxSpec, axis: 0 | 1 | 2): [number, number] {
  const c = b.pos[axis] * 1000;
  const s = b.size[axis] * 1000;
  return [c - s / 2, c + s / 2];
}

function drawerBank(boxes: BoxSpec[], iw: number): BoxSpec[] {
  // Drawer boxes live strictly between the carcass side panels.
  return boxes.filter((b) => extent(b, 0)[0] > PANEL_MM && extent(b, 0)[1] < PANEL_MM + iw);
}

describe('drawer geometry', () => {
  const CASES: Array<{ width: number; n: 2 | 3 }> = [
    { width: 500, n: 2 },
    { width: 500, n: 3 },
    { width: 600, n: 2 },
    { width: 600, n: 3 },
    { width: 800, n: 2 },
    { width: 800, n: 3 },
    { width: 1000, n: 2 },
    { width: 1000, n: 3 },
  ];

  for (const { width, n } of CASES) {
    it(`keeps a ${n}-drawer bank inside the interior for a ${width}mm module`, () => {
      const spec = moduleSpec({ width, fittings: [{ id: 'd1', kind: 'drawers', y: 0, drawersCount: n }] });
      const mod = computeLayout(design([spec])).modules[0];
      const iw = mod.interiorWidth;
      const boxes = drawerBank(fittingGeometry(mod, design([spec])), iw);
      expect(boxes.length).toBeGreaterThanOrEqual(n * 4); // front + bottom + 2 sides (+ back) per drawer

      for (const b of boxes) {
        const [x0, x1] = extent(b, 0);
        const [z0, z1] = extent(b, 2);
        // X: strictly inside the carcass cavity (side panels occupy 0..18 and w-18..w).
        expect(x0).toBeGreaterThanOrEqual(PANEL_MM);
        expect(x1).toBeLessThanOrEqual(width - PANEL_MM);
        // Z: never through the closed-door plane at the carcass front edge.
        expect(z0).toBeGreaterThanOrEqual(0);
        expect(z1).toBeLessThanOrEqual(CARCASS_DEPTH_MM);
        // Y: on/above the interior floor, below the interior ceiling.
        const [y0, y1] = extent(b, 1);
        expect(y0).toBeGreaterThanOrEqual(PANEL_MM - 1e-6);
        expect(y1).toBeLessThanOrEqual(mod.interiorHeight + PANEL_MM + 1e-6);
      }

      // The bank must stay within the planned vertical extent.
      const bank = mod.elements.find((e) => e.kind === 'drawers')!;
      const tops = boxes.map((b) => extent(b, 1)[1]);
      expect(Math.max(...tops)).toBeLessThanOrEqual(PANEL_MM + bank.y + bank.height + 1e-6);
    });
  }

  it('never protrudes through the closed door plane (regression for the 790mm protrusion)', () => {
    // Original bug: fronts at z >= 490 with 300mm depth reached z = 790 on a
    // 580mm carcass, i.e. 210mm through the door plane.
    for (const width of [500, 600, 800, 1000]) {
      for (const n of [2, 3] as const) {
        const spec = moduleSpec({ width, fittings: [{ id: 'd1', kind: 'drawers', y: 0, drawersCount: n }] });
        const mod = computeLayout(design([spec])).modules[0];
        const boxes = drawerBank(fittingGeometry(mod, design([spec])), mod.interiorWidth);
        const maxZ = Math.max(...boxes.map((b) => extent(b, 2)[1]));
        expect(maxZ).toBeLessThanOrEqual(CARCASS_DEPTH_MM);
        // The old geometry would fail this hard: 790 > 580 by a wide margin.
        expect(maxZ).toBeLessThan(CARCASS_DEPTH_MM + 1);
      }
    }
  });

  it('keeps every drawer box within the usable interior depth, not just the carcass front edge', () => {
    const spec = moduleSpec({ width: 600, fittings: [{ id: 'd1', kind: 'drawers', y: 0, drawersCount: 2 }] });
    const mod = computeLayout(design([spec])).modules[0];
    const boxes = drawerBank(fittingGeometry(mod, design([spec])), mod.interiorWidth);
    for (const b of boxes) {
      const [z0, z1] = extent(b, 2);
      expect(z0).toBeGreaterThanOrEqual(PANEL_MM); // behind the back panel face
      expect(z1).toBeLessThanOrEqual(CARCASS_DEPTH_MM - 1); // strictly behind the door plane
    }
  });

  it('stacks 2 and 3 drawer fronts evenly with readable reveals and no overlap', () => {
    for (const n of [2, 3] as const) {
      const spec = moduleSpec({ width: 800, fittings: [{ id: 'd1', kind: 'drawers', y: 0, drawersCount: n }] });
      const mod = computeLayout(design([spec])).modules[0];
      const iw = mod.interiorWidth;
      const boxes = drawerBank(fittingGeometry(mod, design([spec])), iw);
      const fronts = boxes
        .filter((b) => b.size[2] * 1000 === 18)
        .sort((a, b) => extent(a, 1)[0] - extent(b, 1)[0]);
      expect(fronts).toHaveLength(n);

      const bank = mod.elements.find((e) => e.kind === 'drawers')!;
      const du = bank.height / n;
      for (let i = 0; i < n; i++) {
        const [f0, f1] = extent(fronts[i], 1);
        const u0 = PANEL_MM + bank.y + i * du;
        expect(f0).toBeGreaterThan(u0); // reveal below the front
        expect(f1).toBeLessThanOrEqual(u0 + du); // never eats into the next unit
        if (i > 0) {
          const prev = extent(fronts[i - 1], 1);
          expect(f0).toBeGreaterThan(prev[1]); // no overlap between fronts
          expect(f0 - prev[1]).toBeGreaterThan(0); // a readable gap exists
        }
      }
      // Evenly spaced: identical vertical pitch between consecutive fronts.
      for (let i = 1; i < n; i++) {
        const pitchA = extent(fronts[i], 1)[0] - extent(fronts[i - 1], 1)[0];
        const pitchB = extent(fronts[1], 1)[0] - extent(fronts[0], 1)[0];
        expect(Math.abs(pitchA - pitchB)).toBeLessThan(1e-6);
      }
    }
  });

  it('places drawers on the interior floor (PANEL_MM offset) above the carcass bottom panel', () => {
    const spec = moduleSpec({ width: 600, fittings: [{ id: 'd1', kind: 'drawers', y: 0, drawersCount: 2 }] });
    const mod = computeLayout(design([spec])).modules[0];
    const boxes = drawerBank(fittingGeometry(mod, design([spec])), mod.interiorWidth);
    const minY = Math.min(...boxes.map((b) => extent(b, 1)[0]));
    expect(minY).toBeCloseTo(PANEL_MM, 6); // sits on the interior floor, not at module-local 0
  });

  it('uses the carcass finish family for drawer fronts instead of arbitrary bright gray', () => {
    const spec = moduleSpec({ width: 600, fittings: [{ id: 'd1', kind: 'drawers', y: 0, drawersCount: 2 }] });
    const mod = computeLayout(design([spec]));
    const boxes = fittingGeometry(mod.modules[0], design([spec]));
    const colors = new Set(boxes.map((b) => b.color));
    // Fronts share the carcass finish color; no leftover bright gray block color.
    const fronts = boxes.filter((b) => Math.abs(b.size[2] * 1000 - 18) < 1e-9 && extent(b, 2)[1] <= CARCASS_DEPTH_MM);
    expect(fronts.length).toBeGreaterThan(0);
    expect(new Set(fronts.map((b) => b.color))).toEqual(new Set(['#c8a26a']));
    for (const c of colors) {
      expect(c).not.toBe('#d0d3d8'); // the old arbitrary DRAWER_COLOR
    }
  });

  it('matches shelf placement to the same interior-floor baseline', () => {
    const spec = moduleSpec({
      width: 600,
      fittings: [
        { id: 's1', kind: 'shelf', y: 900 },
        { id: 'd1', kind: 'drawers', y: 0, drawersCount: 2 },
      ],
    });
    const mod = computeLayout(design([spec])).modules[0];
    const iw = mod.interiorWidth;
    const boxes = fittingGeometry(mod, design([spec]));
    const shelves = boxes.filter((b) => Math.abs(b.size[1] * 1000 - 18) < 1e-9 && extent(b, 2)[1] <= INTERIOR_DEPTH_MM);
    expect(shelves.length).toBeGreaterThan(0);
    const shelfBottom = Math.min(...shelves.map((b) => extent(b, 1)[0]));
    const shelfElem = mod.elements.find((e) => e.kind === 'shelf')!;
    // The shelf bottom must sit exactly at its planned interior-local y plus the floor offset.
    expect(shelfBottom).toBeCloseTo(PANEL_MM + shelfElem.y, 6);
    void iw;
  });

  it('emits strictly positive dimensions for every supported module width and stack', () => {
    for (const width of [500, 600, 800, 1000]) {
      for (const n of [2, 3] as const) {
        const spec = moduleSpec({ width, fittings: [{ id: 'd1', kind: 'drawers', y: 0, drawersCount: n }] });
        const mod = computeLayout(design([spec])).modules[0];
        const boxes = drawerBank(fittingGeometry(mod, design([spec])), mod.interiorWidth);
        for (const b of boxes) {
          for (const s of b.size) expect(s * 1000).toBeGreaterThan(0);
        }
      }
    }
  });
});
