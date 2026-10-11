// Step "Spațiu": room look cards, available space (cm draft inputs with
// explicit Apply), used/free width explanation and starting presets.

import { FINISHES, HEIGHT_MAX_MM, HEIGHT_MIN_MM, WALL_WIDTH_MAX_MM, WALL_WIDTH_MIN_MM } from '../domain/catalog';
import { FILLER_MAX_MM, computeLayout, PLINTH_HEIGHT_MM } from '../domain/layout';
import { useAppStore } from '../state/store';
import type { FinishTarget } from '../state/store';
import { usePresentationStore, WALL_COLOR_PRESETS } from '../state/presentation';
import type { FloorFinish, RoomPreset } from '../state/presentation';
import { PRESETS, presetDesign } from '../domain/presets';
import { DraftNumberInput, Icon, MaterialThumb, materialDefs } from './uiHelpers';
import { useState } from 'react';

const ROOM_CARDS: { id: RoomPreset; label: string; description: string }[] = [
  { id: 'warm', label: 'Cald', description: 'Lumină caldă, perete crem' },
  { id: 'bright', label: 'Luminos', description: 'Zi amplă, perete alb pur' },
  { id: 'cool', label: 'Răcoros', description: 'Lumină neutra, gri deschis' },
];

const FLOOR_CARDS: { id: FloorFinish; label: string; description: string }[] = [
  { id: 'oak', label: 'Parchet stejar', description: 'Scânduri drepte, stejar natural' },
  { id: 'herringbone', label: 'Parchet „pe spigă”', description: 'Model în unghi, aspect clasic' },
  { id: 'stone', label: 'Piatră deschisă', description: 'Dale mari, gri cald' },
];

export default function SpaceStep() {
  const design = useAppStore((s) => s.design);
  const setWall = useAppStore((s) => s.setWall);
  const setHeight = useAppStore((s) => s.setHeight);
  const applyFinish = useAppStore((s) => s.applyFinish);
  const loadDesign = useAppStore((s) => s.loadDesign);
  const select = useAppStore((s) => s.select);
  const pushToast = useAppStore((s) => s.pushToast);
  const past = useAppStore((s) => s.past.length);

  const roomPreset = usePresentationStore((s) => s.roomPreset);
  const setRoomPreset = usePresentationStore((s) => s.setRoomPreset);
  const floorFinish = usePresentationStore((s) => s.floorFinish);
  const setFloorFinish = usePresentationStore((s) => s.setFloorFinish);
  const wallColor = usePresentationStore((s) => s.wallColor);
  const setWallColor = usePresentationStore((s) => s.setWallColor);

  const [finishTarget, setFinishTarget] = useState<FinishTarget>('all');

  const layout = computeLayout(design);
  const free = design.wallWidthMm - layout.totalModuleWidth;
  const usedCm = layout.totalModuleWidth / 10;
  const wallCm = design.wallWidthMm / 10;
  const freePct = design.wallWidthMm > 0 ? Math.round((Math.max(0, free) / design.wallWidthMm) * 100) : 0;

  const applyPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    loadDesign(presetDesign(p));
    select(null);
    pushToast(`Presetarea „${p.name}” a fost încărcată. Poți personaliza orice mai jos.`, 'success');
  };

  const finishLabel = finishTarget === 'all' ? 'tot dulapul (corp și uși)' : finishTarget === 'carcass' ? 'doar corpul (interior și laterale)' : 'doar ușile';
  const glassNote = finishTarget === 'doors' ? '' : '';

  return (
    <div>
      <section>
        <h3>Pornire rapidă</h3>
        <p className="hint">Alege un punct de plecare valid, apoi personalizează. Proiectul salvat anterior nu se pierde: poți reveni la el cu Anulează sau Import JSON.</p>
        <div className="preset-list">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className="preset-card" onClick={() => applyPreset(p.id)}>
              <span className="preset-name">{p.name}</span>
              <span className="preset-use">{p.useCase}</span>
              <span className="preset-meta">{p.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>Spațiul disponibil</h3>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="wall-width">Lățimea spațiului disponibil (cm)</label>
            <div className="draft-row">
              <DraftNumberInput
                id="wall-width"
                ariaLabel="Lățimea spațiului disponibil, în centimetri"
                value={design.wallWidthMm / 10}
                min={WALL_WIDTH_MIN_MM / 10}
                max={WALL_WIDTH_MAX_MM / 10}
                onApply={(cm) => setWall(Math.round(cm * 10))}
              />
              <span className="unit">cm</span>
            </div>
            <p className="hint">Lățimea totală a peretelui pe care vrei să așezi dulapul. Interval {WALL_WIDTH_MIN_MM / 10}–{WALL_WIDTH_MAX_MM / 10} cm.</p>
          </div>
          <div className="field">
            <label htmlFor="wardrobe-height">Înălțimea corpului (cm)</label>
            <div className="draft-row">
              <select
                id="wardrobe-height"
                value={design.wardrobeHeightMm}
                onChange={(e) => setHeight(Number(e.target.value))}
              >
                {Array.from({ length: (HEIGHT_MAX_MM - HEIGHT_MIN_MM) / 100 + 1 }, (_, i) => HEIGHT_MIN_MM + i * 100).map((h) => (
                  <option key={h} value={h}>{h / 10} cm</option>
                ))}
              </select>
            </div>
            <p className="hint">Corpul este fabricat pe înălțimi de 10 cm. Cu piciorul de 8 cm, dulapul complet măsoară {(design.wardrobeHeightMm + PLINTH_HEIGHT_MM) / 10} cm înălțime.</p>
          </div>
        </div>

        <div className="width-explainer" role="group" aria-label="Raport lățime perete și mobilier">
          <div className="width-bar">
            <span className="width-used" style={{ width: `${Math.min(100, (layout.totalModuleWidth / Math.max(1, design.wallWidthMm)) * 100)}%` }} />
          </div>
          <p className="hint">
            Mobilierul ocupă <strong>{usedCm.toFixed(1)} cm</strong> din peretele de <strong>{wallCm.toFixed(1)} cm</strong>.
            {' '}{free > FILLER_MAX_MM
              ? `Rămân ${ (free / 10).toFixed(1) } cm liberi pe perete (poziționezi dulapul unde vrei tu).`
              : free > 0
                ? `Rămân ${ (free / 10).toFixed(1) } cm; un panou de racord se fabrică la măsură pentru gol.`
                : free === 0
                  ? 'Dulapul umple exact peretele.'
                  : `Mobilierul depășește peretele cu ${ (-free / 10).toFixed(1) } cm; lărgește spațiul sau șterge un corp.`}
            {' '}({Math.min(100, 100 - freePct)}% ocupat)
          </p>
        </div>
      </section>

      <section>
        <h3>Finisaj</h3>
        <div className="segmented" role="radiogroup" aria-label="Unde se aplică finisajul">
          {([['all', 'Tot'], ['carcass', 'Corp'], ['doors', 'Uși']] as const).map(([v, l]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={finishTarget === v}
              className={'segment' + (finishTarget === v ? ' active' : '')}
              onClick={() => setFinishTarget(v)}
            >
              {l}
            </button>
          ))}
        </div>
        <p className="hint">Se aplică la {finishLabel}. {glassNote}<strong>Stejar fumuriu</strong> este varianta mai închisă a stejarului natural.</p>
        <div className="material-grid" role="listbox" aria-label="Finisaje disponibile">
          {materialDefs().map((m) => (
            <button
              key={m.code}
              type="button"
              role="option"
              aria-selected={finishTarget !== 'doors' && design.carcassFinishCode === m.code}
              className={'material-card' + ((finishTarget !== 'doors' && design.carcassFinishCode === m.code) ? ' active' : '')}
              onClick={() => applyFinish(m.code, finishTarget)}
              title={`${m.label} (se aplică la ${finishLabel})`}
            >
              <MaterialThumb def={m} />
              <span className="material-label">{m.label}</span>
            </button>
          ))}
        </div>
        <p className="hint tiny">Sticla fumurie (doar uși) se alege din pasul „Uși”, pe corpuri cu uși. {FINISHES.filter((f) => f.doorsOnly).length} finisaj este disponibil exclusiv pentru uși.</p>
      </section>

      <section>
        <h3>Ambiancează camera</h3>
        <p className="hint">Aspectul camerei e vizualizare de prezentare; nu influențează prețul sau dimensiunile. Setarea rămâne în acest browser.</p>
        <div className="card-row">
          {ROOM_CARDS.map((c) => (
            <button key={c.id} type="button" className={'look-card' + (roomPreset === c.id ? ' active' : '')} onClick={() => setRoomPreset(c.id)} aria-pressed={roomPreset === c.id}>
              <span className="look-swatch" data-room={c.id} />
              <span className="look-name">{c.label}</span>
              <span className="look-desc">{c.description}</span>
            </button>
          ))}
        </div>
        <div className="card-row">
          {FLOOR_CARDS.map((c) => (
            <button key={c.id} type="button" className={'look-card' + (floorFinish === c.id ? ' active' : '')} onClick={() => setFloorFinish(c.id)} aria-pressed={floorFinish === c.id}>
              <span className="look-swatch floor" data-floor={c.id} />
              <span className="look-name">{c.label}</span>
              <span className="look-desc">{c.description}</span>
            </button>
          ))}
        </div>
        <div className="wall-colors" role="radiogroup" aria-label="Culoarea peretelui">
          {WALL_COLOR_PRESETS.map((w) => (
            <button
              key={w.hex}
              type="button"
              role="radio"
              aria-checked={wallColor === w.hex}
              className={'wall-dot' + (wallColor === w.hex ? ' active' : '')}
              style={{ background: w.hex }}
              title={w.label}
              aria-label={`Culoare perete: ${w.label}`}
              onClick={() => setWallColor(w.hex)}
            />
          ))}
        </div>
      </section>

      <section>
        <h3>Modificări</h3>
        <div className="step-actions">
          <button type="button" className="btn ghost" onClick={() => useAppStore.getState().undo()} disabled={past === 0}>
            <Icon name="undo" /> Anulează
          </button>
          <button type="button" className="btn ghost" onClick={() => useAppStore.getState().reset()}>
            <Icon name="reset" /> Reia demo
          </button>
        </div>
      </section>
    </div>
  );
}
