// Step "Finisaje": material cards with a target switch (tot / corp / uși).
// 'Tot' applies to carcass AND door finishes in one undoable action.

import { useAppStore } from '../state/store';
import type { FinishTarget } from '../state/store';
import { MaterialThumb, materialDefs } from './uiHelpers';
import { useState } from 'react';

export default function FinishesStep() {
  const design = useAppStore((s) => s.design);
  const applyFinish = useAppStore((s) => s.applyFinish);
  const [target, setTarget] = useState<FinishTarget>('all');

  const doored = design.modules.filter((m) => m.doorType !== 'none');
  const targetLabel = target === 'all' ? 'tot dulapul (corp și uși)' : target === 'carcass' ? 'doar corpul' : 'doar ușile';
  const activeFor = (code: string) =>
    target === 'doors' ? doored.length > 0 && doored.every((m) => m.doorFinishCode === code)
      : target === 'carcass' ? design.carcassFinishCode === code
      : design.carcassFinishCode === code && doored.every((m) => m.doorFinishCode === code);

  return (
    <div>
      <section>
        <h3>Aplică finisajul</h3>
        <div className="segmented" role="radiogroup" aria-label="Unde se aplică finisajul">
          {([['all', 'Tot'], ['carcass', 'Corp'], ['doors', 'Uși']] as const).map(([v, l]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={target === v}
              className={'segment' + (target === v ? ' active' : '')}
              onClick={() => setTarget(v)}
            >
              {l}
            </button>
          ))}
        </div>
        <p className="hint">
          Se aplică la {targetLabel}. „Tot” schimbă corpul și toate ușile într-o singură acțiune
          reversibilă cu Anulează.
        </p>
        <div className="material-grid" role="listbox" aria-label="Finisaje disponibile">
          {materialDefs().map((m) => (
            <button
              key={m.code}
              type="button"
              role="option"
              aria-selected={activeFor(m.code)}
              className={'material-card' + (activeFor(m.code) ? ' active' : '')}
              onClick={() => applyFinish(m.code, target)}
              title={`${m.label} (se aplică la ${targetLabel})`}
            >
              <MaterialThumb def={m} />
              <span className="material-label">{m.label}</span>
            </button>
          ))}
        </div>
        {target === 'doors' && doored.length === 0 && (
          <p className="hint">Niciun corp cu uși. Alege uși pentru un corp în pasul „Corpuri”.</p>
        )}
      </section>
      <section>
        <h3>Finisaje pe corpuri</h3>
        <div className="module-list" role="list">
          {design.modules.map((m) => (
            <div key={m.id} className="module-row" role="listitem">
              <span className="module-id">{m.id}</span>
              <span className="module-desc">{m.doorType === 'none' ? 'deschis, finisaj corp' : m.doorType === 'hinged' ? 'uși batante' : 'uși glisante'}</span>
              <span className="module-fittings">{m.doorType === 'none' ? design.carcassFinishCode.replace('DEMO-', '') : m.doorFinishCode.replace('DEMO-', '')}</span>
            </div>
          ))}
        </div>
        <p className="hint tiny">Sticla fumurie se aplică doar ușilor, din pasul „Uși”, corp cu corp.</p>
      </section>
    </div>
  );
}
