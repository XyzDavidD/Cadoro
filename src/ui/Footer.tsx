import { computeLayout } from '../domain/layout';
import { computePrice, formatRon } from '../domain/pricing';
import { useAppStore } from '../state/store';

export default function Footer() {
  const design = useAppStore((s) => s.design);
  const doorsOpen = useAppStore((s) => s.doorsOpen);
  const toggleDoors = useAppStore((s) => s.toggleDoors);
  const layout = computeLayout(design);
  const price = computePrice(design, layout);
  const errors = layout.violations.filter((v) => v.level === 'error');
  const warnings = layout.violations.filter((v) => v.level === 'warning' || v.level === 'info');

  return (
    <footer className="footer">
      <div className="footer-metrics">
        <span className="metric">
          {layout.totalModuleWidth} x 580 x {design.wardrobeHeightMm} mm
        </span>
        <span className="metric">{layout.modules.length} corpuri</span>
        <span className="metric demo-price" title="Preț demo, inventat">
          {formatRon(price.totalRon)} <em>demo</em>
        </span>
      </div>
      <div className="footer-actions">
        <button className="btn ghost" onClick={toggleDoors}>
          {doorsOpen ? 'Închide ușile' : 'Deschide ușile'}
        </button>
        <button className="btn ghost file-btn" onClick={() => {
          const priceLines = price.lines.map((l) => ({ component: l.label, quantity: l.quantity, amountRon: l.amountRon }));
          const bom = {
            note: 'DEMO BOM. Componente, coduri si preturi inventate; nu reprezinta oferta reala Cadoro (Eurostar Furniture SRL).',
            generatedAt: new Date().toISOString(),
            summary: {
              modules: layout.modules.length,
              wardrobeWidthMm: layout.totalModuleWidth,
              wardrobeHeightMm: design.wardrobeHeightMm,
              depthMm: 580,
              wallWidthMm: design.wallWidthMm,
            },
            modules: layout.modules.map((mod) => ({
              id: mod.spec.id,
              widthMm: mod.width,
              doorType: mod.spec.doorType,
              doorFinishCode: mod.spec.doorFinishCode,
              fittings: mod.spec.fittings.map((f) => ({ kind: f.kind, yMm: f.y, drawersCount: f.drawersCount ?? null })),
            })),
            filler: layout.filler ? { widthMm: layout.filler.width } : null,
            priceLines,
            subtotalRon: price.subtotalRon,
            vatRon: price.vatRon,
            totalRonDemo: price.totalRon,
          };
          const blob = new Blob([JSON.stringify(bom, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'cadoro-bom-demo.json';
          a.click();
          URL.revokeObjectURL(url);
        }}>
          Descarcă BOM (demo)
        </button>
      </div>
      <div className="footer-messages">
        {errors.length > 0 && (
          <span className="footer-error">
            {errors.length} problemă{errors.length > 1 ? 'e' : ''} de validare
          </span>
        )}
        {warnings.length > 0 && <span className="footer-warn">{warnings.length} notă informativă</span>}
        {errors.length === 0 && warnings.length === 0 && <span className="footer-ok">Configurație validă</span>}
      </div>
    </footer>
  );
}
