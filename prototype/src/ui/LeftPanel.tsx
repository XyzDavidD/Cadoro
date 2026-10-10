import { MODULE_WIDTHS, WALL_WIDTH_MAX_MM, WALL_WIDTH_MIN_MM } from '../domain/catalog';
import { useAppStore } from '../state/store';
import { computeLayout } from '../domain/layout';

export default function LeftPanel() {
  const design = useAppStore((s) => s.design);
  const setWall = useAppStore((s) => s.setWall);
  const setHeight = useAppStore((s) => s.setHeight);
  const setCarcassFinish = useAppStore((s) => s.setCarcassFinish);
  const addModule = useAppStore((s) => s.addModule);
  const layout = computeLayout(design);

  const widths = MODULE_WIDTHS as readonly number[];
  const totalModuleWidth = layout.totalModuleWidth;
  const remaining = design.wallWidthMm - totalModuleWidth;

  return (
    <aside className="panel left-panel">
      <section>
        <h3>Perete</h3>
        <label className="field">
          <span>Lățime perete (mm)</span>
          <input
            type="number"
            min={WALL_WIDTH_MIN_MM}
            max={WALL_WIDTH_MAX_MM}
            step={50}
            value={design.wallWidthMm}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isNaN(v)) setWall(v);
            }}
          />
        </label>
        <label className="field">
          <span>Înălțime dulap (mm)</span>
          <select value={design.wardrobeHeightMm} onChange={(e) => setHeight(Number(e.target.value))}>
            {[2000, 2100, 2200, 2300, 2400].map((h) => (
              <option key={h} value={h}>{h} mm</option>
            ))}
          </select>
        </label>
      </section>

      <section>
        <h3>Finisaj corp</h3>
        <div className="swatches">
          {['DEMO-lacquer-white', 'DEMO-lacquer-graphite', 'DEMO-wood-oak', 'DEMO-wood-smoked', 'DEMO-wood-walnut'].map((code) => (
            <button
              key={code}
              className={'swatch' + (design.carcassFinishCode === code ? ' active' : '')}
              onClick={() => setCarcassFinish(code)}
              title={code}
              aria-label={`Finisaj corp ${code}`}
            >
              <span className="swatch-color" data-finish={code} />
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>Module</h3>
        <p className="muted small">
          Adaugă corpuri de 500 / 600 / 800 / 1000 mm (program demonstrativ).
          Lățimea rămasă pe perete: <strong>{remaining} mm</strong>.
          {remaining > 0 && remaining <= 50 && <span> Un panou de racordare va acoperi golul rămas.</span>}
          {remaining > 50 && <span> Gol de {remaining} mm rămas pe perete.</span>}
          {remaining < 0 && <span className="error-text"> Modulele depășesc peretele cu {-remaining} mm.</span>}
        </p>
        <div className="module-buttons">
          {widths.map((w) => (
            <button key={w} className="btn module-btn" onClick={() => addModule(w)} disabled={remaining < w}>
              + {w} mm
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
