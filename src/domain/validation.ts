// DEMO RULES: invented demo clearance and compatibility rules. Real Cadoro
// manufacturing and compatibility rules are unavailable and must be supplied
// by the owner. See README for the list of demo rules.

import {
  DRAWER_BLOCK_MM,
  FINISHES,
  HEIGHT_MAX_MM,
  HEIGHT_MIN_MM,
  MAX_DOOR_LEAF_MM,
  MIN_CLEAR_GAP_MM,
  MODULE_WIDTHS,
  RAIL_MIN_HANGING_MM,
  SLIDING_MIN_MODULE_MM,
  SLIDING_MIN_RUN_MM,
  WALL_WIDTH_MAX_MM,
  WALL_WIDTH_MIN_MM,
} from './catalog';
import type { Design, Fitting, Violation } from './types';

export function isModuleWidth(w: number): boolean {
  return (MODULE_WIDTHS as readonly number[]).includes(w);
}

/** Validates one fitting list against a module's interior dimensions.
 *  Pure function; every refusal gets a human message in Romanian. */
export function validateFittings(
  fittings: Fitting[],
  _interiorWidth: number,
  interiorHeight: number
): Violation[] {
  const v: Violation[] = [];
  const items = [...fittings].sort((a, b) => a.y - b.y);

  for (const f of fittings) {
    if (f.y < 0 || f.y > interiorHeight) {
      v.push({ code: 'fitting-out', level: 'error', message: 'Poziția componentei iese din dulap.' });
    }
    if (f.kind === 'drawers') {
      const block = DRAWER_BLOCK_MM[f.drawersCount ?? 2];
      if (f.y + block > interiorHeight) {
        v.push({ code: 'drawer-overflow', level: 'error', message: 'Blocul de sertare iese din dulap. Alege o poziție mai jos.' });
      }
    }
  }

  // Vertical clearance checks between consecutive horizontal elements.
  const bands: { y: number; h: number; kind: string }[] = items.map((f) => ({
    y: f.y,
    h: f.kind === 'drawers' ? DRAWER_BLOCK_MM[f.drawersCount ?? 2] : f.kind === 'shelf' ? 18 : 40,
    kind: f.kind,
  }));
  bands.sort((a, b) => a.y - b.y);

  let prevTop = 0;
  for (let i = 0; i < bands.length; i++) {
    const b = bands[i];
    const top = b.y + b.h;
    const clearBelow = b.y - prevTop;
    const clearAbove = i === bands.length - 1 ? interiorHeight - top : bands[i + 1].y - top;
    if (clearAbove < MIN_CLEAR_GAP_MM) {
      v.push({
        code: 'clearance',
        level: 'error',
        message: 'Spațiu liber insuficient. Părăsește cel puțin 100 mm libere între componente.',
      });
    }
    if (b.kind === 'rail' && clearBelow < RAIL_MIN_HANGING_MM) {
      v.push({
        code: 'rail-clearance',
        level: 'error',
        message: 'Bara de haine are nevoie de cel puțin 1100 mm libere dedesubt pentru haine pe umeraș.',
      });
    }
    prevTop = top;
  }
  return v;
}

/** Validates a full design: module widths, door rules, fitting rules. */
export function validateDesign(design: Design): Violation[] {
  const v: Violation[] = [];

  if (design.wallWidthMm < WALL_WIDTH_MIN_MM || design.wallWidthMm > WALL_WIDTH_MAX_MM) {
    v.push({ code: 'wall-range', level: 'error', message: `Lățimea peretelui trebuie să fie între ${WALL_WIDTH_MIN_MM} și ${WALL_WIDTH_MAX_MM} mm.` });
  }
  if (design.wardrobeHeightMm < HEIGHT_MIN_MM || design.wardrobeHeightMm > HEIGHT_MAX_MM) {
    v.push({ code: 'height-range', level: 'error', message: `Înălțimea dulapului trebuie să fie între ${HEIGHT_MIN_MM} și ${HEIGHT_MAX_MM} mm.` });
  }

  if (design.modules.length === 0) {
    v.push({ code: 'no-modules', level: 'info', message: 'Adaugă primul modul pentru a începe proiectul.' });
    return v;
  }

  for (const m of design.modules) {
    if (!isModuleWidth(m.width)) {
      v.push({ code: 'bad-width', level: 'error', message: `Lățimea modulului ${m.id} nu face parte din programul de fabricație demonstrativ.` });
    }
    const interiorWidth = m.width - 36;
    const interiorHeight = design.wardrobeHeightMm - 36;

    // Fitting rules
    v.push(...validateFittings(m.fittings, interiorWidth, interiorHeight).map((x) => ({ ...x, moduleId: m.id })));

    // Door rules
    if (m.doorType === 'hinged') {
      const leaves = Math.ceil(m.width / MAX_DOOR_LEAF_MM);
      const leafW = m.width / leaves;
      if (leafW > MAX_DOOR_LEAF_MM + 0.001) {
        v.push({ code: 'door-too-wide', level: 'error', message: 'Ușa depășește lățimea maximă de fabricație demonstrativă (600 mm pentru o frunză).' });
      }
    }
    if (m.doorType === 'sliding') {
      if (m.width < SLIDING_MIN_MODULE_MM) {
        v.push({ code: 'sliding-narrow', level: 'error', message: 'Ușile glisante necesită module de cel puțin 750 mm lățime demonstrativă.' });
      }
    }
    // Glass doors: only where door finish is glass
    const gf = FINISHES.find((f) => f.code === m.doorFinishCode);
    if (gf?.doorsOnly && m.doorType === 'none') {
      v.push({ code: 'glass-no-door', level: 'error', message: 'Sticla se aplică doar ușilor. Alege o altă finisare pentru dulapul deschis.' });
    }
  }

  if (design.modules.some((m) => m.doorType === 'sliding') && design.modules.every((m) => m.doorType === 'sliding')) {
    const total = design.modules.reduce((s, m) => s + m.width, 0);
    if (total < SLIDING_MIN_RUN_MM) {
      v.push({ code: 'sliding-run', level: 'error', message: 'Un set complet de uși glisante necesită minimum 1500 mm lățime totală demonstrativă.' });
    }
  }

  return v;
}

/** Suggests a valid fitting list when the current one has violations.
 *  Used by the "auto-fix" convenience action. */
export function suggestFix(fittings: Fitting[], interiorHeight: number): Fitting[] {
  const fixed: Fitting[] = [...fittings];
  let changed = true;
  while (changed) {
    changed = false;
    const v = validateFittings(fixed, 600, interiorHeight);
    if (v.length === 0) return fixed;
    // Strategy: nudge the highest conflicting element up until clear.
    const items = [...fixed].sort((a, b) => b.y - a.y);
    for (const f of items) {
      const others = fixed.filter((o) => o.id !== f.id);
      const ceiling = interiorHeight;
      const occupied = others.map((o) => ({ y: o.y, h: o.kind === 'drawers' ? DRAWER_BLOCK_MM[o.drawersCount ?? 2] : 18 }));
      const below = occupied.filter((o) => o.y <= f.y);
      let minY = below.length > 0 ? Math.max(...below.map((o) => o.y + o.h)) + MIN_CLEAR_GAP_MM : 0;
      // A rail needs RAIL_MIN_HANGING_MM of clear space BELOW itself.
      if (f.kind === 'rail') minY = Math.max(minY, RAIL_MIN_HANGING_MM);
      const needH = f.kind === 'drawers' ? DRAWER_BLOCK_MM[f.drawersCount ?? 2] : 0;
      const maxBottom = ceiling - needH;
      if (f.y < minY && minY + needH <= maxBottom) {
        f.y = Math.min(ceiling - needH, minY);
        changed = true;
        break;
      }
    }
    if (!changed) return fixed; // give up gracefully
  }
  return fixed;
}
