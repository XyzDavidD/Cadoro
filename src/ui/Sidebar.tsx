// Right step/category sidebar: Spațiu, Corpuri, Interior, Finisaje, Uși, Rezumat.
// Tabs are real buttons with aria, focusable, with a mobile drawer variant.

import { useRef } from 'react';
import SpaceStep from './SpaceStep';
import ModulesStep from './ModulesStep';
import InteriorStep from './InteriorStep';
import FinishesStep from './FinishesStep';
import DoorsStep from './DoorsStep';
import SummaryStep from './SummaryStep';
import { Icon } from './uiHelpers';
import type { IconName } from './uiHelpers';

export type StepId = 'spatiu' | 'corpuri' | 'interior' | 'finisaje' | 'usi' | 'rezumat';

export const STEPS: { id: StepId; label: string; icon: IconName }[] = [
  { id: 'spatiu', label: 'Spațiu', icon: 'ruler' },
  { id: 'corpuri', label: 'Corpuri', icon: 'layers' },
  { id: 'interior', label: 'Interior', icon: 'shelf' },
  { id: 'finisaje', label: 'Finisaje', icon: 'bulb' },
  { id: 'usi', label: 'Uși', icon: 'door' },
  { id: 'rezumat', label: 'Rezumat', icon: 'file' },
];

export default function Sidebar(props: {
  step: StepId;
  onStep: (s: StepId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const { step, onStep, mobileOpen, onCloseMobile } = props;
  const tablistRef = useRef<HTMLDivElement>(null);

  // Roving focus: arrow keys move between tabs (WAI-ARIA tabs pattern).
  const onKeyDown = (e: React.KeyboardEvent) => {
    const idx = STEPS.findIndex((s) => s.id === step);
    let next = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (idx + 1) % STEPS.length;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (idx - 1 + STEPS.length) % STEPS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = STEPS.length - 1;
    if (next >= 0) {
      e.preventDefault();
      onStep(STEPS[next].id);
      const btns = tablistRef.current?.querySelectorAll<HTMLButtonElement>('.step-tab');
      btns?.[next]?.focus();
    }
  };

  const body =
    step === 'spatiu' ? <SpaceStep />
    : step === 'corpuri' ? <ModulesStep />
    : step === 'interior' ? <InteriorStep />
    : step === 'finisaje' ? <FinishesStep />
    : step === 'usi' ? <DoorsStep />
    : <SummaryStep />;

  return (
    <>
      {mobileOpen && <div className="sidebar-overlay" onClick={onCloseMobile} aria-hidden="true" />}
      <aside
        className={'sidebar' + (mobileOpen ? ' open' : '')}
        aria-label="Pași configurare"
      >
        <button type="button" className="sidebar-close btn ghost" aria-label="Închide panoul de configurare" onClick={onCloseMobile}><Icon name="close" /> Înapoi la dulap</button>
        <div className="sidebar-tabs" role="tablist" aria-orientation="vertical" ref={tablistRef} onKeyDown={onKeyDown}>
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              id={`tab-${s.id}`}
              aria-selected={step === s.id}
              aria-controls={`panel-${s.id}`}
              tabIndex={step === s.id ? 0 : -1}
              className={'step-tab' + (step === s.id ? ' active' : '')}
              onClick={() => onStep(s.id)}
            >
              <span className="step-index">{i + 1}</span>
              <Icon name={s.icon} />
              <span className="step-label">{s.label}</span>
            </button>
          ))}
        </div>
        <div
          className="sidebar-body"
          role="tabpanel"
          id={`panel-${step}`}
          aria-labelledby={`tab-${step}`}
        >
          {body}
        </div>
      </aside>
    </>
  );
}
