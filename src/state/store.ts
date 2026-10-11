// Application state: immutable design snapshots, undo/redo history,
// localStorage persistence (browser-local, labeled as such in the UI).

import { create } from 'zustand';
import type { Design, Fitting, ModuleSpec } from '../domain/types';
import { deserializeDesign } from '../domain/serialize';
import { serializeDesign } from '../domain/serialize';
import { DRAWER_BLOCK_MM, MIN_CLEAR_GAP_MM, RAIL_MIN_HANGING_MM } from '../domain/catalog';
import { heightOf } from '../domain/layout';

export interface SelectionState {
  moduleId: string | null;
}

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error' | 'success';
}

export type FinishTarget = 'all' | 'carcass' | 'doors';

interface AppState {
  doorsOpen: boolean;
  design: Design;
  past: Design[];
  future: Design[];
  selectedModuleId: string | null;
  toasts: Toast[];
  // actions
  commit(next: Design): void;
  undo(): void;
  redo(): void;
  reset(): void;
  select(id: string | null): void;
  pushToast(text: string, kind?: Toast['kind']): void;
  dismissToast(id: number): void;
  loadDesign(d: Design): void;
  toggleDoors(): void;
  setWall(w: number): void;
  setHeight(h: number): void;
  setCarcassFinish(code: string): void;
  /** New: applies a finish to a target; 'all' is ONE undoable action. */
  applyFinish(code: string, target: FinishTarget): void;
  addModule(width: number): void;
  removeModule(id: string): void;
  updateModule(id: string, patch: Partial<ModuleSpec>): void;
  addFitting(moduleId: string, f: Omit<Fitting, 'id'>): void;
  removeFitting(moduleId: string, fittingId: string): void;
  updateFitting(moduleId: string, fittingId: string, patch: Partial<Fitting>): void;
}

const STORAGE_KEY = 'cadoro-configurator-design-v1';

/** Monotonic id counters keep identifiers unique across remove/add cycles.
 *  The old `count + 1` scheme collided after removing a module (M03 removed,
 *  then adding again produced M03 while another M03 existed in some flows).
 *  Removed ids are also "retired" so a fresh add never silently reuses one. */
const idCounters: { module: number; fitting: number } = { module: 0, fitting: 0 };
const retiredModuleIds = new Set<string>();
const retiredFittingIds = new Set<string>();

/** Test hook: resets id bookkeeping so scenarios are reproducible. */
export function _resetIdState(): void {
  idCounters.module = 0;
  idCounters.fitting = 0;
  retiredModuleIds.clear();
  retiredFittingIds.clear();
}

function bumpModuleCounter(modules: ModuleSpec[]): void {
  for (const m of modules) {
    const n = parseInt(m.id.replace(/^M/, ''), 10);
    if (Number.isFinite(n) && n > idCounters.module) idCounters.module = n;
    for (const f of m.fittings) {
      const fn = parseInt(f.id.split('-F').pop() ?? '', 10);
      if (Number.isFinite(fn) && fn > idCounters.fitting) idCounters.fitting = fn;
    }
  }
}

export function makeModuleId(n: number): string {
  return `M${String(n).padStart(2, '0')}`;
}

export function makeFittingId(moduleId: string, n: number): string {
  return `${moduleId}-F${n}`;
}

/** Next free module id; never reuses an id currently present, and walks the
 *  counter forward on repeated calls so removed ids are not immediately reused. */
export function nextModuleId(design: Design): string {
  if (idCounters.module === 0) bumpModuleCounter(design.modules);
  idCounters.module += 1;
  let candidate = makeModuleId(idCounters.module);
  const used = new Set(design.modules.map((m) => m.id));
  while (used.has(candidate) || retiredModuleIds.has(candidate)) {
    idCounters.module += 1;
    candidate = makeModuleId(idCounters.module);
  }
  return candidate;
}

/** Next free fitting id inside a module, same never-reuse rule. */
export function nextFittingId(design: Design, moduleId: string): string {
  const mod = design.modules.find((m) => m.id === moduleId);
  if (mod) {
    for (const f of mod.fittings) {
      const fn = parseInt(f.id.split('-F').pop() ?? '', 10);
      if (Number.isFinite(fn) && fn > idCounters.fitting) idCounters.fitting = fn;
    }
  }
  idCounters.fitting += 1;
  let candidate = makeFittingId(moduleId, idCounters.fitting);
  const used = new Set((mod?.fittings ?? []).map((f) => f.id));
  while (used.has(candidate) || retiredFittingIds.has(candidate)) {
    idCounters.fitting += 1;
    candidate = makeFittingId(moduleId, idCounters.fitting);
  }
  return candidate;
}

export const DEFAULT_DESIGN: Design = {
  wallWidthMm: 2500,
  wardrobeHeightMm: 2300,
  carcassFinishCode: 'DEMO-wood-oak',
  modules: [
    { id: 'M01', width: 600, doorType: 'none', doorFinishCode: 'DEMO-wood-oak', fittings: [
      { id: 'M01-F1', kind: 'rail', y: 1200 },
      { id: 'M01-F2', kind: 'shelf', y: 1400 },
    ]},
    { id: 'M02', width: 800, doorType: 'hinged', doorFinishCode: 'DEMO-wood-oak', fittings: [
      { id: 'M02-F1', kind: 'drawers', y: 0, drawersCount: 3 },
      { id: 'M02-F2', kind: 'rail', y: 1650 },
      { id: 'M02-F3', kind: 'shelf', y: 1900 },
    ]},
    { id: 'M03', width: 600, doorType: 'none', doorFinishCode: 'DEMO-wood-oak', fittings: [
      { id: 'M03-F1', kind: 'shelf', y: 800 },
      { id: 'M03-F2', kind: 'shelf', y: 1600 },
    ]},
  ],
};

let toastSeq = 1;

function loadInitial(): Design {
  idCounters.module = 0;
  idCounters.fitting = 0;
  retiredModuleIds.clear();
  retiredFittingIds.clear();
  if (typeof window === 'undefined') return DEFAULT_DESIGN;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DESIGN;
    // Imported/persisted designs go through schema validation on load.
    const parsed = JSON.parse(raw);
    const r = deserializeDesign(parsed);
    if (r.ok && r.design) {
      idCounters.module = 0;
      idCounters.fitting = 0;
      return r.design;
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_DESIGN;
}

export function saveToStorage(design: Design): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeDesign(design)));
  } catch {
    // storage may be unavailable (private mode); persistence is best-effort
  }
}

function persist(state: AppState) {
  saveToStorage(state.design);
}

/** Clamp a fitting bottom height so the element stays inside the cabinet and
 *  respects the minimum clear gaps. Pure, exported for tests and the UI. */
export function clampFittingY(kind: Fitting['kind'], requestedY: number, interiorHeight: number, drawersCount?: 2 | 3, others: Fitting[] = []): number {
  const h = heightOf({ id: 'x', kind, y: 0, drawersCount });
  if (h > interiorHeight) return -1; // the element itself cannot fit
  const maxBottom = Math.max(0, interiorHeight - h);
  let y = Math.min(Math.max(0, Math.round(requestedY)), maxBottom);
  if (kind === 'rail') y = Math.max(y, Math.min(RAIL_MIN_HANGING_MM, maxBottom));
  if (kind === 'drawers') {
    const top = DRAWER_BLOCK_MM[drawersCount ?? 2];
    const conflicting = others.filter((o) => o.y < y + top + MIN_CLEAR_GAP_MM && o.y + heightOf(o) > y);
    if (conflicting.length > 0) {
      y = Math.max(...conflicting.map((o) => o.y + heightOf(o))) + MIN_CLEAR_GAP_MM;
    }
    if (y + top > interiorHeight) return -1; // no valid position at all
  }
  return y;
}

export const useAppStore = create<AppState>((set, get) => ({
  doorsOpen: false,
  design: loadInitial(),
  past: [],
  future: [],
  selectedModuleId: null,
  toasts: [],

  commit(next) {
    set((s) => ({
      design: next,
      past: [...s.past.slice(-99), s.design],
      future: [],
    }));
    persist(get());
  },

  undo() {
    const s = get();
    if (s.past.length === 0) return;
    const prev = s.past[s.past.length - 1];
    set({
      design: prev,
      past: s.past.slice(0, -1),
      future: [s.design, ...s.future.slice(0, 99)],
    });
    persist(get());
  },

  redo() {
    const s = get();
    if (s.future.length === 0) return;
    const next = s.future[0];
    set({
      design: next,
      past: [...s.past.slice(-99), s.design],
      future: s.future.slice(1),
    });
    persist(get());
  },

  reset() {
    set((s) => ({ past: [...s.past.slice(-99), s.design], future: [], design: DEFAULT_DESIGN, selectedModuleId: null }));
    persist(get());
  },

  select(id) {
    set({ selectedModuleId: id });
  },

  toggleDoors() {
    set((s) => ({ doorsOpen: !s.doorsOpen }));
  },

  pushToast(text, kind = 'info') {
    const id = toastSeq++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, kind }] }));
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, 5000);
    }
  },

  dismissToast(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  loadDesign(d) {
    set((s) => ({ past: [...s.past.slice(-99), s.design], future: [], design: d, selectedModuleId: null }));
    persist(get());
  },

  setWall(w) {
    const s = get();
    if (w === s.design.wallWidthMm) return;
    s.commit({ ...s.design, wallWidthMm: w });
  },

  setHeight(h) {
    const s = get();
    if (h === s.design.wardrobeHeightMm) return;
    s.commit({ ...s.design, wardrobeHeightMm: h });
  },

  setCarcassFinish(code) {
    const s = get();
    if (code === s.design.carcassFinishCode) return;
    s.commit({ ...s.design, carcassFinishCode: code });
  },

  applyFinish(code, target) {
    const s = get();
    if (target === 'carcass') {
      if (code === s.design.carcassFinishCode) return;
      s.commit({ ...s.design, carcassFinishCode: code });
      return;
    }
    const next = {
      ...s.design,
      ...(target === 'all' ? { carcassFinishCode: code } : {}),
      modules: s.design.modules.map((m) =>
        m.doorType === 'none'
          ? m
          : { ...m, doorFinishCode: code }
      ),
    };
    if (JSON.stringify(next) === JSON.stringify(s.design)) return;
    s.commit(next);
  },

  addModule(width) {
    const s = get();
    if (s.design.modules.length >= 12) {
      s.pushToast('Maximum 12 corpuri în demonstrație.', 'error');
      return;
    }
    const mod: ModuleSpec = {
      id: nextModuleId(s.design),
      width,
      doorType: 'none',
      doorFinishCode: s.design.carcassFinishCode,
      fittings: [],
    };
    s.commit({ ...s.design, modules: [...s.design.modules, mod] });
    set({ selectedModuleId: mod.id });
  },

  removeModule(id) {
    const s = get();
    retiredModuleIds.add(id);
    s.commit({ ...s.design, modules: s.design.modules.filter((m) => m.id !== id) });
    if (s.selectedModuleId === id) set({ selectedModuleId: null });
  },

  updateModule(id, patch) {
    const s = get();
    s.commit({
      ...s.design,
      modules: s.design.modules.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    });
  },

  addFitting(moduleId, f) {
    const s = get();
    const mod = s.design.modules.find((m) => m.id === moduleId);
    if (!mod) return;
    if (mod.fittings.length >= 8) {
      s.pushToast('Maximum 8 componente pe modul în demonstrație.', 'error');
      return;
    }
    const fitting: Fitting = { ...f, id: nextFittingId(s.design, moduleId) };
    s.commit({
      ...s.design,
      modules: s.design.modules.map((m) => (m.id === moduleId ? { ...m, fittings: [...m.fittings, fitting] } : m)),
    });
  },

  removeFitting(moduleId, fittingId) {
    const s = get();
    retiredFittingIds.add(fittingId);
    s.commit({
      ...s.design,
      modules: s.design.modules.map((m) => (m.id === moduleId ? { ...m, fittings: m.fittings.filter((f) => f.id !== fittingId) } : m)),
    });
  },

  updateFitting(moduleId, fittingId, patch) {
    const s = get();
    s.commit({
      ...s.design,
      modules: s.design.modules.map((m) =>
        m.id === moduleId ? { ...m, fittings: m.fittings.map((f) => (f.id === fittingId ? { ...f, ...patch } : f)) } : m
      ),
    });
  },
}));
