// Defensive schema validation for imported / shared design JSON documents.
// Rejects unknown structures, unsafe values and arbitrary HTML injection via
// plain structural checks (no eval, no innerHTML anywhere in the app).

import { HEIGHT_MAX_MM, HEIGHT_MIN_MM, MODULE_WIDTHS, WALL_WIDTH_MAX_MM, WALL_WIDTH_MIN_MM } from './catalog';
import type { Design, Fitting, ModuleSpec } from './types';

const DOOR_TYPES = ['none', 'hinged', 'sliding'] as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export interface SchemaResult {
  ok: boolean;
  design?: Design;
  issues: string[];
}

export function parseDesignDocument(raw: unknown): SchemaResult {
  const issues: string[] = [];
  if (!isRecord(raw)) { issues.push('Documentul nu este un obiect JSON.'); return { ok: false, issues }; }
  const d = raw as Record<string, unknown>;
  if (d.schemaVersion !== 1) { issues.push('Versiune de schemă nesuportată. Sunt acceptate doar documentele cu schemaVersion 1.'); return { ok: false, issues }; }

  const wall = d.wallWidthMm, h = d.wardrobeHeightMm, carc = d.carcassFinishCode;
  if (typeof wall !== 'number' || !Number.isInteger(wall) || wall < WALL_WIDTH_MIN_MM || wall > WALL_WIDTH_MAX_MM) {
    issues.push('Lățimea peretelui lipsește sau este în afara intervalului.');
  }
  if (typeof h !== 'number' || !Number.isInteger(h) || h < HEIGHT_MIN_MM || h > HEIGHT_MAX_MM || h % 100 !== 0) {
    issues.push('Înălțimea lipsește sau nu e multiplu de 100 mm.');
  }
  if (typeof carc !== 'string' || carc.length > 64) { issues.push('Codul de finisare a corpului lipsește.'); }

  if (!Array.isArray(d.modules)) { issues.push('Lista de module lipsește.'); return { ok: false, issues }; }
  if (d.modules.length > 12) { issues.push('Maximum 12 module sunt permise în demonstrație.'); return { ok: false, issues }; }

  const modules: ModuleSpec[] = [];
  for (const mRaw of d.modules) {
    if (!isRecord(mRaw)) { issues.push('Modul invalid.'); return { ok: false, issues }; }
    const m = mRaw as Record<string, unknown>;
    if (typeof m.id !== 'string' || m.id.length > 12 || !/^[A-Za-z0-9_-]+$/.test(m.id)) {
      issues.push('Identificator de modul invalid.'); return { ok: false, issues };
    }
    if (typeof m.width !== 'number' || !(MODULE_WIDTHS as readonly number[]).includes(m.width)) {
      issues.push('Lățime de modul invalidă.'); return { ok: false, issues };
    }
    if (typeof m.doorType !== 'string' || !DOOR_TYPES.includes(m.doorType as typeof DOOR_TYPES[number])) {
      issues.push('Tip de ușă invalid.'); return { ok: false, issues };
    }
    if (typeof m.doorFinishCode !== 'string' || m.doorFinishCode.length > 64) {
      issues.push('Cod de finisare a ușii invalid.'); return { ok: false, issues };
    }
    const fittings: Fitting[] = [];
    if (Array.isArray(m.fittings)) {
      if (m.fittings.length > 8) { issues.push('Maximum 8 componente pe modul.'); return { ok: false, issues }; }
      for (const fRaw of m.fittings) {
        if (!isRecord(fRaw)) { issues.push('Componentă invalidă.'); return { ok: false, issues }; }
        const f = fRaw as Record<string, unknown>;
        if (typeof f.id !== 'string' || f.id.length > 12 || !/^[A-Za-z0-9_-]+$/.test(f.id)) {
          issues.push('Identificator de componentă invalid.'); return { ok: false, issues };
        }
        if (f.kind !== 'shelf' && f.kind !== 'rail' && f.kind !== 'drawers') {
          issues.push('Tip de componentă invalid.'); return { ok: false, issues };
        }
        if (typeof f.y !== 'number' || !Number.isInteger(f.y) || f.y < 0 || f.y > HEIGHT_MAX_MM) {
          issues.push('Poziție de componentă invalidă.'); return { ok: false, issues };
        }
        if (f.drawersCount !== undefined && f.drawersCount !== 2 && f.drawersCount !== 3) {
          issues.push('Număr de sertare invalid.'); return { ok: false, issues };
        }
        fittings.push({ id: f.id, kind: f.kind, y: f.y, drawersCount: f.drawersCount });
      }
    }
    modules.push({ id: m.id, width: m.width as number, doorType: m.doorType as ModuleSpec['doorType'], doorFinishCode: m.doorFinishCode, fittings });
  }

  // Duplicate identifiers make selection and editing ambiguous; reject them.
  const idSet = new Set<string>();
  for (const mod of modules) {
    if (idSet.has(mod.id)) { issues.push(`Identificator de modul duplicat: ${mod.id}.`); return { ok: false, issues }; }
    idSet.add(mod.id);
    const fitSet = new Set<string>();
    for (const f of mod.fittings) {
      if (fitSet.has(f.id)) { issues.push(`Identificator de componentă duplicat în modulul ${mod.id}: ${f.id}.`); return { ok: false, issues }; }
      fitSet.add(f.id);
    }
  }

  return {
    ok: issues.length === 0,
    design: { wallWidthMm: wall as number, wardrobeHeightMm: h as number, carcassFinishCode: carc as string, modules },
    issues,
  };
}
