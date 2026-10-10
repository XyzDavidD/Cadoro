// Application state: immutable design snapshots, undo/redo history,
// localStorage persistence (browser-local, labeled as such in the UI).

import { create } from 'zustand';
import type { Design, Fitting, ModuleSpec } from '../domain/types';
import { deserializeDesign } from '../domain/serialize';
import { serializeDesign } from '../domain/serialize';

export interface SelectionState {
  moduleId: string | null;
}

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error' | 'success';
}

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
  addModule(width: number): void;
  removeModule(id: string): void;
  updateModule(id: string, patch: Partial<ModuleSpec>): void;
  addFitting(moduleId: string, f: Omit<Fitting, 'id'>): void;
  removeFitting(moduleId: string, fittingId: string): void;
  updateFitting(moduleId: string, fittingId: string, patch: Partial<Fitting>): void;
}

const STORAGE_KEY = 'cadoro-configurator-design-v1';

export function makeModuleId(n: number): string {
  return `M${String(n).padStart(2, '0')}`;
}

export function makeFittingId(moduleId: string, n: number): string {
  return `${moduleId}-F${n}`;
}

export const DEFAULT_DESIGN: Design = {
  wallWidthMm: 2500,
  wardrobeHeightMm: 2300,
  carcassFinishCode: 'DEMO-lacquer-white',
  modules: [
    { id: 'M01', width: 600, doorType: 'none', doorFinishCode: 'DEMO-lacquer-white', fittings: [
      { id: 'M01-F1', kind: 'rail', y: 1200 },
      { id: 'M01-F2', kind: 'shelf', y: 1400 },
    ]},
    { id: 'M02', width: 800, doorType: 'hinged', doorFinishCode: 'DEMO-lacquer-white', fittings: [
      { id: 'M02-F1', kind: 'drawers', y: 0, drawersCount: 3 },
      { id: 'M02-F2', kind: 'rail', y: 1650 },
      { id: 'M02-F3', kind: 'shelf', y: 1900 },
    ]},
    { id: 'M03', width: 600, doorType: 'none', doorFinishCode: 'DEMO-lacquer-white', fittings: [
      { id: 'M03-F1', kind: 'shelf', y: 800 },
      { id: 'M03-F2', kind: 'shelf', y: 1600 },
    ]},
  ],
};

let toastSeq = 1;

function loadInitial(): Design {
  if (typeof window === 'undefined') return DEFAULT_DESIGN;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DESIGN;
    // Imported/persisted designs go through schema validation on load.
    const parsed = JSON.parse(raw);
    const r = deserializeDesign(parsed);
    if (r.ok && r.design) return r.design;
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
    window.setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 5000);
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

  addModule(width) {
    const s = get();
    const n = s.design.modules.length + 1;
    const mod: ModuleSpec = {
      id: makeModuleId(n),
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
    const n = mod.fittings.length + 1;
    const fitting: Fitting = { ...f, id: makeFittingId(moduleId, n) };
    s.commit({
      ...s.design,
      modules: s.design.modules.map((m) => (m.id === moduleId ? { ...m, fittings: [...m.fittings, fitting] } : m)),
    });
  },

  removeFitting(moduleId, fittingId) {
    const s = get();
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
