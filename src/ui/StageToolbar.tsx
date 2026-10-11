// Floating view toolbar on the stage: front/perspective, doors, dimensions,
// styling, lighting, fit and screenshot. Every control is connected to the
// renderer presentation store.

import { useAppStore } from '../state/store';
import { usePresentationStore } from '../state/presentation';
import { Icon } from './uiHelpers';

export default function StageToolbar({ mobile }: { mobile?: boolean }) {
  const doorsOpen = useAppStore((s) => s.doorsOpen);
  const toggleDoors = useAppStore((s) => s.toggleDoors);
  const viewMode = usePresentationStore((s) => s.viewMode);
  const setViewMode = usePresentationStore((s) => s.setViewMode);
  const showMeasurements = usePresentationStore((s) => s.showMeasurements);
  const toggleMeasurements = usePresentationStore((s) => s.toggleMeasurements);
  const showStyling = usePresentationStore((s) => s.showStyling);
  const toggleStyling = usePresentationStore((s) => s.toggleStyling);
  const showLighting = usePresentationStore((s) => s.showLighting);
  const toggleLighting = usePresentationStore((s) => s.toggleLighting);
  const requestFit = usePresentationStore((s) => s.requestFit);
  const requestCapture = usePresentationStore((s) => s.requestCapture);

  const cls = 'toolbar' + (mobile ? ' mobile' : '');

  return (
    <div className={cls} role="toolbar" aria-label="Controale vizualizare">
      <div className="segmented" role="radiogroup" aria-label="Mod vizualizare">
        <button
          type="button"
          role="radio"
          aria-checked={viewMode === 'perspective'}
          className={'segment' + (viewMode === 'perspective' ? ' active' : '')}
          title="Vizualizare 3D (perspectivă)"
          onClick={() => setViewMode('perspective')}
        >
          <Icon name="perspective" /><span className="seg-label">3D</span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={viewMode === 'front'}
          className={'segment' + (viewMode === 'front' ? ' active' : '')}
          title="Vizualizare frontală"
          onClick={() => setViewMode('front')}
        >
          <Icon name="front" /><span className="seg-label">Frontal</span>
        </button>
      </div>
      <span className="toolbar-sep" />
      <button type="button" className={'tool-btn' + (doorsOpen ? ' active' : '')} aria-pressed={doorsOpen} title="Deschide / închide ușile în scenă" onClick={toggleDoors}>
        <Icon name="door" /><span className="seg-label">{doorsOpen ? 'Uși deschise' : 'Uși închise'}</span>
      </button>
      <button type="button" className={'tool-btn' + (showMeasurements ? ' active' : '')} aria-pressed={showMeasurements} title="Afișează / ascunde dimensiunile" onClick={toggleMeasurements}>
        <Icon name="ruler" /><span className="seg-label">Dimensiuni</span>
      </button>
      <button type="button" className={'tool-btn' + (showStyling ? ' active' : '')} aria-pressed={showStyling} title="Afișează / ascunde accesorii (umerașe, organizatoare)" onClick={toggleStyling}>
        <Icon name="layers" /><span className="seg-label">Accesorii</span>
      </button>
      <button type="button" className={'tool-btn' + (showLighting ? ' active' : '')} aria-pressed={showLighting} title="Afișează / ascunde lumina de ambianță" onClick={toggleLighting}>
        <Icon name="bulb" /><span className="seg-label">Lumină</span>
      </button>
      <span className="toolbar-sep" />
      <button type="button" className="tool-btn" title="Încadrează dulapul în vizualizare" onClick={requestFit}>
        <Icon name="fit" /><span className="seg-label">Încadrează</span>
      </button>
      <button
        type="button"
        className="tool-btn"
        title="Salvează o captură PNG a vizualizării"
        onClick={requestCapture}
      >
        <Icon name="camera" /><span className="seg-label">Captură</span>
      </button>
    </div>
  );
}
