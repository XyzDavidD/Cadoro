// Presentation / view state for the 3D stage: room look, view mode and
// toggles for overlay layers. This store is the SHARED CONTRACT with the
// renderer (src/three): the renderer consumes these exact state and action
// names. It is browser-local only and never saved inside design JSON.

import { create } from 'zustand';

export type RoomPreset = 'warm' | 'bright' | 'cool';
export type FloorFinish = 'oak' | 'herringbone' | 'stone';
export type ViewMode = 'perspective' | 'front';

export interface PresentationState {
  roomPreset: RoomPreset;
  floorFinish: FloorFinish;
  /** Wall paint as hex string; light palette only in this pass. */
  wallColor: string;
  viewMode: ViewMode;
  showMeasurements: boolean;
  showStyling: boolean;
  showLighting: boolean;
  /** Incremented by requestFit(); the renderer refits the camera on change. */
  fitRevision: number;
  /** Incremented by requestCapture(); the renderer renders a PNG on change. */
  captureRevision: number;

  setRoomPreset(v: RoomPreset): void;
  setFloorFinish(v: FloorFinish): void;
  setWallColor(v: string): void;
  setViewMode(v: ViewMode): void;
  toggleMeasurements(): void;
  toggleStyling(): void;
  toggleLighting(): void;
  requestFit(): void;
  requestCapture(): void;
}

export const WALL_COLOR_PRESETS: { hex: string; label: string }[] = [
  { hex: '#f1ece3', label: 'Alb cald' },
  { hex: '#f7f6f2', label: 'Alb pur' },
  { hex: '#e6e9ea', label: 'Gri rece' },
];

/** Warm offwhite default wall, matching the light room presets. */
export const DEFAULT_WALL_COLOR = '#f1ece3';

const STORAGE_KEY = 'cadoro-configurator-view-v1';

interface PersistedView {
  roomPreset?: RoomPreset;
  floorFinish?: FloorFinish;
  wallColor?: string;
  viewMode?: ViewMode;
  showMeasurements?: boolean;
  showStyling?: boolean;
  showLighting?: boolean;
}

function loadView(): PersistedView {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return parsed as PersistedView;
  } catch {
    return {};
  }
}

function persistView(v: PersistedView): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {
    // best-effort persistence; private mode etc.
  }
}

const initial = loadView();

export const usePresentationStore = create<PresentationState>((set, get) => {
  const save = () => {
    const s = get();
    persistView({
      roomPreset: s.roomPreset,
      floorFinish: s.floorFinish,
      wallColor: s.wallColor,
      viewMode: s.viewMode,
      showMeasurements: s.showMeasurements,
      showStyling: s.showStyling,
      showLighting: s.showLighting,
    });
  };
  return {
    roomPreset: initial.roomPreset ?? 'warm',
    floorFinish: initial.floorFinish ?? 'herringbone',
    wallColor: initial.wallColor ?? DEFAULT_WALL_COLOR,
    viewMode: initial.viewMode ?? 'perspective',
    showMeasurements: initial.showMeasurements ?? true,
    showStyling: initial.showStyling ?? true,
    showLighting: initial.showLighting ?? true,
    fitRevision: 0,
    captureRevision: 0,

    setRoomPreset(v) { set({ roomPreset: v }); save(); },
    setFloorFinish(v) { set({ floorFinish: v }); save(); },
    setWallColor(v) { set({ wallColor: v }); save(); },
    setViewMode(v) { set({ viewMode: v }); save(); },
    toggleMeasurements() { set((s) => ({ showMeasurements: !s.showMeasurements })); save(); },
    toggleStyling() { set((s) => ({ showStyling: !s.showStyling })); save(); },
    toggleLighting() { set((s) => ({ showLighting: !s.showLighting })); save(); },
    requestFit() { set((s) => ({ fitRevision: s.fitRevision + 1 })); },
    requestCapture() { set((s) => ({ captureRevision: s.captureRevision + 1 })); },
  };
});
