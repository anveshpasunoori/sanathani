import { useEffect, useState } from 'react';
import { MANTRAS } from '../data/sadhana';
import { setState, useStore } from '../data/store';
import type { AppState } from '../data/types';
import { addDays, todayIn } from '../engine/tz';
import { useScript, useText } from '../i18n';
import { DAILY_TEXT } from '../locales/daily';
import { Card } from './components';
import { go } from './router';

// Japa counter: one tap per name, a soft chime and a longer buzz at every 108. The day's total is kept on
// this phone; there are no streaks — a missed day is just a day.

const SOUND_KEY = 'sanathani:japa-sound';
const ROUND = 108;
type Japa = NonNullable<AppState['japa']>;
const EMPTY: Japa = { mantra: MANTRAS[0].id, count: 0, byDay: {} };

let audio: AudioContext | undefined;
/** A small temple-bell chime made with the Web Audio API (no sound file needed). */
function chime() {
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime;
    for (const [freq, gain] of [[880, 0.25], [1320, 0.12], [1760, 0.06]] as const) {
      const o = audio.createOscillator(); const g = audio.createGain();
      o.frequency.value = freq; o.type = 'sine';
      g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 2.3);
    }
  } catch { /* no audio on this device */ }
}
const buzz = (ms: number) => { try { navigator.vibrate?.(ms); } catch { /* not supported */ } };

export function JapaScreen() {
  const { x } = useText(DAILY_TEXT);
  const { lang, sa } = useScript();
  const japa = useStore((s) => s.japa) ?? EMPTY;
  const tz = useStore((s) => s.settings.place.tz);
  const today = todayIn(tz);
  const [sound, setSound] = useState(() => { try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; } });
  useEffect(() => { try { localStorage.setItem(SOUND_KEY, sound ? 'on' : 'off'); } catch { /* ignore */ } }, [sound]);

  const set = (patch: Partial<Japa>) => setState((s) => ({ ...s, japa: { ...(s.japa ?? EMPTY), ...patch } }));
  function tap() {
    const count = japa.count + 1;
    // Keep the last two months of daily totals.
    const cutoff = addDays(today, -60);
    const byDay = Object.fromEntries(Object.entries({ ...japa.byDay, [today]: (japa.byDay[today] ?? 0) + 1 }).filter(([d]) => d >= cutoff));
    set({ count, byDay });
    if (count % ROUND === 0) { if (sound) { chime(); buzz(300); } } else if (sound) buzz(12);
  }

  const round = japa.count % ROUND === 0 && japa.count > 0 ? ROUND : japa.count % ROUND;
  const todayCount = japa.byDay[today] ?? 0;
  const chosen = MANTRAS.find((m) => m.id === japa.mantra);
  const words = chosen ? (lang === 'en' ? chosen.en : sa(chosen.te)) : japa.custom || x('customMantra');

  return (
    <>
      <button className="btn ghost" onClick={() => go({ tab: 'home' })}>← {x('dailyPractice')}</button>
      <Card title={x('japaTitle')}>
        <p className="small muted" style={{ marginTop: 0 }}>{x('japaIntro')}</p>
        <label className="field">{x('mantra')}
          <select value={japa.mantra} onChange={(e) => set({ mantra: e.target.value })}>
            {MANTRAS.map((m) => <option key={m.id} value={m.id}>{lang === 'en' ? m.en : sa(m.te)}</option>)}
            <option value="custom">{x('customMantra')}</option>
          </select>
        </label>
        {japa.mantra === 'custom' && (
          <label className="field">{x('customMantra')}
            <input value={japa.custom ?? ''} onChange={(e) => set({ custom: e.target.value })} placeholder={x('customPh')} />
          </label>
        )}
      </Card>
      <div className="japa">
        <button className="japa-bead" onClick={tap} aria-label={`${x('tapToCount')} — ${x('round', { n: round })}`}>
          <span className="japa-words">{words}</span>
          <span className="japa-count">{round}</span>
          <span className="small muted">{x('round', { n: round })}</span>
        </button>
        <div className="row" style={{ justifyContent: 'center' }}>
          <span className="small">{x('todayTotal', { n: todayCount })} · {x('malas', { n: Math.floor(todayCount / ROUND) })}</span>
        </div>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn small" onClick={() => set({ count: 0 })}>{x('resetRound')}</button>
          <label className="radio small"><input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> {x('chime')}</label>
        </div>
      </div>
    </>
  );
}
