// Discreet, dismissible demo notice. The disclosure also lives in the
// quotation and about dialogs; this banner is just a reminder.

import { useState } from 'react';
import { Icon } from './uiHelpers';

const KEY = 'cadoro-demo-banner-dismissed';

export default function DemoBanner() {
  const [open, setOpen] = useState(() => {
    try { return window.localStorage.getItem(KEY) !== '1'; } catch { return true; }
  });
  if (!open) return null;
  return (
    <div className="demo-banner" role="note">
      <span>
        <strong>Demonstrație.</strong> Catalogul, prețurile și materialele sunt inventate.
        Nu se trimite nicio comandă. Salvarea este locală, în acest browser.
      </span>
      <button
        type="button"
        className="banner-close"
        aria-label="Ascunde nota de demonstrație"
        onClick={() => {
          setOpen(false);
          try { window.localStorage.setItem(KEY, '1'); } catch { /* ignore */ }
        }}
      >
        <Icon name="close" />
      </button>
    </div>
  );
}
