import { lazy, Suspense, useEffect } from 'react';
import { isUnnamedPlace, placeNameFor, upgradedName } from '../data/geocode';
import { getState, recompute, updateSettings, useStore } from '../data/store';
import { useT } from '../i18n';
import { AskScreen } from './Ask';
import { CalendarScreen } from './Calendar';
import { Icon } from './components';
import { EventsScreen } from './Events';
import { HomeScreen } from './Home';
import { HoroscopeScreen } from './Horoscope';
import { MuhurtamScreen } from './Muhurtam';
import { LoginScreen } from './Account';
import { Onboarding } from './Onboarding';
import { startNativeReminders } from './nativeReminders';
import { startWidget } from './widgetBridge';
import { useReminderRunner } from './reminderRunner';
import { useAccount } from '../sync/sync';
import { go, useRoute, type Route } from './router';
import { SettingsScreen } from './Settings';
import { asset } from '../data/asset';

// The Pooja tab carries long texts, so it loads when first opened.
const PoojasScreen = lazy(() => import('./Poojas').then((m) => ({ default: m.PoojasScreen })));
const SongsScreen = lazy(() => import('./Songs').then((m) => ({ default: m.SongsScreen })));
const StotramScreen = lazy(() => import('./Stotram').then((m) => ({ default: m.StotramScreen })));

// Five tabs fit a phone without crowding. Songs live under Pooja, and Ask is the question box on Home.
const TABS: Array<'home' | 'calendar' | 'events' | 'pooja' | 'astro'> = ['home', 'calendar', 'events', 'pooja', 'astro'];
const TAB_OF: Partial<Record<Route['tab'], (typeof TABS)[number]>> = { muhurtam: 'calendar', stotram: 'pooja', songs: 'pooja', ask: 'home' };

export function App() {
  const route = useRoute();
  const settings = useStore((s) => s.settings);
  const { t } = useT();
  const account = useAccount();
  const [toast, closeToast] = useReminderRunner();

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'system') delete root.dataset.theme; else root.dataset.theme = settings.theme;
    root.dataset.size = settings.textSize;
    root.lang = settings.lang;
  }, [settings.theme, settings.textSize, settings.lang]);

  // Refresh calculations on launch (picks up new days, engine updates, time-zone moves).
  useEffect(() => { recompute(); startNativeReminders(); startWidget(); }, []);

  // Older saves stored device locations as raw coordinates; give them a readable name.
  useEffect(() => {
    const { place } = getState().settings;
    const fuller = upgradedName(place);
    if (fuller) return updateSettings({ place: { ...place, name: fuller } });
    if (!isUnnamedPlace(place.name)) return;
    placeNameFor(place.lat, place.lon).then((name) => {
      const current = getState().settings.place;
      if (current.lat === place.lat && current.lon === place.lon) updateSettings({ place: { ...current, name } });
    });
  }, []);

  if (!settings.onboarded) return <Onboarding />;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand"><img src={asset('/icon.svg')} alt="" /> Sanathani</div>
          <div className="topbar-actions">
            <button className="place" onClick={() => go({ tab: 'settings' })} aria-label={`Location: ${settings.place.name}. Change in settings`}>
              📍 {settings.place.name}
            </button>
            {account.status === 'signed-in' ? (
              <button className="me" onClick={() => go({ tab: 'settings' })} aria-label={`${t('account')}: ${account.user?.name ?? account.user?.email ?? ''}`} title={account.user?.email}>
                {(account.user?.name ?? account.user?.email ?? '?')[0].toUpperCase()}
              </button>
            ) : account.status !== 'loading' && route.tab !== 'login' && (
              <button className="signin" onClick={() => go({ tab: 'login' })}>{t('signIn')}</button>
            )}
            <button className="gear" onClick={() => go({ tab: 'settings' })} aria-label={t('settings')} aria-current={route.tab === 'settings' ? 'page' : undefined}>
              <Icon name="settings" />
            </button>
          </div>
        </div>
      </header>
      <nav className="nav" aria-label="Main">
        <div className="nav-inner">
          {TABS.map((tab) => (
            <button key={tab} aria-current={(TAB_OF[route.tab] ?? route.tab) === tab ? 'page' : undefined} onClick={() => go({ tab } as Route)}>
              <Icon name={tab} />
              <span>{t(tab)}</span>
            </button>
          ))}
        </div>
      </nav>
      <main>
        {route.tab === 'home' && <HomeScreen />}
        {route.tab === 'calendar' && <CalendarScreen initialDate={route.date} />}
        {route.tab === 'events' && <EventsScreen id={route.id} edit={route.edit} draft={route.draft} />}
        {route.tab === 'astro' && <HoroscopeScreen />}
        {route.tab === 'muhurtam' && <MuhurtamScreen key={route.activity ?? ''} initialActivity={route.activity} />}
        <Suspense fallback={<p className="muted">Loading…</p>}>
          {route.tab === 'pooja' && <PoojasScreen id={route.id} />}
          {route.tab === 'stotram' && <StotramScreen id={route.id} />}
          {route.tab === 'songs' && <SongsScreen deity={route.deity} song={route.song} />}
        </Suspense>
        {route.tab === 'login' && <LoginScreen />}
        {route.tab === 'ask' && <AskScreen initial={route.q} />}
        {route.tab === 'settings' && <SettingsScreen />}
      </main>
      {toast && (
        <div className="toast" role="status">
          <div className="grow"><strong>🔔 {toast.title}</strong><div className="small">{toast.body}</div></div>
          {(toast.eventId || toast.route) && <button onClick={() => { go(toast.route ?? { tab: 'events', id: toast.eventId! }); closeToast(); }}>Open</button>}
          <button onClick={closeToast} aria-label="Dismiss">✕</button>
        </div>
      )}
    </div>
  );
}
