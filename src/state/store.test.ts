// Store tests: undo/redo, ID uniqueness after remove/add, finish application,
// limit handling and draft-free commit semantics for space dimensions.

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore, DEFAULT_DESIGN, nextModuleId, clampFittingY, _resetIdState } from './store';
import type { Design } from '../domain/types';

function freshDesign(): Design {
  return JSON.parse(JSON.stringify(DEFAULT_DESIGN));
}

describe('undo/redo', () => {
  beforeEach(() => {
    const s = useAppStore.getState();
    s.reset();
    useAppStore.setState({ past: [], future: [], design: freshDesign(), selectedModuleId: null, doorsOpen: false, toasts: [] });
  });

  it('commit pushes history and undo/redo round-trips', () => {
    const s = useAppStore.getState();
    s.setWall(3000);
    expect(useAppStore.getState().design.wallWidthMm).toBe(3000);
    useAppStore.getState().undo();
    expect(useAppStore.getState().design.wallWidthMm).toBe(2500);
    useAppStore.getState().redo();
    expect(useAppStore.getState().design.wallWidthMm).toBe(3000);
  });

  it('undo/redo are no-ops on empty history', () => {
    useAppStore.getState().undo();
    useAppStore.getState().redo();
    expect(useAppStore.getState().design.modules.length).toBe(3);
  });

  it('reset is itself undoable', () => {
    useAppStore.getState().reset();
    useAppStore.getState().undo();
    expect(useAppStore.getState().design.modules).toHaveLength(3);
  });
});

describe('module id uniqueness after remove/add', () => {
  beforeEach(() => {
    _resetIdState();
    useAppStore.setState({ past: [], future: [], design: freshDesign(), selectedModuleId: null, toasts: [] });
  });

  it('removing M03 then adding does not reuse M03', () => {
    const s = useAppStore.getState();
    s.removeModule('M03');
    s.addModule(600);
    const d = useAppStore.getState().design;
    const ids = d.modules.map((m) => m.id);
    expect(ids).toContain('M04');
    expect(ids.filter((x) => x === 'M03')).toHaveLength(0);
    // all ids unique
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('repeated add/remove cycles never produce duplicates', () => {
    const s = useAppStore.getState();
    for (let i = 0; i < 6; i++) {
      s.removeModule(useAppStore.getState().design.modules[0].id);
      s.addModule(500);
      const ids = useAppStore.getState().design.modules.map((m) => m.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('nextModuleId skips ids already in the design', () => {
    const d = freshDesign();
    d.modules = [...d.modules, { ...d.modules[0], id: 'M09', fittings: [] }];
    const id = nextModuleId(d);
    expect(id).not.toBe('M09');
    expect(d.modules.some((m) => m.id === id)).toBe(false);
    const id2 = nextModuleId(d);
    expect(id2).not.toBe(id);
  });

  it('fitting ids inside one module stay unique after remove/add', () => {
    const s = useAppStore.getState();
    s.removeFitting('M01', 'M01-F1');
    s.addFitting('M01', { kind: 'shelf', y: 500 });
    const fits = useAppStore.getState().design.modules.find((m) => m.id === 'M01')!.fittings;
    const ids = fits.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain('M01-F1'); // removed ids are retired
    // New id is unique inside the module and different from the removed one.
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('finish application', () => {
  beforeEach(() => {
    useAppStore.setState({ past: [], future: [], design: freshDesign(), toasts: [] });
  });

  it("target 'all' updates carcass and every doored module in ONE undoable action", () => {
    const s = useAppStore.getState();
    const before = useAppStore.getState().past.length;
    s.applyFinish('DEMO-lacquer-graphite', 'all');
    const d = useAppStore.getState().design;
    expect(d.carcassFinishCode).toBe('DEMO-lacquer-graphite');
    for (const m of d.modules) {
      if (m.doorType !== 'none') expect(m.doorFinishCode).toBe('DEMO-lacquer-graphite');
    }
    expect(useAppStore.getState().past.length).toBe(before + 1);
    useAppStore.getState().undo();
    expect(useAppStore.getState().design.carcassFinishCode).toBe('DEMO-wood-oak');
  });

  it("target 'doors' changes only doored modules, never the carcass", () => {
    const s = useAppStore.getState();
    s.applyFinish('DEMO-lacquer-white', 'doors');
    const d = useAppStore.getState().design;
    expect(d.carcassFinishCode).toBe('DEMO-wood-oak');
    expect(d.modules.find((m) => m.id === 'M02')!.doorFinishCode).toBe('DEMO-lacquer-white');
    expect(d.modules.find((m) => m.id === 'M01')!.doorFinishCode).toBe('DEMO-wood-oak');
  });

  it("target 'carcass' leaves door finishes untouched", () => {
    const s = useAppStore.getState();
    s.applyFinish('DEMO-lacquer-white', 'carcass');
    const d = useAppStore.getState().design;
    expect(d.carcassFinishCode).toBe('DEMO-lacquer-white');
    expect(d.modules.find((m) => m.id === 'M02')!.doorFinishCode).toBe('DEMO-wood-oak');
  });
});

describe('limits are enforced in state', () => {
  beforeEach(() => {
    useAppStore.setState({ past: [], future: [], design: freshDesign(), toasts: [] });
  });

  it('addModule refuses a 13th module and toasts', () => {
    const s = useAppStore.getState();
    const d = useAppStore.getState().design;
    const extra = Array.from({ length: 9 }, (_, i) => ({ ...d.modules[0], id: `X${i}`, fittings: [] }));
    useAppStore.setState({ design: { ...d, modules: [...d.modules, ...extra] } });
    s.addModule(500);
    expect(useAppStore.getState().design.modules).toHaveLength(12);
    expect(useAppStore.getState().toasts.some((t) => t.kind === 'error')).toBe(true);
  });

  it('addFitting refuses a 9th fitting and toasts', () => {
    const s = useAppStore.getState();
    const mod = useAppStore.getState().design.modules[0];
    const fits = Array.from({ length: 8 }, (_, i) => ({ id: `${mod.id}-X${i}`, kind: 'shelf' as const, y: 100 + i }));
    useAppStore.getState().updateModule(mod.id, { fittings: fits });
    s.addFitting(mod.id, { kind: 'shelf', y: 2000 });
    expect(useAppStore.getState().design.modules.find((m) => m.id === mod.id)!.fittings).toHaveLength(8);
    expect(useAppStore.getState().toasts.some((t) => t.kind === 'error')).toBe(true);
  });
});

describe('clampFittingY', () => {
  const H = 2264; // 2300 - 36 interior height
  it('clamps into the cabinet and keeps rails high enough to hang clothes', () => {
    expect(clampFittingY('shelf', 99999, H)).toBe(H - 18);
    expect(clampFittingY('shelf', -5, H)).toBe(0);
    expect(clampFittingY('rail', 0, H)).toBe(1100);
  });

  it('keeps drawer blocks inside and returns -1 when no valid spot exists', () => {
    expect(clampFittingY('drawers', 3000, H, 3)).toBe(H - 510);
    expect(clampFittingY('drawers', 3000, 400, 3)).toBe(-1);
  });
});
