import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register Service Worker for offline-first PWA caching
registerSW({
  immediate: true,
  onRegisterError() {
    // Gracefully ignore SW registration failures in restricted contexts
  },
});

createRoot(document.getElementById('root')!).render(<App />);
