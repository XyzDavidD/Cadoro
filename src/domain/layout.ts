// Deterministic layout planner. Places modules left to right on the wall,
// computes fillers for the leftover wall width, and derives door leaves and
// interior element positions. Pure, no React, no three.js.

import {
  CARCASS_DEPTH_MM,
  DRAWER_BLOCK_MM,
  INTERIOR_DEPTH_MM,
  MAX_DOOR_LEAF_MM,
  RAIL_DIAMETER_MM,
  SHELF_THICKNESS_MM,
} from './catalog';
import type { Design, DoorLeafPlan, InteriorElement, LayoutPlan, ModulePlan } from './types';
import { validateDesign } from './validation';

export const PLINTH_HEIGHT_MM = 80;
export const FILLER_MAX_MM = 50; // gaps above this become visible filler panels

export function computeLayout(design: Design): LayoutPlan {
  const violations = validateDesign(design);
  const modules: ModulePlan[] = [];
  let x = 0;
  for (const m of design.modules) {
    const interiorWidth = m.width - 36;
    const interiorHeight = design.wardrobeHeightMm - 36;
    const elements = placeElements(m.fittings, interiorHeight);
    const doorLeaves = planDoorLeaves(m, design.wardrobeHeightMm);
    modules.push({
      spec: m,
      x,
      width: m.width,
      interiorWidth,
      interiorHeight,
      interiorDepth: INTERIOR_DEPTH_MM,
      elements,
      doorLeaves,
    });
    x += m.width;
  }
  const totalModuleWidth = x;
  const leftover = design.wallWidthMm - totalModuleWidth;
  let filler: LayoutPlan['filler'] = null;
  if (leftover > 0 && leftover <= FILLER_MAX_MM && design.modules.length > 0) {
    filler = { x: totalModuleWidth, width: leftover };
  }
  return { modules, filler, totalModuleWidth, overflow: Math.max(0, -leftover), violations };
}

/** Bottom-up interior element placement. Shelves and rails need no bottom gap;
 *  drawer banks sit on the interior floor. Elements stack in given order,
 *  each placed as low as possible above the previous one + required clear gap. */
export function placeElements(fittings: import('./types').Fitting[], interiorHeight: number): InteriorElement[] {
  const elems: InteriorElement[] = [];
  let cursor = 0; // mm from interior floor
  const GAP = 100;
  const sorted = [...fittings].sort((a, b) => a.y - b.y);
  // Keep the user's requested y as a hint but enforce a bottom-up stack:
  // each element is placed at max(requested y, previous top + 100).
  for (const f of sorted) {
    const h = heightOf(f);
    let y = Math.max(0, Math.min(f.y, interiorHeight - h));
    if (elems.length > 0) {
      const prevTop = elems[elems.length - 1].y + elems[elems.length - 1].height;
      y = Math.max(y, prevTop + GAP);
    }
    if (y + h > interiorHeight) {
      y = Math.max(0, interiorHeight - h);
    }
    elems.push({ kind: f.kind, y, height: h, drawersCount: f.drawersCount });
  }
  void cursor;
  return elems;
}

export function heightOf(f: import('./types').Fitting): number {
  if (f.kind === 'drawers') return DRAWER_BLOCK_MM[f.drawersCount ?? 2];
  if (f.kind === 'shelf') return SHELF_THICKNESS_MM;
  return RAIL_DIAMETER_MM;
}

export function planDoorLeaves(m: import('./types').ModuleSpec, _wardrobeHeightMm: number): DoorLeafPlan[] {
  void _wardrobeHeightMm;
  if (m.doorType === 'none') return [];
  const leaves = Math.ceil(m.width / MAX_DOOR_LEAF_MM);
  const leafW = m.width / leaves;
  const out: DoorLeafPlan[] = [];
  for (let i = 0; i < leaves; i++) {
    out.push({ width: leafW, kind: m.doorType === 'sliding' ? 'sliding' : 'hinged', hingeSide: i % 2 === 0 ? 'left' : 'right' });
  }
  return out;
}

/** Full external dimensions summary for a design (cm for the UI). */
export function designSummary(design: Design) {
  const layout = computeLayout(design);
  return {
    totalWidthMm: layout.totalModuleWidth,
    depthMm: CARCASS_DEPTH_MM,
    heightMm: design.wardrobeHeightMm,
    moduleCount: layout.modules.length,
  };
}
