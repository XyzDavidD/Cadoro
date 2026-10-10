// Demo pricing. All prices are INVENTED demo figures in RON, not Cadoro prices.

import {
  CARCASS_BASE_RON,
  DEMO_VAT_PERCENT,
  PRICE_DRAWER_RON,
  PRICE_FILLER_BASE_RON,
  PRICE_FILLER_PER_MM_RON,
  PRICE_HANDLE_RON,
  PRICE_INSTALL_BASE_RON,
  PRICE_INSTALL_PER_MODULE_RON,
  PRICE_PER_DOOR_LEAF_RON,
  PRICE_RAIL_RON,
  PRICE_SHELF_RON,
  PRICE_SLIDING_PAIR_RON,
  getFinish,
} from './catalog';
import type { Design, LayoutPlan, PriceBreakdown, PriceLine } from './types';

export function computePrice(design: Design, layout: LayoutPlan, vatPercentOverride?: number): PriceBreakdown {
  const lines: PriceLine[] = [];
  for (const mod of layout.modules) {
    const base = CARCASS_BASE_RON[mod.width] ?? 0;
    const cf = getFinish(design.carcassFinishCode);
    const df = getFinish(mod.spec.doorFinishCode);
    const carcassMult = cf && !cf.doorsOnly ? cf.multiplier : 1;
    const doorMult = df ? df.multiplier : 1;
    lines.push({ label: `Corp ${mod.width} mm`, quantity: '1 buc', amountRon: Math.round(base * carcassMult) });

    if (mod.doorLeaves.length > 0) {
      if (mod.spec.doorType === 'sliding') {
        lines.push({ label: `Set uși glisante ${mod.width} mm`, quantity: '1 set', amountRon: Math.round(PRICE_SLIDING_PAIR_RON * doorMult * (mod.width / 1000)) });
      } else {
        lines.push({ label: `Uși batante ${mod.width} mm`, quantity: `${mod.doorLeaves.length} buc`, amountRon: Math.round(mod.doorLeaves.length * PRICE_PER_DOOR_LEAF_RON * doorMult) });
      }
      lines.push({ label: 'Mâner', quantity: '1 set', amountRon: PRICE_HANDLE_RON });
    }

    let shelves = 0, rails = 0, drawers = 0, drawerLeaves = 0;
    for (const e of mod.elements) {
      if (e.kind === 'shelf') shelves++;
      else if (e.kind === 'rail') rails++;
      else {
        drawers++;
        drawerLeaves += e.drawersCount ?? 2;
      }
    }
    if (shelves) lines.push({ label: 'Polită', quantity: `${shelves} buc`, amountRon: shelves * PRICE_SHELF_RON });
    if (rails) lines.push({ label: 'Bară de haine', quantity: `${rails} buc`, amountRon: rails * PRICE_RAIL_RON });
    if (drawers) lines.push({ label: 'Sertare', quantity: `${drawerLeaves} buc`, amountRon: drawerLeaves * PRICE_DRAWER_RON });
  }

  if (layout.filler) {
    lines.push({ label: 'Panou de racordare', quantity: '1 buc', amountRon: Math.round(PRICE_FILLER_BASE_RON + PRICE_FILLER_PER_MM_RON * layout.filler.width) });
  }
  if (layout.modules.length > 0) {
    lines.push({ label: 'Montaj și instalare (demonstrativ)', quantity: `${layout.modules.length} corpuri`, amountRon: PRICE_INSTALL_BASE_RON + PRICE_INSTALL_PER_MODULE_RON * layout.modules.length });
  }

  const subtotalRon = lines.reduce((s, l) => s + l.amountRon, 0);
  const vatRon = Math.round(subtotalRon * (vatPercentOverride ?? DEMO_VAT_PERCENT) / 100);
  return { lines, subtotalRon, vatRon, totalRon: subtotalRon + vatRon };
}

export function formatRon(v: number): string {
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', maximumFractionDigits: 0 }).format(v);
}
