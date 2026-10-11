// Footer: live summary strip (dimensions, module count, demo price, status).

import { useMemo } from 'react';
import { computeLayout, PLINTH_HEIGHT_MM } from '../domain/layout';
import { computePrice, formatRon } from '../domain/pricing';
import { useAppStore } from '../state/store';

export default function Footer() {
  const design = useAppStore((s) => s.design);
  const layout = useMemo(() => computeLayout(design), [design]);
  const price = useMemo(() => computePrice(design, layout), [design, layout]);
  const errors = layout.violations.filter((v) => v.level === 'error');
  const notes = layout.violations.filter((v) => v.level === 'warning' || v.level === 'info');

  return (
    <footer className="footer">
      <div className="footer-metrics">
        <span className="metric">
          <strong>{(layout.totalModuleWidth / 10).toFixed(1)} × 58 × {(design.wardrobeHeightMm + PLINTH_HEIGHT_MM) / 10} cm</strong>
          <em className="metric-sub">dulap complet (cu picior)</em>
        </span>
        <span className="metric">
          <strong>{layout.modules.length}</strong>
          <em className="metric-sub">corpuri</em>
        </span>
        <span className="metric demo-price" title="Preț demo, inventat">
          <strong>{formatRon(price.totalRon)}</strong>
          <em className="metric-sub">demo</em>
        </span>
      </div>
      <div className="footer-messages">
        {errors.length > 0 && <span className="footer-error">{errors.length} problemă{errors.length > 1 ? 'e' : ''} de validare</span>}
        {notes.length > 0 && <span className="footer-warn">{notes.length} note</span>}
        {errors.length === 0 && notes.length === 0 && layout.modules.length > 0 && <span className="footer-ok">Configurație validă</span>}
      </div>
    </footer>
  );
}
