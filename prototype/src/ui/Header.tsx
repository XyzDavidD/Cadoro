import { useState } from 'react';
import { useAppStore } from '../state/store';
import wordmark from '../assets/cadoro_wordmark_white.svg';
import { deserializeDesign, exportJson } from '../domain/serialize';
import { computeLayout } from '../domain/layout';
import { computePrice, formatRon } from '../domain/pricing';
import { DEMO_VAT_PERCENT } from '../domain/catalog';

const STORAGE_INFO =
  'Salvarea se face doar în acest browser (localStorage). Nu există server, cont sau partajare online în această demonstrație.';

function buildQuotationText(): string {
  const design = useAppStore.getState().design;
  const layout = computeLayout(design);
  const price = computePrice(design, layout);
  const L: string[] = [];
  L.push('CADORO CONFIGURATOR (DEMONSTRATIV)');
  L.push('='.repeat(48));
  L.push('');
  L.push('ATENȚIE: document generat de un instrument demonstrativ.');
  L.push('Catalogul, prețurile, materialele și compatibilitățile sunt INVENTATE.');
  L.push('Nu reprezintă inventarul, prețurile sau regulile reale Cadoro.');
  L.push('Nu este o ofertă reală și nu se trimite nicio comandă sau date personale.');
  L.push('');
  L.push(`Data: ${new Date().toLocaleString('ro-RO')}`);
  L.push('');
  L.push('DESCRIERE PROIECT');
  L.push(`Perete: ${design.wallWidthMm} mm lățime`);
  L.push(`Dulap: ${layout.totalModuleWidth} mm lățime x ${design.wardrobeHeightMm} mm înălțime x 580 mm adâncime`);
  L.push(`Corpuri: ${layout.modules.length}`);
  L.push('');
  L.push('LISTA COMPONENTE (BOM DEMO)');
  for (const l of price.lines) {
    L.push(`- ${l.label} x ${l.quantity}: ${formatRon(l.amountRon)}`);
  }
  L.push('');
  L.push(`Subtotal: ${formatRon(price.subtotalRon)}`);
  L.push(`TVA ${DEMO_VAT_PERCENT}% (demo): ${formatRon(price.vatRon)}`);
  L.push(`TOTAL DEMO: ${formatRon(price.totalRon)}`);
  L.push('');
  L.push('Pentru o ofertă reală contactați Cadoro (Eurostar Furniture SRL),');
  L.push('Cluj-Napoca, tel. +40 264 598 878, contact@cadoromobili.ro.');
  L.push('');
  L.push('Notă: fișierul NU se trimite automat nicaieri. Este doar pentru descărcare locală.');
  return L.join('\n');
}

function downloadTextFile(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Header() {
  const design = useAppStore((s) => s.design);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const past = useAppStore((s) => s.past.length);
  const future = useAppStore((s) => s.future.length);
  const reset = useAppStore((s) => s.reset);
  const pushToast = useAppStore((s) => s.pushToast);
  const loadDesignAction = useAppStore((s) => s.loadDesign);

  const [showAbout, setShowAbout] = useState(false);
  const [showQuotation, setShowQuotation] = useState(false);

  function downloadJson() {
    const blob = new Blob([exportJson(design)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cadoro-configurator-design-demo.json';
    a.click();
    URL.revokeObjectURL(url);
    pushToast('Proiectul a fost exportat ca JSON.', 'success');
  }

  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result));
        const r = deserializeDesign(parsed);
        if (r.ok && r.design) {
          loadDesignAction(r.design);
          pushToast('Proiectul a fost importat cu succes.', 'success');
        } else {
          pushToast(`Import respins: ${r.issues[0] ?? 'document invalid'}`, 'error');
        }
      } catch {
        pushToast('Fișierul nu este un proiect JSON valid.', 'error');
      }
    };
    reader.readAsText(file);
  }

  return (
    <header className="header">
      <div className="brand">
        <img src={wordmark} alt="Cadoro" className="brand-logo" />
        <span className="brand-sub">Configurator demonstrativ de dulapuri</span>
      </div>
      <div className="header-actions">
        <button className="btn ghost" onClick={undo} disabled={past === 0} title="Anulează ultima acțiune">↶ Anulează</button>
        <button className="btn ghost" onClick={redo} disabled={future === 0} title="Reface acțiunea anulată">↷ Refă</button>
        <button className="btn ghost" onClick={reset} title="Reia proiectul demonstrativ">Resetează</button>
        <button className="btn ghost" onClick={downloadJson}>Export JSON</button>
        <label className="btn ghost file-btn">
          Import JSON
          <input type="file" accept="application/json,.json" onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }} hidden />
        </label>
        <button className="btn primary" onClick={() => setShowQuotation(true)}>Deviz (demo)</button>
        <button className="btn ghost icon" onClick={() => setShowAbout(true)} title="Despre această demonstrație" aria-label="Despre">i</button>
      </div>
      {showAbout && (
        <div className="modal-backdrop" onClick={() => setShowAbout(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Despre această demonstrație</h2>
            <p>
              Acest configurator este o <strong>demonstrație funcțională</strong> pentru proiectul Cadoro.
              Nu este magazin online și nu trimite comenzi sau date personale.
            </p>
            <p>
              <strong>Catalogul, prețurile, materialele și compatibilitățile sunt demonstrative (inventate).</strong>
              {' '}Nu reprezintă inventarul, prețurile sau regulile reale Cadoro (Eurostar Furniture SRL).
              Datele reale trebuie furnizate de companie înainte de orice utilizare comercială.
            </p>
            <p>{STORAGE_INFO}</p>
            <p className="muted">
              Sursă vizuală de referință: plannerul IKEA PAX, folosit doar ca model de interacțiune.
              Niciun cod sau material vizual IKEA nu este folosit în această aplicație.
            </p>
            <button className="btn primary" onClick={() => setShowAbout(false)}>Închide</button>
          </div>
        </div>
      )}
      {showQuotation && (
        <div className="modal-backdrop" onClick={() => setShowQuotation(false)}>
          <div className="modal quotation" onClick={(e) => e.stopPropagation()}>
            <h2>Deviz demonstrativ</h2>
            <p className="muted">Prețurile sunt inventate. Nu este o ofertă reală Cadoro.</p>
            <QuotationBody />
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => downloadTextFile(buildQuotationText(), 'cadoro-oferta-demo.txt')}>Descarcă deviz (.txt)</button>
              <button className="btn ghost" onClick={() => downloadTextFile(buildQuotationText(), 'cadoro-cerere-oferta-demo.txt')}>Descarcă cerere de ofertă (demo)</button>
              <button className="btn primary" onClick={() => setShowQuotation(false)}>Închide</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function QuotationBody() {
  const design = useAppStore((s) => s.design);
  const layout = computeLayout(design);
  const price = computePrice(design, layout);
  return (
    <div className="quotation-body">
      <table className="quotation-table">
        <thead>
          <tr><th>Componentă</th><th>Cantitate</th><th>Preț demo</th></tr>
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
      <p className="muted">
        Fiecare corp este un produs demo inventat. Nu este o ofertă reală Cadoro.
        Pentru ofertă reală contactați Cadoro: tel. +40 264 598 878, contact@cadoromobili.ro.
      </p>
    </div>
  );
}
