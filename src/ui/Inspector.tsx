import { FINISHES, FITTING_LABELS, SLIDING_MIN_MODULE_MM, getFinish } from '../domain/catalog';
import { DRAWER_BLOCK_MM } from '../domain/catalog';
import { validateFittings } from '../domain/validation';
import { useAppStore } from '../state/store';


export default function Inspector() {
  const design = useAppStore((s) => s.design);
  const selectedModuleId = useAppStore((s) => s.selectedModuleId);
  const select = useAppStore((s) => s.select);
  const updateModule = useAppStore((s) => s.updateModule);
  const removeModule = useAppStore((s) => s.removeModule);
  const addFitting = useAppStore((s) => s.addFitting);
  const removeFitting = useAppStore((s) => s.removeFitting);

  const mod = design.modules.find((m) => m.id === selectedModuleId);
  if (!mod) {
    return (
      <aside className="panel right-panel">
        <section>
          <h3>Fără selecție</h3>
          <p className="muted small">Apasă pe un corp în scena 3D sau în lista de mai jos pentru a-l edita.</p>
          <div className="module-list">
            {design.modules.map((m) => (
              <button key={m.id} className="module-row" onClick={() => select(m.id)}>
                <span>{m.id}</span>
                <span>{m.width} mm</span>
                <span>{m.doorType === 'none' ? 'deschis' : m.doorType === 'hinged' ? 'uși batante' : 'uși glisante'}</span>
              </button>
            ))}
          </div>
        </section>
      </aside>
    );
  }

  const interiorWidth = mod.width - 36;
  const interiorHeight = design.wardrobeHeightMm - 36;
  const violations = validateFittings(mod.fittings, interiorWidth, interiorHeight);
  const doorFinish = getFinish(mod.doorFinishCode);
  const slidingAllowed = mod.width >= SLIDING_MIN_MODULE_MM;

  const doorOptions = [
    { value: 'none', label: 'Deschis (fără uși)', disabled: false },
    { value: 'hinged', label: 'Uși batante', disabled: false },
    { value: 'sliding', label: 'Uși glisante', disabled: !slidingAllowed },
  ] as const;

  return (
    <aside className="panel right-panel">
      <section>
        <div className="inspector-head">
          <h3>{mod.id}</h3>
          <button className="btn ghost small" onClick={() => removeModule(mod.id)}>Șterge corpul</button>
        </div>
        <label className="field">
          <span>Lățime corp (mm)</span>
          <select
            value={mod.width}
            onChange={(e) => updateModule(mod.id, { width: Number(e.target.value) })}
          >
            {[500, 600, 800, 1000].map((w) => (
              <option key={w} value={w}>{w} mm</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Uși</span>
          <select
            value={mod.doorType}
            onChange={(e) => {
              const v = e.target.value as typeof doorOptions[number]['value'];
              updateModule(mod.id, { doorType: v });
            }}
          >
            {doorOptions.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}{o.disabled ? ' (min. 750 mm demo)' : ''}
              </option>
            ))}
          </select>
        </label>
        {mod.doorType !== 'none' && (
          <label className="field">
            <span>Finisaj uși</span>
            <select value={mod.doorFinishCode} onChange={(e) => updateModule(mod.id, { doorFinishCode: e.target.value })}>
              {FINISHES.map((f) => (
                <option key={f.code} value={f.code}>{f.label}</option>
              ))}
            </select>
          </label>
        )}
        {mod.doorType === 'none' && doorFinish?.doorsOnly && (
          <p className="error-text small">Sticla se aplică doar ușilor. Corpul deschis folosește finisajul corpului.</p>
        )}
      </section>

      <section>
        <h3>Interior (în interior: {interiorWidth} x {interiorHeight} mm)</h3>
        {violations.length > 0 && (
          <ul className="violations">
            {violations.map((v, i) => (
              <li key={i} className={v.level}>{v.message}</li>
            ))}
          </ul>
        )}
        <div className="fitting-list">
          {mod.fittings.length === 0 && <p className="muted small">Fără componente interioare.</p>}
          {mod.fittings.map((f) => (
            <div key={f.id} className="fitting-row">
              <span className="fitting-kind">{FITTING_LABELS[f.kind]}{f.kind === 'drawers' ? ` (${f.drawersCount ?? 2})` : ''}</span>
              <input
                type="number"
                min={0}
                max={interiorHeight}
                step={10}
                value={f.y}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v)) useAppStore.getState().updateFitting(mod.id, f.id, { y: v });
                }}
              />
              <span className="fitting-unit">mm</span>
              <button className="btn ghost tiny" onClick={() => removeFitting(mod.id, f.id)} aria-label={`Șterge ${FITTING_LABELS[f.kind]}`}>x</button>
            </div>
          ))}
        </div>
        <div className="fitting-add">
          <button className="btn ghost" onClick={() => addFitting(mod.id, { kind: 'shelf', y: Math.min(interiorHeight, (mod.fittings.at(-1)?.y ?? 0) + 400) })}>+ Polită</button>
          <button className="btn ghost" onClick={() => addFitting(mod.id, { kind: 'rail', y: Math.min(interiorHeight - 40, (mod.fittings.at(-1)?.y ?? 0) + 400) })}>+ Bară</button>
          <button className="btn ghost" onClick={() => addFitting(mod.id, { kind: 'drawers', y: 0, drawersCount: 2 })}>+ Sertare (2)</button>
          <button className="btn ghost" onClick={() => addFitting(mod.id, { kind: 'drawers', y: 0, drawersCount: 3 })}>+ Sertare (3)</button>
        </div>
        <p className="muted tiny">
          Bloc sertare: {DRAWER_BLOCK_MM[2]} mm (2) sau {DRAWER_BLOCK_MM[3]} mm (3), demonstrativ.
          Poziția y = distanța de la baza interioară până la baza componentei.
        </p>
      </section>
    </aside>
  );
}
