// Domain types for the Cadoro configurator proof of concept.
// All dimensions are millimeters, integer-valued.

export type DoorType = 'none' | 'hinged' | 'sliding';

export type FittingKind = 'shelf' | 'rail' | 'drawers';

export interface Fitting {
  id: string;
  kind: FittingKind;
  /** Distance from the module interior floor to the BOTTOM of the element (shelf top surface, rail axis). */
  y: number;
  /** For drawers: 2 or 3 drawers. */
  drawersCount?: 2 | 3;
}

export interface ModuleSpec {
  id: string;
  width: number; // 500 | 600 | 800 | 1000
  doorType: DoorType;
  doorFinishCode: string;
  fittings: Fitting[];
}

export interface Design {
  wallWidthMm: number;
  wardrobeHeightMm: number;
  carcassFinishCode: string;
  modules: ModuleSpec[];
}

export type ViolationLevel = 'error' | 'warning' | 'info';

export interface Violation {
  code: string;
  level: ViolationLevel;
  message: string;
  moduleId?: string;
}

export interface DoorLeafPlan {
  width: number;
  kind: 'hinged' | 'sliding';
  hingeSide: 'left' | 'right';
}

export interface InteriorElement {
  kind: FittingKind;
  y: number; // bottom of element, mm above interior floor
  height: number; // occupied vertical extent
  drawersCount?: 2 | 3;
}

export interface ModulePlan {
  spec: ModuleSpec;
  x: number; // left edge position along the wall, mm
  width: number;
  interiorWidth: number;
  interiorHeight: number;
  interiorDepth: number;
  elements: InteriorElement[];
  doorLeaves: DoorLeafPlan[];
}

export interface FillerPlan {
  x: number;
  width: number;
}

export interface LayoutPlan {
  modules: ModulePlan[];
  filler: FillerPlan | null;
  totalModuleWidth: number;
  overflow: number; // mm by which modules exceed the wall
  violations: Violation[];
}

export interface PriceLine {
  label: string;
  quantity: string;
  amountRon: number;
}

export interface PriceBreakdown {
  lines: PriceLine[];
  subtotalRon: number;
  vatRon: number;
  totalRon: number;
}
