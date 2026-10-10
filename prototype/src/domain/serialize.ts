// JSON serialization for local persistence and file import/export.

import { parseDesignDocument } from './schema';
import type { Design } from './types';

export interface DesignDocument {
  schemaVersion: 1;
  app: 'cadoro-configurator-demo';
  wallWidthMm: number;
  wardrobeHeightMm: number;
  carcassFinishCode: string;
  modules: unknown[];
  savedAt: string;
}

export function serializeDesign(design: Design): DesignDocument {
  return {
    schemaVersion: 1,
    app: 'cadoro-configurator-demo',
    wallWidthMm: design.wallWidthMm,
    wardrobeHeightMm: design.wardrobeHeightMm,
    carcassFinishCode: design.carcassFinishCode,
    modules: design.modules.map((m) => ({
      id: m.id,
      width: m.width,
      doorType: m.doorType,
      doorFinishCode: m.doorFinishCode,
      fittings: m.fittings,
    })),
    savedAt: new Date().toISOString(),
  };
}

export function deserializeDesign(json: unknown): { ok: boolean; design?: Design; issues: string[] } {
  const r = parseDesignDocument(json);
  if (!r.ok || !r.design) return { ok: false, issues: r.issues };
  return { ok: true, design: r.design, issues: [] };
}

export function exportJson(design: Design): string {
  return JSON.stringify(serializeDesign(design), null, 2);
}
