// Small shared UI building blocks: icons, draft inputs, material thumbnails.
// Icons are original, hand-drawn inline SVG (stroke style, 24x24 grid).

import { useEffect, useRef, useState } from 'react';

/** mm to cm for user-facing labels. */
export function mmToCm(mm: number): string {
  const cm = mm / 10;
  return Number.isInteger(cm) ? String(cm) : cm.toFixed(1);
}

export type IconName =
  | 'undo' | 'redo' | 'reset' | 'download' | 'upload' | 'file' | 'info' | 'printer'
  | 'camera' | 'ruler' | 'layers' | 'bulb' | 'door' | 'fit' | 'plus' | 'minus'
  | 'trash' | 'front' | 'perspective' | 'edit' | 'close' | 'check' | 'shelf' | 'rail' | 'drawers';

const PATHS: Record<IconName, string> = {
  undo: 'M9 14 4 9l5-5 M4 9h10a6 6 0 0 1 0 12h-3',
  redo: 'M15 14l5-5-5-5 M20 9H10a6 6 0 0 0 0 12h3',
  reset: 'M3 12a9 9 0 1 0 3-6.7 M3 3v5h5',
  download: 'M12 3v12 M6 11l6 6 6-6 M4 21h16',
  upload: 'M12 21V9 M6 13l6-6 6 6 M4 3h16',
  file: 'M6 2h8l5 5v15H6z M14 2v5h5 M9 13h7 M9 17h7',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 8h.01 M11 12h1v5h1',
  printer: 'M6 9V3h12v6 M6 18H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2 M6 14h12v7H6z',
  camera: 'M4 7h3l2-2h6l2 2h3v13H4z M12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  ruler: 'M3 17 17 3l4 4L7 21z M8 16l2 2 M11 13l2 2 M14 10l2 2 M17 7l2 2',
  layers: 'M12 3 3 8l9 5 9-5-9-5z M3 13l9 5 9-5 M3 17.5l9 5 9-5',
  bulb: 'M9 18h6 M10 21h4 M12 3a6 6 0 0 0-3.5 10.9c.7.5 1 1.3 1 2.1h5c0-.8.3-1.6 1-2.1A6 6 0 0 0 12 3z',
  door: 'M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17 M3 21h18 M15 12h.01',
  fit: 'M4 9V4h5 M15 4h5v5 M20 15v5h-5 M9 20H4v-5',
  plus: 'M12 5v14 M5 12h14',
  minus: 'M5 12h14',
  trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 14h10l1-14 M10 11v6 M14 11v6',
  front: 'M4 5h16v14H4z M12 5v14',
  perspective: 'M4 6l7-2 9 2v13l-9 2-7-2z M11 4v16',
  edit: 'M4 20h4L19 9l-4-4L4 16v4z M13 6l4 4',
  close: 'M6 6l12 12 M18 6 6 18',
  check: 'M4 12l5 5L20 7',
  shelf: 'M3 5h18v14H3z M3 12h18 M7 8v1 M7 15v1',
  rail: 'M4 8h16 M8 8v3a4 4 0 0 0 8 0V8 M12 15v4',
  drawers: 'M4 4h16v16H4z M4 10h16 M4 16h16 M11 7h2 M11 13h2 M11 19h2',
};

export function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Number input with draft semantics: the user can type freely; the value is
 *  applied on blur or Enter, never on each keystroke (no editing jumps). */
export function DraftNumberInput(props: {
  value: number; // in the unit shown (cm)
  min: number;
  max: number;
  onApply: (v: number) => void;
  ariaLabel: string;
  id?: string;
  disabled?: boolean;
}) {
  const { value, min, max, onApply, ariaLabel, id, disabled } = props;
  const fmt = (v: number) => String(Math.round(v * 10) / 10);
  const [text, setText] = useState(fmt(value));
  const [editing, setEditing] = useState(false);
  const latest = useRef(value);
  latest.current = value;
  useEffect(() => {
    if (!editing) setText(fmt(value));
  }, [value, editing]);

  const apply = () => {
    const parsed = Number(text.replace(',', '.'));
    if (Number.isNaN(parsed)) {
      setText(fmt(latest.current));
    } else {
      const clamped = Math.min(max, Math.max(min, parsed));
      if (clamped !== latest.current) onApply(clamped);
      setText(fmt(clamped));
    }
    setEditing(false);
  };

  return (
    <input
      id={id}
      className="draft-input"
      type="text"
      inputMode="decimal"
      disabled={disabled}
      aria-label={ariaLabel}
      value={text}
      onFocus={() => setEditing(true)}
      onChange={(e) => { setEditing(true); setText(e.target.value); }}
      onBlur={apply}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.currentTarget.blur(); }
        if (e.key === 'Escape') { setText(fmt(latest.current)); setEditing(false); e.currentTarget.blur(); }
      }}
    />
  );
}

export interface MaterialDef {
  /** Finish code in the demo catalog. */
  code: string;
  label: string;
  /** Thumbnail under /assets/materials/<key>/thumb.webp; falls back to color. */
  thumb: string | null;
  fallbackHex: string;
}

const MATERIAL_THUMBS: Record<string, string> = {
  'DEMO-wood-oak': '/assets/materials/oak/thumb.webp',
  'DEMO-wood-walnut': '/assets/materials/walnut/thumb.webp',
  'DEMO-wood-smoked': '/assets/materials/smoked-oak/thumb.webp',
};

/** Builds the material card list from the demo catalog. Wood finishes point at
 *  the shared thumbnail assets; lacquers use their flat demo color. */
export function materialDefs(): MaterialDef[] {
  const order = ['DEMO-wood-walnut', 'DEMO-wood-oak', 'DEMO-wood-smoked', 'DEMO-lacquer-white', 'DEMO-lacquer-graphite'];
  const labels: Record<string, string> = {
    'DEMO-wood-walnut': 'Nuc',
    'DEMO-wood-oak': 'Stejar',
    'DEMO-wood-smoked': 'Stejar fumuriu',
    'DEMO-lacquer-white': 'Alb mat',
    'DEMO-lacquer-graphite': 'Grafit',
  };
  return order.map((code) => ({
    code,
    label: labels[code],
    thumb: MATERIAL_THUMBS[code] ?? null,
    fallbackHex: code === 'DEMO-lacquer-white' ? '#f2f0eb' : code === 'DEMO-lacquer-graphite' ? '#3a3d40' : code === 'DEMO-wood-walnut' ? '#5d4432' : code === 'DEMO-wood-oak' ? '#c8a26a' : '#8a6844',
  }));
}

/** Material thumbnail image with graceful color fallback if the asset is missing. */
export function MaterialThumb({ def }: { def: MaterialDef }) {
  const [failed, setFailed] = useState(false);
  if (def.thumb && !failed) {
    return <img className="material-thumb" src={def.thumb} alt="" onError={() => setFailed(true)} draggable={false} />;
  }
  return <span className="material-thumb" style={{ background: def.fallbackHex }} aria-hidden="true" />;
}
