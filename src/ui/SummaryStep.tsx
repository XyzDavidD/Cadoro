// Step "Rezumat": dimensions, demo quotation, JSON save/load and print
// (browser print dialog; honestly labeled as demo).

import { useMemo } from 'react';
import { computeLayout, PLINTH_HEIGHT_MM } from '../domain/layout';
import { computePrice, formatRon } from '../domain/pricing';
import { DEMO_VAT_PERCENT } from '../domain/catalog';
import { useAppStore } from '../state/store';
import { deserializeDesign, exportJson } from '../domain/serialize';
import { Icon } from './uiHelpers';

export default function SummaryStep() {
  const design = useAppStore((s) => s.design);
  const loadDesign = useAppStore((s) => s.loadDesign);
  const pushToast = useAppStore((s) => s.pushToast);

  const layout = useMemo(() => computeLayout(design), [design]);
  const price = useMemo(() => computePrice(design, layout), [design, layout]);

  const downloadJson = () => {
    const blob = new Blob([exportJson(design)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cadoro-configurator-design-demo.json';
    a.click();
    URL.revokeObjectURL(url);
    pushToast('Proiectul a fost exportat ca JSON.', 'success');
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result));
        const r = deserializeDesign(parsed);
        if (r.ok && r.design) {
          loadDesign(r.design);
          pushToast('Proiectul a fost importat cu succes.', 'success');
        } else {
          pushToast(`Import respins: ${r.issues[0] ?? 'document invalid'}`, 'error');
        }
      } catch {
        pushToast('Fișierul nu este un proiect JSON valid.', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="summary-step">
      <section>
        <h3>Dimensiuni finale</h3>
        <ul className="summary-list">
          <li><span>Lățime dulap</span><strong>{(layout.totalModuleWidth / 10).toFixed(1)} cm</strong></li>
          <li><span>Înălțime corp (fără picior)</span><strong>{design.wardrobeHeightMm / 10} cm</strong></li>
          <li><span>Înălțime totală (cu picior de 8 cm)</span><strong>{(design.wardrobeHeightMm + PLINTH_HEIGHT_MM) / 10} cm</strong></li>
          <li><span>Adâncime</span><strong>58 cm</strong></li>
          <li><span>Corpuri</span><strong>{layout.modules.length}</strong></li>
          <li><span>Gol pe perete</span><strong>{Math.max(0, design.wallWidthMm - layout.totalModuleWidth) / 10} cm{layout.filler ? ' (panou de racord)' : ''}</strong></li>
        </ul>
      </section>

      <section>
        <h3>Deviz demonstrativ</h3>
        <table className="quotation-table">
          <thead>
            <tr><th>Componentă</th><th>Cant.</th><th>Preț demo</th></tr>
          </thead>
          <tbody>
            {price.lines.map((l, i) => (
              <tr key={i}><td>{l.label}</td><td>{l.quantity}</td><td>{formatRon(l.amountRon)}</td></tr>
            ))}
            <tr className="total-row"><td colSpan={2}>Subtotal (fără TVA)</td><td>{formatRon(price.subtotalRon)}</td></tr>
            <tr className="total-row"><td colSpan={2}>TVA {DEMO_VAT_PERCENT}% (demo)</td><td>{formatRon(price.vatRon)}</td></tr>
            <tr className="total-row"><td colSpan={2}>TOTAL DEMO</td><td>{formatRon(price.totalRon)}</td></tr>
          </tbody>
        </table>
        <p className="hint">
          Prețurile sunt inventate pentru demonstrație; nu este o ofertă reală Cadoro și nu se
          trimite nicio cerere sau comandă. Pentru o ofertă reală contactează Cadoro.
        </p>
      </section>

      <section>
        <h3>Salvare și printare</h3>
        <div className="step-actions">
          <button type="button" className="btn ghost" onClick={downloadJson}>
            <Icon name="download" /> Salvează proiectul (JSON)
          </button>
          <label className="btn ghost file-btn">
            <Icon name="upload" /> Încarcă proiect (JSON)
            <input
              type="file"
              accept="application/json,.json"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }}
              hidden
            />
          </label>
          <button type="button" className="btn ghost" onClick={() => window.print()}>
            <Icon name="printer" /> Printează / salvează ca PDF
          </button>
        </div>
        <p className="hint tiny">
          Printarea folosește fereastra de printare a browserului (alege „Salvează ca PDF” acolo).
          Se printează doar pagina de rezumat, etichetată ca demonstrație.
        </p>
      </section>
    </div>
  );
}
