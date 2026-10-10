import { describe, expect, it } from 'vitest';
import { parseDesignDocument } from './schema';

const valid = {
  schemaVersion: 1,
  wallWidthMm: 2500,
  wardrobeHeightMm: 2300,
  carcassFinishCode: 'DEMO-lacquer-white',
  modules: [
    {
      id: 'M01',
      width: 600,
      doorType: 'hinged',
      doorFinishCode: 'DEMO-lacquer-white',
      fittings: [{ id: 'M01-F1', kind: 'shelf', y: 1000 }],
    },
  ],
};

describe('schema validation', () => {
  it('accepts a valid document', () => {
    const r = parseDesignDocument(valid);
    expect(r.ok).toBe(true);
    expect(r.design?.modules).toHaveLength(1);
  });

  it('rejects wrong schemaVersion', () => {
    const r = parseDesignDocument({ ...valid, schemaVersion: 2 });
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.includes('schemă'))).toBe(true);
  });

  it('rejects non-object payloads', () => {
    expect(parseDesignDocument('x').ok).toBe(false);
    expect(parseDesignDocument([1, 2]).ok).toBe(false);
    expect(parseDesignDocument(null).ok).toBe(false);
  });

  it('rejects module ids with unsafe characters', () => {
    const bad = JSON.parse(JSON.stringify(valid));
    bad.modules[0].id = '<script>';
    const r = parseDesignDocument(bad);
    expect(r.ok).toBe(false);
  });

  it('rejects unknown door types and fitting kinds', () => {
    const bad = JSON.parse(JSON.stringify(valid));
    bad.modules[0].doorType = 'folding';
    expect(parseDesignDocument(bad).ok).toBe(false);
    const bad2 = JSON.parse(JSON.stringify(valid));
    bad2.modules[0].fittings[0].kind = 'light';
    expect(parseDesignDocument(bad2).ok).toBe(false);
  });

  it('rejects more than 12 modules', () => {
    const bad = JSON.parse(JSON.stringify(valid));
    bad.modules = Array.from({ length: 13 }, (_, i) => ({ id: `M${i}`, width: 600, doorType: 'none', doorFinishCode: 'x', fittings: [] }));
    expect(parseDesignDocument(bad).ok).toBe(false);
  });

  it('roundtrips through serialize and deserialize', async () => {
    const { serializeDesign, deserializeDesign } = await import('./serialize');
    const d = {
      schemaVersion: 1,
      wallWidthMm: 2500,
      wardrobeHeightMm: 2300,
      carcassFinishCode: 'DEMO-lacquer-white',
      modules: valid.modules,
    };
    const doc = serializeDesign(d as never);
    const r = deserializeDesign(JSON.parse(JSON.stringify(doc)));
    expect(r.ok).toBe(true);
    expect(r.design?.modules[0].id).toBe('M01');
  });
});

describe('duplicate identifier rejection (review fix)', () => {
  it('rejects duplicate module ids', () => {
    const bad = JSON.parse(JSON.stringify(valid));
    bad.modules = [bad.modules[0], { ...bad.modules[0] }];
    const r = parseDesignDocument(bad);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.includes('duplicat'))).toBe(true);
  });

  it('rejects duplicate fitting ids within a module', () => {
    const bad = JSON.parse(JSON.stringify(valid));
    bad.modules[0].fittings = [bad.modules[0].fittings[0], { ...bad.modules[0].fittings[0] }];
    expect(parseDesignDocument(bad).ok).toBe(false);
  });

  it('still accepts distinct ids', () => {
    const ok2 = JSON.parse(JSON.stringify(valid));
    ok2.modules[0].fittings.push({ id: 'M01-F2', kind: 'rail', y: 1500 });
    ok2.modules.push({ id: 'M02', width: 800, doorType: 'none', doorFinishCode: 'DEMO-lacquer-white', fittings: [] });
    expect(parseDesignDocument(ok2).ok).toBe(true);
  });
});
