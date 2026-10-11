// Step "Corpuri": module list with selection, add/remove, width and doors,
// all in cm where user-facing.

import { FINISHES, SLIDING_MIN_MODULE_MM } from '../domain/catalog';
import { computeLayout } from '../domain/layout';
import { useAppStore } from '../state/store';
import { Icon } from './uiHelpers';

export default function ModulesStep() {
  const design = useAppStore((s) => s.design);
  const selectedModuleId = useAppStore((s) => s.selectedModuleId);
  const select = useAppStore((s) => s.select);
  const addModule = useAppStore((s) => s.addModule);
  const removeModule = useAppStore((s) => s.removeModule);
  const updateModule = useAppStore((s) => s.updateModule);
  const pushToast = useAppStore((s) => s.pushToast);

  const layout = computeLayout(design);
  const free = design.wallWidthMm - layout.totalModuleWidth;
  const selected = design.modules.find((m) => m.id === selectedModuleId) ?? null;
  const interiorWidth = selected ? selected.width - 36 : 0;
  const slidingAllowed = selected ? selected.width >= SLIDING_MIN_MODULE_MM : false;

  return (
    <div>
      <section>
        <h3>Corpuri pe perete</h3>
        <p className="hint">
          Corpurile se așază stânga-dreapta în ordinea listei. Lățimi disponibile: 50 / 60 / 80 / 100 cm.
          {' '}Liber pe perete: <strong>{(free / 10).toFixed(1)} cm</strong>
          {free < 0 && <span className="error-text"> (depășire de {(-free / 10).toFixed(1)} cm, șterge sau micsorează un corp)</span>}
          {free > 0 && free <= 5 && <span> (un panou de racord acoperă golul)</span>}
          {free > 5 && <span>. Poți lăsa și gol de { (free / 10).toFixed(1) } cm, panoul de racord nu e necesar peste 5 cm.</span>}
        </p>
        <div className="module-list" role="list">
          {design.modules.length === 0 && <p className="hint">Niciun corp. Adaugă primul corp mai jos.</p>}
          {design.modules.map((m) => (
            <div key={m.id} className={'module-row' + (m.id === selectedModuleId ? ' active' : '')} role="listitem">
              <button type="button" className="module-main" onClick={() => select(m.id === selectedModuleId ? null : m.id)} aria-pressed={m.id === selectedModuleId}>
                <span className="module-id">{m.id}</span>
                <span className="module-desc">{m.width / 10} cm lățime · {m.doorType === 'none' ? 'deschis' : m.doorType === 'hinged' ? 'uși batante' : 'uși glisante'}</span>
                <span className="module-fittings">{m.fittings.length} componente</span>
              </button>
              <button type="button" className="btn icon-only danger" aria-label={`Șterge corpul ${m.id}`} title={`Șterge corpul ${m.id}`} onClick={() => removeModule(m.id)}>
                <Icon name="trash" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3>Adaugă corp</h3>
        <div className="module-buttons">
          {[500, 600, 800, 1000].map((w) => (
            <button key={w} type="button" className="btn module-btn" onClick={() => addModule(w)} disabled={free < w}>
              + {w / 10} cm
            </button>
          ))}
        </div>
        {design.modules.length >= 12 && <p className="hint error-text">Maximum 12 corpuri în demonstrație.</p>}
      </section>

      {selected && (
        <section>
          <h3>Corp selectat: {selected.id}</h3>
          <div className="field">
            <label htmlFor="module-width">Lățime corp (cm)</label>
            <select id="module-width" value={selected.width} onChange={(e) => updateModule(selected.id, { width: Number(e.target.value) })}>
              {[500, 600, 800, 1000].map((w) => (
                <option key={w} value={w}>{w / 10} cm</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="module-doors">Uși</label>
            <select
              id="module-doors"
              value={selected.doorType}
              onChange={(e) => {
                const v = e.target.value as typeof selected.doorType;
                if (v === 'sliding' && !slidingAllowed) {
                  pushToast('Ușile glisante necesită corp de minim 75 cm lățime.', 'error');
                  return;
                }
                updateModule(selected.id, { doorType: v });
              }}
            >
              <option value="none">Deschis (fără uși)</option>
              <option value="hinged">Uși batante</option>
              <option value="sliding">Uși glisante</option>
            </select>
            <p className="hint">
              {selected.doorType === 'hinged' && `Uși batante: frunze de maximum 60 cm; pe ${selected.width / 10} cm ies ${(selected.width / 10 / 60) >= 1 ? Math.ceil(selected.width / 600) : 1} frunze.`}
              {selected.doorType === 'sliding' && `Uși glisante: corp de minim 75 cm, set complet de minim 150 cm total.`}
              {selected.doorType === 'none' && 'Corp deschis: interiorul rămâne vizibil, finisajul ușii nu se folosește.'}
            </p>
          </div>
          {selected.doorType !== 'none' && (
            <div className="field">
              <label htmlFor="module-door-finish">Finisaj uși (corp {selected.id})</label>
              <select id="module-door-finish" value={selected.doorFinishCode} onChange={(e) => updateModule(selected.id, { doorFinishCode: e.target.value })}>
                {FINISHES.map((f) => (
                  <option key={f.code} value={f.code}>{f.label}</option>
                ))}
              </select>
              <p className="hint">Pentru a schimba finisajul tuturor ușilor simultan folosește pasul „Finisaje”.</p>
            </div>
          )}
          <p className="hint tiny">Interior util: {interiorWidth / 10} cm lățime × {(design.wardrobeHeightMm - 36) / 10} cm înălțime.</p>
          <button type="button" className="btn ghost danger" onClick={() => removeModule(selected.id)}>
            <Icon name="trash" /> Șterge corpul {selected.id}
          </button>
        </section>
      )}
    </div>
  );
}
