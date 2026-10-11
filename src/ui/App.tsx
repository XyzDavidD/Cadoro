// App shell: slim header, stage + single right step sidebar, floating view
// toolbar, footer summary strip. Keyboard undo/redo never intercepts native
// undo inside text/number inputs.

import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import SummaryStep from './SummaryStep';
import type { StepId } from './Sidebar';
import StageToolbar from './StageToolbar';
import Footer from './Footer';
import Toasts from './Toasts';
import DemoBanner from './DemoBanner';
import Scene from '../three/Scene';
import { useAppStore } from '../state/store';
import { Icon } from './uiHelpers';
import cadoroWordmark from '../assets/cadoro_wordmark_white.svg';

function isTextEntryTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export default function App() {
  const [step, setStep] = useState<StepId>('spatiu');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      // Native undo/redo stays untouched inside inputs and editable elements.
      if (isTextEntryTarget(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault();
        useAppStore.getState().undo();
      } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
        e.preventDefault();
        useAppStore.getState().redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      <a className="skip-link" href="#stage">Sari la vizualizare</a>
      <DemoBanner />
      <header className="header">
        <div className="brand">
          <img className="brand-mark" src={cadoroWordmark} alt="Cadoro" />

        </div>
        <div className="header-actions">
          <button className="btn ghost" onClick={() => useAppStore.getState().undo()} title="Anulează ultima acțiune (Ctrl+Z)">
            <Icon name="undo" /><span className="btn-label">Anulează</span>
          </button>
          <button className="btn ghost" onClick={() => useAppStore.getState().redo()} title="Reface acțiunea anulată (Ctrl+Shift+Z)">
            <Icon name="redo" /><span className="btn-label">Refă</span>
          </button>
          <button className="btn primary" onClick={() => { setStep('rezumat'); setMobileOpen(true); }}>
            <Icon name="file" /><span className="btn-label">Rezumat</span>
          </button>
        </div>
      </header>
      <div className="workspace">
        <main id="stage" className="stage">
          <Scene />
          <StageToolbar />
          <button
            type="button"
            className="btn primary mobile-tabs-btn"
            aria-expanded={mobileOpen}
            aria-controls="config-sidebar"
            onClick={() => setMobileOpen((o) => !o)}
          >
            <Icon name="layers" /> {step ? `Pas: ${step.charAt(0).toUpperCase() + step.slice(1)}` : 'Pași'}
          </button>
        </main>
        <div id="config-sidebar" className="sidebar-slot">
          <Sidebar step={step} onStep={setStep} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
        </div>
      </div>
      <Footer />
      <div className="print-summary" aria-hidden="true">
        <SummaryStep />
      </div>
      <Toasts />
    </div>
  );
}
