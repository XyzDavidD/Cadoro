// Demo starting presets. Every dimension, fitting and finish here is INVENTED
// for the proof of concept and is NOT Cadoro inventory. Presets are plain
// Design values (schema v1), validated by the same domain rules as any other
// design, so a preset can never produce an unbuildable layout.

import type { Design } from './types';

export interface PresetInfo {
  id: string;
  name: string;
  useCase: string;
  description: string;
  design: Design;
}

/**
 * Dormitor: combinație echilibrată, corpuri cu uși plus un corp deschis.
 * Perete 250 cm, dulap 250 x 230 cm.
 */
export const DORMITOR_PRESET: Design = {
  wallWidthMm: 2500,
  wardrobeHeightMm: 2300,
  carcassFinishCode: 'DEMO-wood-oak',
  modules: [
    { id: 'M01', width: 600, doorType: 'hinged', doorFinishCode: 'DEMO-wood-oak', fittings: [
      { id: 'M01-F1', kind: 'drawers', y: 0, drawersCount: 3 },
      { id: 'M01-F2', kind: 'rail', y: 1610 },
    ]},
    { id: 'M02', width: 800, doorType: 'hinged', doorFinishCode: 'DEMO-wood-oak', fittings: [
      { id: 'M02-F1', kind: 'drawers', y: 0, drawersCount: 2 },
      { id: 'M02-F2', kind: 'rail', y: 1610 },
      { id: 'M02-F3', kind: 'shelf', y: 2000 },
    ]},
    { id: 'M03', width: 600, doorType: 'none', doorFinishCode: 'DEMO-wood-oak', fittings: [
      { id: 'M03-F1', kind: 'shelf', y: 400 },
      { id: 'M03-F2', kind: 'shelf', y: 1000 },
      { id: 'M03-F3', kind: 'shelf', y: 1600 },
    ]},
    { id: 'M04', width: 500, doorType: 'none', doorFinishCode: 'DEMO-wood-oak', fittings: [
      { id: 'M04-F1', kind: 'shelf', y: 300 },
      { id: 'M04-F2', kind: 'shelf', y: 900 },
      { id: 'M04-F3', kind: 'shelf', y: 1500 },
    ]},
  ],
};

/**
 * Hol de intrare: rafturi deschise pentru obiecte curente și un corp înalt
 * pentru haine sezoniere. Perete 200 cm, dulap 200 x 220 cm.
 */
export const HOL_PRESET: Design = {
  wallWidthMm: 2000,
  wardrobeHeightMm: 2200,
  carcassFinishCode: 'DEMO-wood-oak',
  modules: [
    { id: 'M01', width: 500, doorType: 'none', doorFinishCode: 'DEMO-wood-oak', fittings: [
      { id: 'M01-F1', kind: 'drawers', y: 0, drawersCount: 2 },
      { id: 'M01-F2', kind: 'shelf', y: 440 },
      { id: 'M01-F3', kind: 'shelf', y: 1200 },
      { id: 'M01-F4', kind: 'shelf', y: 1900 },
    ]},
    { id: 'M02', width: 1000, doorType: 'hinged', doorFinishCode: 'DEMO-wood-oak', fittings: [
      { id: 'M02-F1', kind: 'shelf', y: 0 },
      { id: 'M02-F2', kind: 'rail', y: 1200 },
    ]},
    { id: 'M03', width: 500, doorType: 'none', doorFinishCode: 'DEMO-wood-oak', fittings: [
      { id: 'M03-F1', kind: 'shelf', y: 400 },
      { id: 'M03-F2', kind: 'shelf', y: 1000 },
      { id: 'M03-F3', kind: 'shelf', y: 1600 },
    ]},
  ],
};

/**
 * Dressing: alergere lungă, majoritate deschisă, bară înaltă pentru haine
 * lungi și sertare jos. Perete 340 cm, dulap 340 x 240 cm.
 */
export const DRESSING_PRESET: Design = {
  wallWidthMm: 3400,
  wardrobeHeightMm: 2400,
  carcassFinishCode: 'DEMO-wood-oak',
  modules: [
    { id: 'M01', width: 1000, doorType: 'sliding', doorFinishCode: 'DEMO-wood-oak', fittings: [
      { id: 'M01-F1', kind: 'rail', y: 1500 },
    ]},
    { id: 'M02', width: 800, doorType: 'none', doorFinishCode: 'DEMO-wood-oak', fittings: [
      { id: 'M02-F1', kind: 'drawers', y: 0, drawersCount: 3 },
      { id: 'M02-F2', kind: 'shelf', y: 610 },
      { id: 'M02-F3', kind: 'shelf', y: 1300 },
      { id: 'M02-F4', kind: 'shelf', y: 2000 },
    ]},
    { id: 'M03', width: 1000, doorType: 'none', doorFinishCode: 'DEMO-wood-oak', fittings: [
      { id: 'M03-F1', kind: 'shelf', y: 500 },
      { id: 'M03-F2', kind: 'shelf', y: 1100 },
      { id: 'M03-F3', kind: 'shelf', y: 1700 },
    ]},
    { id: 'M04', width: 600, doorType: 'none', doorFinishCode: 'DEMO-wood-oak', fittings: [
      { id: 'M04-F1', kind: 'shelf', y: 350 },
      { id: 'M04-F2', kind: 'shelf', y: 950 },
      { id: 'M04-F3', kind: 'shelf', y: 1550 },
      { id: 'M04-F4', kind: 'shelf', y: 2150 },
    ]},
  ],
};

export const PRESETS: PresetInfo[] = [
  {
    id: 'dormitor',
    name: 'Dormitor',
    useCase: 'Haine la umeraș, sertare pentru lenjerie și rafturi deschise',
    description: 'Perete 250 cm · dulap 250 x 230 cm · 4 corpuri (2 cu uși)',
    design: DORMITOR_PRESET,
  },
  {
    id: 'hol',
    name: 'Hol de intrare',
    useCase: 'Obiecte de zi cu zi, sertare joase și corp înalt pentru haine',
    description: 'Perete 200 cm · dulap 200 x 220 cm · 3 corpuri',
    design: HOL_PRESET,
  },
  {
    id: 'dressing',
    name: 'Dressing',
    useCase: 'Alergere lungă predominant deschisă, bară înaltă și sertare jos',
    description: 'Perete 340 cm · dulap 340 x 240 cm · 4 corpuri',
    design: DRESSING_PRESET,
  },
];

/** Deep-copies a preset so edits never mutate the shared preset object. */
export function presetDesign(p: PresetInfo): Design {
  return JSON.parse(JSON.stringify(p.design)) as Design;
}
