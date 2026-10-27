import { Capacitor } from '@capacitor/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { startAccount } from './sync/sync';
import { App } from './ui/App';
import './styles.css';

startAccount();
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

// The store apps bundle their files, so the offline service worker is only for the web version.
if ('serviceWorker' in navigator && import.meta.env.PROD && !Capacitor.isNativePlatform()) {
  navigator.serviceWorker.register('/sw.js').catch(() => { /* offline support unavailable */ });
}
