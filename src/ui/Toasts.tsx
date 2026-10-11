// Toast notifications, clickable to dismiss, polite live region.

import { useAppStore } from '../state/store';
import { Icon } from './uiHelpers';

export default function Toasts() {
  const toasts = useAppStore((s) => s.toasts);
  const dismiss = useAppStore((s) => s.dismissToast);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <button key={t.id} type="button" className={`toast ${t.kind}`} onClick={() => dismiss(t.id)}>
          <span>{t.text}</span>
          <Icon name="close" size={12} />
        </button>
      ))}
    </div>
  );
}
