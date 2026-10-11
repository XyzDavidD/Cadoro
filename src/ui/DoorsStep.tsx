// Step "Uși": per-module door choices with plain-language rules and warnings.

import { FINISHES, MAX_DOOR_LEAF_MM, SLIDING_MIN_MODULE_MM, SLIDING_MIN_RUN_MM } from '../domain/catalog';
import { validateDesign } from '../domain/validation';
import { useAppStore } from '../state/store';

export default function DoorsStep() {
  const design = useAppStore((s) => s.design);
  const doorsOpen = useAppStore((s) => s.doorsOpen);
  const updateModule = useAppStore((s) => s.updateModule);
  const select = useAppStore((s) => s.select);
  const selectedModuleId = useAppStore((s) => s.selectedModuleId);
  const violations = validateDesign(design).filter((v) => v.level === 'error');

  const allSliding = design.modules.length > 0 && design.modules.every((m) => m.doorType === 'sliding');
  const total = design.modules.reduce((s, m) => s + m.width, 0);

  return (
    <div>
      <section>
        <h3>Uși pe corpuri</h3>
        <p className="hint">
          Fiecare corp poate rămâne deschis sau primi uși batante ori glisante. Reguli demo:
          frunză batantă de maximum {MAX_DOOR_LEAF_MM / 10} cm; glisante pornesc de la {SLIDING_MIN_MODULE_MM / 10} cm per corp
          și {SLIDING_MIN_RUN_MM / 10} cm total pentru un set complet.
        </p>
        {violations.length > 0 && (
          <ul className="violations" role="alert">
            {violations.map((v, i) => (
              <li key={i} className={v.level}>{v.message}</li>
            ))}
          </ul>
        )}
        <div className="door-module-list">
          {design.modules.length === 0 && <p className="hint">Adaugă întâi corpuri în pasul „Corpuri”.</p>}
          {design.modules.map((m) => (
            <div key={m.id} className={'door-module' + (m.id === selectedModuleId ? ' active' : '')}>
              <button type="button" className="module-main solo" onClick={() => select(m.id === selectedModuleId ? null : m.id)}>
                <span className="module-id">{m.id}</span>
                <span className="module-desc">{m.width / 10} cm lățime</span>
              </button>
              <div className="segmented compact" role="radiogroup" aria-label={`Uși corp ${m.id}`}>
                {([['none', 'Deschis'], ['hinged', 'Batante'], ['sliding', 'Glisante']] as const).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={m.doorType === v}
                    className={'segment' + (m.doorType === v ? ' active' : '')}
                    onClick={() => {
                      if (v === 'sliding' && m.width < SLIDING_MIN_MODULE_MM) {
                        useAppStore.getState().pushToast(`Corpul ${m.id} are ${(m.width / 10).toFixed(0)} cm; ușile glisante necesită minimum ${SLIDING_MIN_MODULE_MM / 10} cm. Alege un corp mai lat sau uși batante.`, 'error');
                        return;
                      }
                      updateModule(m.id, { doorType: v });
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {m.doorType !== 'none' && (
                <div className="field">
                  <label htmlFor={`door-finish-${m.id}`}>Finisaj uși {m.id}</label>
                  <select id={`door-finish-${m.id}`} value={m.doorFinishCode} onChange={(e) => updateModule(m.id, { doorFinishCode: e.target.value })}>
                    {FINISHES.map((f) => (
                      <option key={f.code} value={f.code}>{f.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3>Deschidere în vizualizare</h3>
        <button type="button" className="btn ghost" onClick={() => useAppStore.getState().toggleDoors()} aria-pressed={doorsOpen}>
          {doorsOpen ? 'Închide ușile în scenă' : 'Deschide ușile în scenă'}
        </button>
        <p className="hint tiny">
          {allSliding && total < SLIDING_MIN_RUN_MM
            ? `Atenție: doar uși glisante pe ${(total / 10).toFixed(0)} cm total; setul complet cere minimum ${SLIDING_MIN_RUN_MM / 10} cm.`
            : 'Folosește butonul din toolbar sau de aici ca să vezi interiorul cu uși deschise.'}
        </p>
      </section>
    </div>
  );
}
