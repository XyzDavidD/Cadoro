// Geometry planning helpers shared between the 3D scene and the summary view.
// Scene coordinate system: X along the wall (mm), Y up, Z depth with the
// wardrobe front toward +Z. All inputs and outputs are millimeters; the scene
// divides by 1000 when placing meshes.

import { CARCASS_DEPTH_MM, INTERIOR_DEPTH_MM, PANEL_MM, RAIL_DIAMETER_MM, SHELF_THICKNESS_MM } from '../domain/catalog';
import type { Design, ModulePlan } from '../domain/types';
import { PLINTH_HEIGHT_MM } from '../domain/layout';

export function mm(v: number): number {
  return v / 1000;
}

export interface BoxSpec {
  pos: [number, number, number];
  size: [number, number, number];
  color: string;
}

const SIDE_COLOR = '#cfd2d6';
const PANEL_COLOR = '#c8ccd2';
const BACK_COLOR = '#bfc3c9';
const DOOR_EDGE = '#e8e6e1';
const DRAWER_COLOR = '#d0d3d8';
const RAIL_COLOR = '#9aa0a8';
const PLINTH_COLOR = '#3a3d40';

function push(
  boxes: BoxSpec[],
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  color: string
): void {
  boxes.push({
    pos: [mm(x + sx / 2), mm(y + sy / 2), mm(z + sz / 2)],
    size: [mm(sx), mm(sy), mm(sz)],
    color,
  });
}

/** Panels of the carcass for one module. Local coordinates start at the module's left edge. */
export function carcassGeometry(mod: ModulePlan, design: Design): BoxSpec[] {
  const w = mod.width;
  const h = design.wardrobeHeightMm;
  const iw = mod.interiorWidth;
  const boxes: BoxSpec[] = [];
  push(boxes, 0, 0, 0, PANEL_MM, h, CARCASS_DEPTH_MM, SIDE_COLOR); // left side
  push(boxes, w - PANEL_MM, 0, 0, PANEL_MM, h, CARCASS_DEPTH_MM, SIDE_COLOR); // right side
  push(boxes, PANEL_MM, 0, 0, iw, PANEL_MM, CARCASS_DEPTH_MM, PANEL_COLOR); // bottom
  push(boxes, PANEL_MM, h - PANEL_MM, 0, iw, PANEL_MM, CARCASS_DEPTH_MM, PANEL_COLOR); // top
  push(boxes, PANEL_MM, PANEL_MM, 0, iw, h - 2 * PANEL_MM, 10, BACK_COLOR); // back
  return boxes;
}

/** Interior elements (shelves, rail, drawers) for one module. */
export function fittingGeometry(mod: ModulePlan, design: Design): BoxSpec[] {
  const boxes: BoxSpec[] = [];
  const iw = mod.interiorWidth;
  void design;
  for (const e of mod.elements) {
    if (e.kind === 'shelf') {
      push(boxes, PANEL_MM, e.y, 40, iw, SHELF_THICKNESS_MM, INTERIOR_DEPTH_MM - 40, PANEL_COLOR);
    } else if (e.kind === 'rail') {
      push(boxes, PANEL_MM, e.y, CARCASS_DEPTH_MM / 2 - 80, iw, RAIL_DIAMETER_MM, 60, RAIL_COLOR);
    } else if (e.kind === 'drawers') {
      const n = e.drawersCount ?? 2;
      const du = e.height / n;
      for (let i = 0; i < n; i++) {
        const y = e.y + i * du;
        push(boxes, PANEL_MM + 6, y + 10, CARCASS_DEPTH_MM - 90, iw - 12, du - 20, 300, DRAWER_COLOR);
      }
    }
  }
  return boxes;
}

export interface DoorSpec {
  pos: [number, number, number];
  size: [number, number, number];
  color: string;
  hingeSide: 'left' | 'right';
  kind: 'hinged' | 'sliding';
  openAngle: number; // radians, 0 = closed
  moduleWidth: number;
}

/** Door leaves for one module. Hinged doors swing outward; sliding leaves sit proud of the carcass. */
export function doorGeometry(mod: ModulePlan, design: Design, openAmount: number): DoorSpec[] {
  const out: DoorSpec[] = [];
  const h = design.wardrobeHeightMm;
  const finishColor = doorColor(mod.spec.doorFinishCode);
  if (mod.spec.doorType === 'hinged') {
    let x = 0;
    for (const leaf of mod.doorLeaves) {
      out.push({
        pos: [mm(x + leaf.width / 2), mm(h / 2), mm(CARCASS_DEPTH_MM + 9)],
        size: [mm(leaf.width - 4), mm(h - 4), mm(18)],
        color: finishColor,
        hingeSide: leaf.hingeSide,
        kind: 'hinged',
        openAngle: -openAmount * (leaf.hingeSide === 'left' ? Math.PI / 2 : -Math.PI / 2),
        moduleWidth: mod.width,
      });
      x += leaf.width;
    }
  } else if (mod.spec.doorType === 'sliding') {
    const half = mod.width / 2;
    out.push({
      pos: [mm(half / 2), mm(h / 2), mm(CARCASS_DEPTH_MM + 12)],
      size: [mm(half - 4), mm(h - 4), mm(18)],
      color: finishColor,
      hingeSide: 'left',
      kind: 'sliding',
      openAngle: openAmount * 0.9,
      moduleWidth: mod.width,
    });
    out.push({
      pos: [mm(half + half / 2), mm(h / 2), mm(CARCASS_DEPTH_MM + 30)],
      size: [mm(half - 4), mm(h - 4), mm(18)],
      color: finishColor,
      hingeSide: 'right',
      kind: 'sliding',
      openAngle: -openAmount * 0.9,
      moduleWidth: mod.width,
    });
  }
  void DOOR_EDGE;
  return out;
}

export function doorColor(code: string): string {
  switch (code) {
    case 'DEMO-wood-oak': return '#c8a26a';
    case 'DEMO-wood-smoked': return '#8a6844';
    case 'DEMO-wood-walnut': return '#5d4432';
    case 'DEMO-lacquer-white': return '#f2f0eb';
    case 'DEMO-lacquer-graphite': return '#3a3d40';
    case 'DEMO-glass-smoked': return '#4d4a42';
    default: return '#f2f0eb';
  }
}

export function carcassColor(code: string): string {
  switch (code) {
    case 'DEMO-wood-oak': return '#c8a26a';
    case 'DEMO-wood-smoked': return '#8a6844';
    case 'DEMO-wood-walnut': return '#5d4432';
    case 'DEMO-lacquer-white': return '#e9e7e2';
    case 'DEMO-lacquer-graphite': return '#43464a';
    default: return '#e9e7e2';
  }
}

export function plinthSpec(totalWidth: number): BoxSpec {
  return {
    pos: [mm(totalWidth / 2), mm(PLINTH_HEIGHT_MM / 2), mm(CARCASS_DEPTH_MM / 2)],
    size: [mm(totalWidth), mm(PLINTH_HEIGHT_MM), mm(CARCASS_DEPTH_MM - 60)],
    color: PLINTH_COLOR,
  };
}
