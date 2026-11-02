import { Capacitor } from '@capacitor/core';
import { useEffect, useRef } from 'react';

// One Google AdSense banner. Shown on the website only, on Home and the Calendar, never beside
// stotrams, songs, pooja steps, japa or deeksha. It stays empty until the AdSense publisher and slot
// ids are set at build time (VITE_ADSENSE_CLIENT / VITE_ADSENSE_SLOT). Ads are non-personalized, and
// what may be shown (no adult, dating, gambling, alcohol, meat, other religions...) is set in the
// AdSense account itself: see docs/ads-setup.md. The store apps cannot carry AdSense; they would use AdMob.

const client = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined;
const slot = import.meta.env.VITE_ADSENSE_SLOT as string | undefined;
const enabled = !!client && !!slot && !Capacitor.isNativePlatform();

type AdsQueue = unknown[] & { requestNonPersonalizedAds?: number };
declare global { interface Window { adsbygoogle?: AdsQueue } }

let loading: HTMLScriptElement | undefined;
function loadScript() {
  if (loading) return;
  const ads: AdsQueue = (window.adsbygoogle ??= []);
  ads.requestNonPersonalizedAds = 1;
  loading = document.createElement('script');
  loading.async = true;
  loading.crossOrigin = 'anonymous';
  loading.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  document.head.appendChild(loading);
}

export function AdSlot() {
  const ref = useRef<HTMLModElement>(null);
  useEffect(() => {
    if (!enabled || !ref.current || ref.current.dataset.adsbygoogleStatus) return;
    loadScript();
    try { window.adsbygoogle!.push({}); } catch { /* blocked by an ad blocker: leave the space empty */ }
  }, []);
  if (!enabled) return null;
  return (
    <div className="ad-slot">
      <ins ref={ref} className="adsbygoogle" style={{ display: 'block' }} data-ad-client={client} data-ad-slot={slot} data-ad-format="horizontal" data-full-width-responsive="true" />
    </div>
  );
}
