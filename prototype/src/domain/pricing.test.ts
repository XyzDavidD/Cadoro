import { describe, expect, it } from 'vitest';
import { DEFAULT_DESIGN } from '../state/store';
import { computePrice, formatRon } from './pricing';
import { computeLayout } from './layout';
import type { Design, ModuleSpec } from './types';

function design(partial: Partial<Design>): Design {
  return { wallWidthMm: 2500, wardrobeHeightMm: 2300, carcassFinishCode: 'DEMO-lacquer-white', modules: [], ...partial };
}

describe('pricing totals', () => {
  it('empty design has zero total', () => {
    const d = design({});
    const layout = computeLayout(d);
    const price = computePrice(d, layout);
    expect(price.lines.length).toBe(0);
    expect(price.subtotalRon).toBe(0);
    expect(price.totalRon).toBe(0);
  });

  it('total equals subtotal plus vat and sums of lines', () => {
    const mods: ModuleSpec[] = [
      { id: 'M01', width: 600, doorType: 'hinged', doorFinishCode: 'DEMO-lacquer-white', fittings: [{ id: 'M01-F1', kind: 'shelf', y: 1000 }] },
    ];
    const d = design({ modules: mods });
    const layout = computeLayout(d);
    const price = computePrice(d, layout);
    const sum = price.lines.reduce((s, l) => s + l.amountRon, 0);
    expect(price.subtotalRon).toBe(sum);
    expect(price.totalRon).toBe(price.subtotalRon + price.vatRon);
    expect(price.vatRon).toBe(Math.round(sum * 0.21));
  });

  it('filler is priced when leftover is 1..50 mm', () => {
    const d = design({ wallWidthMm: 1050, modules: [{ id: 'M01', width: 1000, doorType: 'none', doorFinishCode: 'DEMO-lacquer-white', fittings: [] }] });
    const layout = computeLayout(d);
    expect(layout.filler).not.toBeNull();
    const price = computePrice(d, layout);
    expect(price.lines.some((l) => l.label.includes('racordare'))).toBe(true);
  });

  it('formatRon produces a RON string', () => {
    expect(formatRon(1234)).toMatch(/1\.234/);
  });
});

describe('VAT rate configurability (review fix)', () => {
  it('uses the demo default when no override is given', () => {
    const d = DEFAULT_DESIGN;
    const layout = computeLayout(d);
    const p = computePrice(d, layout);
    const sub = p.subtotalRon;
    expect(p.vatRon).toBe(Math.round(sub * 0.21));
  });
  it('honors an explicit override (rate is configurable)', () => {
    const d = DEFAULT_DESIGN;
    const layout = computeLayout(d);
    const p = computePrice(d, layout, 11);
    const sub = p.subtotalRon;
    expect(p.vatRon).toBe(Math.round(sub * 0.11));
  });
});
