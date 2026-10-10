import { useEffect } from 'react';
import Header from './Header';
import LeftPanel from './LeftPanel';
import Inspector from './Inspector';
import Footer from './Footer';
import Toasts from './Toasts';
import DemoBanner from './DemoBanner';
import Scene from '../three/Scene';
import { useAppStore } from '../state/store';

export default function App() {
  useEffect(() => {
    // Keyboard shortcuts: undo / redo.
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        useAppStore.getState().undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        useAppStore.getState().redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      <Header />
      <DemoBanner />
      <div className="workspace">
        <LeftPanel />
        <main className="stage">
          <Scene />
        </main>
        <Inspector />
      </div>
      <Footer />
      <Toasts />
    </div>
  );
}
