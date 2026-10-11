// Geometry planning helpers shared between the 3D scene and the summary view.
// Scene coordinate system: X along the wall (mm), Y up, Z depth with the
// wardrobe front toward +Z. All inputs and outputs are millimeters; the scene
// divides by 1000 when placing meshes.

import { CARCASS_DEPTH_MM, INTERIOR_DEPTH_MM, PANEL_MM, SHELF_THICKNESS_MM } from '../domain/catalog';
import type { Design, ModulePlan } from '../domain/types';
import { PLINTH_HEIGHT_MM } from '../domain/layout';

export function mm(v: number): number {
  return v / 1000;
}

export interface BoxSpec {
  pos: [number, number, number];
  size: [number, number, number];
  color: string;
  /** Renderer hint: real finish map for wood panels, or separate hardware material. */
  surface?: 'finish' | 'metal' | 'plain';
  finishCode?: string;
}

const SIDE_COLOR = '#cfd2d6';
const PANEL_COLOR = '#c8ccd2';
const BACK_COLOR = '#bfc3c9';
const DOOR_EDGE = '#e8e6e1';
const PLINTH_COLOR = '#3a3d40';
const HANDLE_COLOR = '#8f949c';

// Drawer construction constants. All values in mm, module-local coordinates
// (x from the module's left edge, y from the module floor, z from the back of
// the carcass). Drawer fronts stay behind the closed-door plane at
// CARCASS_DEPTH_MM and the boxes stay inside the carcass cavity.
const BACK_PANEL_THICKNESS_MM = 10; // matches the back panel in carcassGeometry
const DRAWER_FRONT_THICKNESS_MM = 18;
const DRAWER_PANEL_THICKNESS_MM = 15; // drawer sides / back / bottom
const DRAWER_FRONT_REVEAL_MM = 4; // gap between a front and the carcass sides
const DRAWER_BOX_INSET_MM = 8; // drawer box narrower than the interior, per side
const DRAWER_VERTICAL_REVEAL_MM = 4; // readable gap between stacked fronts
const DRAWER_FRONT_RECESS_MM = 10; // front face sits this far behind the carcass front edge
const DRAWER_BACK_CLEARANCE_MM = 10; // box rear sits behind the back panel face
const DRAWER_TOP_CLEARANCE_MM = 6; // air above each drawer box under the next unit
const DRAWER_HANDLE_LENGTH_MM = 140;
const DRAWER_HANDLE_SECTION_MM = 14; // height and depth of the pull bar

function push(
  boxes: BoxSpec[],
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  color: string,
  surface: BoxSpec['surface'] = 'finish',
  finishCode?: string,
): void {
  boxes.push({
    pos: [mm(x + sx / 2), mm(y + sy / 2), mm(z + sz / 2)],
    size: [mm(sx), mm(sy), mm(sz)],
    color,
    surface,
    finishCode,
  });
}

/** Slightly darker tone of a #rrggbb color, for drawer box internals. */
function shadeColor(hex: string, factor: number): string {
  const v = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => Math.min(255, Math.max(0, Math.round(((v >> shift) & 0xff) * factor)));
  return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).padStart(6, '0')}`;
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
  push(boxes, PANEL_MM, PANEL_MM, 0, iw, h - 2 * PANEL_MM, BACK_PANEL_THICKNESS_MM, BACK_COLOR); // back
  return boxes;
}

/** Interior elements (shelves, rail, drawers) for one module. */
export function fittingGeometry(mod: ModulePlan, design: Design): BoxSpec[] {
  const boxes: BoxSpec[] = [];
  const iw = mod.interiorWidth;
  // Element y values are interior-local (above the interior floor); the
  // carcass bottom panel occupies module-local y 0..PANEL_MM, so every fitting
  // is lifted onto the real interior floor.
  const baseY = PANEL_MM;
  for (const e of mod.elements) {
    if (e.kind === 'shelf') {
      push(boxes, PANEL_MM, baseY + e.y, 40, iw, SHELF_THICKNESS_MM, INTERIOR_DEPTH_MM - 40, PANEL_COLOR, 'finish', design.carcassFinishCode);
    } else if (e.kind === 'rail') {
      // The rail is rendered as a true cylinder by WardrobeModule, not a box.
    } else if (e.kind === 'drawers') {
      const n = (e.drawersCount ?? 2) as 2 | 3;
      const du = e.height / n;
      const finishColor = carcassColor(design.carcassFinishCode);
      const boxColor = shadeColor(finishColor, 0.85);
      // Fronts: nearly full interior width, sitting just behind the door plane.
      const frontX = PANEL_MM + DRAWER_FRONT_REVEAL_MM;
      const frontW = iw - 2 * DRAWER_FRONT_REVEAL_MM;
      const frontZ1 = CARCASS_DEPTH_MM - DRAWER_FRONT_RECESS_MM;
      const frontZ0 = frontZ1 - DRAWER_FRONT_THICKNESS_MM;
      // Box: behind the front, clear of the back panel.
      const boxX = PANEL_MM + DRAWER_BOX_INSET_MM;
      const boxW = iw - 2 * DRAWER_BOX_INSET_MM;
      const backW = boxW - 2 * DRAWER_PANEL_THICKNESS_MM;
      const boxZ0 = BACK_PANEL_THICKNESS_MM + DRAWER_BACK_CLEARANCE_MM;
      const boxDepth = frontZ0 - boxZ0;
      const bankY = baseY + e.y; // bottom of the drawer bank on the interior floor
      const frontH = Math.max(du - DRAWER_VERTICAL_REVEAL_MM, 20);
      const sideH = Math.max(du - DRAWER_PANEL_THICKNESS_MM - DRAWER_VERTICAL_REVEAL_MM - DRAWER_TOP_CLEARANCE_MM, 10);
      for (let i = 0; i < n; i++) {
        const u0 = bankY + i * du;
        const frontY = u0 + DRAWER_VERTICAL_REVEAL_MM / 2;
        push(boxes, frontX, frontY, frontZ0, frontW, frontH, DRAWER_FRONT_THICKNESS_MM, finishColor, 'finish', design.carcassFinishCode); // front
        push(boxes, boxX, u0, boxZ0, boxW, DRAWER_PANEL_THICKNESS_MM, boxDepth, boxColor, 'finish', design.carcassFinishCode); // bottom
        push(boxes, boxX, u0 + DRAWER_PANEL_THICKNESS_MM, boxZ0, DRAWER_PANEL_THICKNESS_MM, sideH, boxDepth, boxColor, 'finish', design.carcassFinishCode); // left side
        push(boxes, boxX + boxW - DRAWER_PANEL_THICKNESS_MM, u0 + DRAWER_PANEL_THICKNESS_MM, boxZ0, DRAWER_PANEL_THICKNESS_MM, sideH, boxDepth, boxColor, 'finish', design.carcassFinishCode); // right side
        push(boxes, boxX + DRAWER_PANEL_THICKNESS_MM, u0 + DRAWER_PANEL_THICKNESS_MM, boxZ0, backW, sideH, DRAWER_PANEL_THICKNESS_MM, boxColor, 'finish', design.carcassFinishCode); // back
        // Restrained pull bar, centered on the front, fully behind the door plane.
        const handleW = Math.min(DRAWER_HANDLE_LENGTH_MM, frontW * 0.5);
        push(
          boxes,
          frontX + (frontW - handleW) / 2,
          frontY + frontH / 2 - DRAWER_HANDLE_SECTION_MM / 2,
          frontZ1,
          handleW,
          DRAWER_HANDLE_SECTION_MM,
          5,
          HANDLE_COLOR,
          'metal'
        );
      }
    }
  }
  return boxes;
}

export interface DoorSpec {
  pos: [number, number, number];
  size: [number, number, number];
  color: string;
  finishCode: string;
  hingeSide: 'left' | 'right';
  slideOffsetX?: number;
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
        size: [mm(leaf.width - 4), mm(h - 4), mm(20)],
        color: finishColor,
        finishCode: mod.spec.doorFinishCode,
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
      size: [mm(half - 4), mm(h - 4), mm(20)],
      color: finishColor,
      finishCode: mod.spec.doorFinishCode,
      hingeSide: 'left',
      kind: 'sliding',
      slideOffsetX: mm(half * 0.42),
      openAngle: 0,
      moduleWidth: mod.width,
    });
    out.push({
      pos: [mm(half + half / 2), mm(h / 2), mm(CARCASS_DEPTH_MM + 30)],
      size: [mm(half - 4), mm(h - 4), mm(20)],
      color: finishColor,
      finishCode: mod.spec.doorFinishCode,
      hingeSide: 'right',
      kind: 'sliding',
      slideOffsetX: -mm(half * 0.42),
      openAngle: 0,
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
    size: [mm(totalWidth), mm(PLINTH_HEIGHT_MM), mm(CARCASS_DEPTH_MM - 46)],
    color: PLINTH_COLOR,
  };
}
