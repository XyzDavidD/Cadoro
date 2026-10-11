// Step "Interior": fitting placement with cm labels, +/- nudges, warnings and
// clear explanations of what each element does. No raw unexplained y values.

import { DRAWER_BLOCK_MM, FITTING_LABELS, MIN_CLEAR_GAP_MM, RAIL_MIN_HANGING_MM } from '../domain/catalog';
import { heightOf } from '../domain/layout';
import { validateFittings } from '../domain/validation';
import { clampFittingY, useAppStore } from '../state/store';
import { DraftNumberInput, Icon } from './uiHelpers';
import type { FittingKind } from '../domain/types';

const NUDGES = [5, 10, 25]; // cm

export default function InteriorStep() {
  const design = useAppStore((s) => s.design);
  const selectedModuleId = useAppStore((s) => s.selectedModuleId);
  const select = useAppStore((s) => s.select);
  const addFitting = useAppStore((s) => s.addFitting);
  const removeFitting = useAppStore((s) => s.removeFitting);
  const updateFitting = useAppStore((s) => s.updateFitting);

  const mod = design.modules.find((m) => m.id === selectedModuleId);
  const interiorHeight = design.wardrobeHeightMm - 36;

  if (!mod) {
    return (
      <div>
        <p className="hint">Alege un corp din pasul „Corpuri” ca să-i aranjezi interiorul.</p>
        <div className="module-list" role="list">
          {design.modules.map((m) => (
            <button key={m.id} type="button" className="module-main solo" onClick={() => select(m.id)}>
              <span className="module-id">{m.id}</span>
              <span className="module-desc">{m.width / 10} cm · {m.fittings.length} componente</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const violations = validateFittings(mod.fittings, mod.width - 36, interiorHeight);
  const sorted = [...mod.fittings].sort((a, b) => a.y - b.y);

  const addWithSensibleDefault = (kind: FittingKind, drawersCount?: 2 | 3) => {
    // Suggest a sensible height: drawers at floor; shelves above the last
    // element; rail with hanging clearance below.
    let y = 0;
    if (kind !== 'drawers') {
      const last = sorted.at(-1);
      const lastTop = last ? last.y + heightOf(last) : 0;
      y = kind === 'rail' ? Math.max(lastTop + 100, RAIL_MIN_HANGING_MM) : lastTop + Math.max(MIN_CLEAR_GAP_MM, 350);
      const h = heightOf({ id: 'x', kind, y: 0, drawersCount });
      y = Math.max(0, Math.min(y, interiorHeight - h));
    }
    const clamped = clampFittingY(kind, y, interiorHeight, drawersCount, mod.fittings);
    if (clamped < 0) {
      useAppStore.getState().pushToast(`Nu mai există spațiu pentru ${FITTING_LABELS[kind].toLowerCase()} în ${mod.id}. Eliberează sau mută o componentă existență.`, 'error');
      return;
    }
    addFitting(mod.id, { kind, y: clamped, drawersCount });
  };

  const nudge = (fittingId: string, kind: FittingKind, drawersCount: 2 | 3 | undefined, deltaCm: number) => {
    const f = mod.fittings.find((x) => x.id === fittingId);
    if (!f) return;
    const target = f.y + deltaCm * 10;
    const clamped = clampFittingY(kind, target, interiorHeight, drawersCount, mod.fittings.filter((o) => o.id !== fittingId));
    if (clamped < 0) {
      useAppStore.getState().pushToast('Mutarea nu este posibilă: spațiul liber e insuficient.', 'error');
      return;
    }
    updateFitting(mod.id, fittingId, { y: clamped });
  };

  const describe = (kind: FittingKind, y: number, drawersCount?: 2 | 3) => {
    const top = y + heightOf({ id: 'x', kind, y: 0, drawersCount });
    if (kind === 'drawers') {
      return `Bloc sertare de ${DRAWER_BLOCK_MM[drawersCount ?? 2] / 10} cm, de la bază până la ${(top / 10).toFixed(0)} cm înălțime.`;
    }
    if (kind === 'rail') {
      return `Bară la ${(top / 10).toFixed(0)} cm; dedesubt rămân ${(y / 10).toFixed(0)} cm pentru haine pe umeraș.`;
    }
    return `Polită la ${(top / 10).toFixed(0)} cm de la bază.`;
  };

  return (
    <div>
      <section>
        <h3>Interior corp {mod.id}</h3>
        <p className="hint">
          Interior: {(mod.width - 36) / 10} cm lățime × {interiorHeight / 10} cm înălțime. Elementele se măsoară
          de la baza interioară până la baza componentei, în cm.
        </p>
        {violations.length > 0 && (
          <ul className="violations" role="alert">
            {violations.map((v, i) => (
              <li key={i} className={v.level}>{v.message}</li>
            ))}
          </ul>
        )}
        <div className="fitting-list">
          {sorted.length === 0 && <p className="hint">Fără componente. Adaugă polită, bară sau sertare mai jos.</p>}
          {sorted.map((f) => (
            <div key={f.id} className="fitting-card">
              <div className="fitting-card-head">
                <span className="fitting-kind">
                  <Icon name={f.kind} /> {FITTING_LABELS[f.kind]}{f.kind === 'drawers' ? ` (${f.drawersCount ?? 2})` : ''}
                </span>
                <span className="fitting-height">{describe(f.kind, f.y, f.drawersCount)}</span>
                <button type="button" className="btn icon-only danger" aria-label={`Șterge ${FITTING_LABELS[f.kind]}`} onClick={() => removeFitting(mod.id, f.id)}>
                  <Icon name="trash" />
                </button>
              </div>
              <div className="fitting-nudge">
                <span className="nudge-label">Înălțime:</span>
                <DraftNumberInput
                  ariaLabel={`Înălțimea ${FITTING_LABELS[f.kind].toLowerCase()} în centimetri, corp ${mod.id}`}
                  value={Math.round(f.y / 10)}
                  min={0}
                  max={Math.floor(interiorHeight / 10)}
                  onApply={(cm) => {
                    const target = Math.round(cm * 10);
                    const clamped = clampFittingY(f.kind, target, interiorHeight, f.drawersCount, mod.fittings.filter((o) => o.id !== f.id));
                    if (clamped < 0) {
                      useAppStore.getState().pushToast('Poziția cerută nu este validă: spațiul liber e insuficient.', 'error');
                      return;
                    }
                    updateFitting(mod.id, f.id, { y: clamped });
                  }}
                />
                <span className="unit">cm</span>
                {NUDGES.map((n) => (
                  <span key={n} className="nudge-group">
                    <button type="button" className="btn icon-only" aria-label={`Coboară ${FITTING_LABELS[f.kind]} cu ${n} cm`} onClick={() => nudge(f.id, f.kind, f.drawersCount, -n)}>
                      <Icon name="minus" />{n}
                    </button>
                    <button type="button" className="btn icon-only" aria-label={`Urcă ${FITTING_LABELS[f.kind]} cu ${n} cm`} onClick={() => nudge(f.id, f.kind, f.drawersCount, n)}>
                      <Icon name="plus" />{n}
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3>Adaugă componentă</h3>
        <p className="hint">Dacă poziția sugerată nu e validă, componenta se așază automat la cea mai aproape poziție validă sau ți se explică ce trebuie mutat.</p>
        <div className="fitting-add">
          <button type="button" className="btn ghost" onClick={() => addWithSensibleDefault('shelf')}><Icon name="shelf" /> Polită</button>
          <button type="button" className="btn ghost" onClick={() => addWithSensibleDefault('rail')}><Icon name="rail" /> Bară de haine</button>
          <button type="button" className="btn ghost" onClick={() => addWithSensibleDefault('drawers', 2)}><Icon name="drawers" /> Sertare (2)</button>
          <button type="button" className="btn ghost" onClick={() => addWithSensibleDefault('drawers', 3)}><Icon name="drawers" /> Sertare (3)</button>
        </div>
        <p className="hint tiny">
          Reguli demo: minimum {MIN_CLEAR_GAP_MM / 10} cm liber între componente; bara are nevoie de
          {' '}{RAIL_MIN_HANGING_MM / 10} cm libere dedesubt pentru haine pe umeraș; bloc sertare de
          {' '}{DRAWER_BLOCK_MM[2] / 10} cm (2) sau {DRAWER_BLOCK_MM[3] / 10} cm (3).
        </p>
      </section>
    </div>
  );
}
