// DEMO CATALOG. Every dimension, code and price in this file is INVENTED
// for the proof of concept. It is NOT Cadoro inventory, NOT real prices
// and NOT real product codes. Real data must come from Cadoro (Eurostar
// Furniture SRL) before any commercial use.

import type { FittingKind } from './types';

export const PANEL_MM = 18;
export const CARCASS_DEPTH_MM = 580;
export const INTERIOR_DEPTH_MM = 500;
export const SHELF_THICKNESS_MM = 18;
export const RAIL_DIAMETER_MM = 30;
export const DRAWER_BLOCK_MM: Record<2 | 3, number> = { 2: 340, 3: 510 };
export const DRAWER_UNIT_MM = 165;

export const MODULE_WIDTHS = [500, 600, 800, 1000] as const;
export const HEIGHT_MIN_MM = 2000;
export const HEIGHT_MAX_MM = 2400;
export const HEIGHT_STEP_MM = 100;
export const WALL_WIDTH_MIN_MM = 1500;
export const WALL_WIDTH_MAX_MM = 5000;
export const WALL_WIDTH_STEP_MM = 50;
export const MIN_MODULE_WIDTH = 500;

// Interior clear-space rules (invented demo rules, documented in README)
export const MIN_CLEAR_GAP_MM = 100; // minimum vertical clear space between horizontal elements
export const RAIL_MIN_HANGING_MM = 1100; // clear space required below a hanging rail
export const DRAWER_CLEAR_ABOVE_MM = 50; // clear space required above a drawer bank
export const MAX_DOOR_LEAF_MM = 600; // maximum hinged door leaf width
export const SLIDING_MIN_MODULE_MM = 750; // minimum module width for a sliding pair
export const SLIDING_MIN_RUN_MM = 1500; // minimum total wardrobe width for sliding doors

export interface Finish {
  code: string;
  label: string;
  kind: 'wood' | 'lacquer' | 'glass';
  colorHex: string;
  roughness: number;
  multiplier: number; // demo price multiplier
  doorsOnly: boolean;
}

// Prices are DEMO RON figures, not Cadoro prices.
export const FINISHES: Finish[] = [
  { code: 'DEMO-wood-oak', label: 'Stejar natural (furnier)', kind: 'wood', colorHex: '#c8a26a', roughness: 0.62, multiplier: 1.18, doorsOnly: false },
  { code: 'DEMO-wood-smoked', label: 'Stejar fumuriu (furnier)', kind: 'wood', colorHex: '#8a6844', roughness: 0.62, multiplier: 1.18, doorsOnly: false },
  { code: 'DEMO-wood-walnut', label: 'Nuc (furnier)', kind: 'wood', colorHex: '#5d4432', roughness: 0.6, multiplier: 1.24, doorsOnly: false },
  { code: 'DEMO-lacquer-white', label: 'Lac mat alb', kind: 'lacquer', colorHex: '#f2f0eb', roughness: 0.35, multiplier: 1.0, doorsOnly: false },
  { code: 'DEMO-lacquer-graphite', label: 'Lac mat grafit', kind: 'lacquer', colorHex: '#3a3d40', roughness: 0.35, multiplier: 1.05, doorsOnly: false },
  { code: 'DEMO-glass-smoked', label: 'Sticlă fumurie (doar uși)', kind: 'glass', colorHex: '#4d4a42', roughness: 0.12, multiplier: 1.35, doorsOnly: true },
];

export const CARCASS_BASE_RON: Record<number, number> = {
  500: 950,
  600: 1100,
  800: 1400,
  1000: 1650,
};

export const PRICE_PER_DOOR_LEAF_RON = 260;
export const PRICE_SLIDING_PAIR_RON = 640;
export const PRICE_HANDLE_RON = 35;
export const PRICE_SHELF_RON = 45;
export const PRICE_RAIL_RON = 85;
export const PRICE_DRAWER_RON = 145;
export const PRICE_FILLER_BASE_RON = 60;
export const PRICE_FILLER_PER_MM_RON = 0.4;
export const PRICE_INSTALL_BASE_RON = 350;
export const PRICE_INSTALL_PER_MODULE_RON = 120;
// Reference default: Romania standard VAT 21% since 1 August 2025.
// Source: https://static.anaf.ro/static/10/Anaf/AsistentaContribuabili_r/Cotele_de_TVA_09.2025.pdf
// This remains a demo quotation. The retailer/accountant must approve tax
// treatment, pricing and invoice handling before any commercial use.
export const DEMO_CONFIG = {
  vatPercent: 21,
};

export const DEMO_VAT_PERCENT = DEMO_CONFIG.vatPercent;

export function getFinish(code: string): Finish | undefined {
  return FINISHES.find((f) => f.code === code);
}

export const FITTING_LABELS: Record<FittingKind, string> = {
  shelf: 'Polită',
  rail: 'Bară de haine',
  drawers: 'Sertar',
};
