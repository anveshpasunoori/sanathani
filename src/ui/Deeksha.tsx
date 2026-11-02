import { useMemo, useState } from 'react';
import { makaraJyothi, NAVADURGA, NAVADURGA_EN, nextPeriod, PRACTICES, progress, pasuramOfDay, SADHANA_KINDS } from '../data/sadhana';
import { songListedFor, songsFor } from '../data/songs';
import { setState, useStore } from '../data/store';
import type { SadhanaKind } from '../data/types';
import { formatCivil, todayIn, type CivilDate } from '../engine/tz';
import { LOCALE, useScript, useText } from '../i18n';
import { DAILY_TEXT } from '../locales/daily';
import { Card } from './components';
import { go } from './router';

// Deekshas and sacred months: the Ayyappa Mandala (41 days from wearing the mala), Karthika Masam,
// Dhanurmasam and Devi Navaratri — the day's place in the period and a short checklist of practices.
// Kept on this phone. A missed day is simply left unticked; nothing nags.

type X = ReturnType<typeof useText<keyof typeof DAILY_TEXT.en>>['x'];
const KIND_KEY = { mandala: 'kindMandala', karthika: 'kindKarthika', dhanurmasam: 'kindDhanur', navaratri: 'kindNavaratri' } as const;
const PRACTICE_PREFIX = { mandala: 'm', karthika: 'k', dhanurmasam: 'd', navaratri: 'n' } as const;
export const kindName = (x: X, k: SadhanaKind) => x(KIND_KEY[k]);
const practice = (x: X, k: SadhanaKind, i: number) => x(`${PRACTICE_PREFIX[k]}${i + 1}` as keyof typeof DAILY_TEXT.en);
const daysBetween = (a: CivilDate, b: CivilDate) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export function useSadhana() {
  const settings = useStore((s) => s.settings);
  const sadhana = useStore((s) => s.sadhana);
  const today = todayIn(settings.place.tz);
  const active = sadhana?.active ?? [];
  const items = useMemo(() => active.map((a) => ({ ...a, p: progress(a.kind, a.start, today, settings.place, settings.tradition) })), [active, today, settings.place, settings.tradition]);
  return { items, today, checks: sadhana?.checks ?? {} };
}

export function toggleCheck(kind: SadhanaKind, day: CivilDate, i: number) {
  setState((s) => {
    const sad = s.sadhana ?? { active: [], checks: {} };
    const key = `${kind}:${day}`;
    const cur = sad.checks[key] ?? [];
    return { ...s, sadhana: { ...sad, checks: { ...sad.checks, [key]: cur.includes(i) ? cur.filter((n) => n !== i) : [...cur, i] }, updatedAt: new Date().toISOString() } };
  });
}

function start(kind: SadhanaKind, on: CivilDate) {
  setState((s) => {
    const sad = s.sadhana ?? { active: [], checks: {} };
    return { ...s, sadhana: { ...sad, active: [...sad.active.filter((a) => a.kind !== kind), { kind, start: on }], updatedAt: new Date().toISOString() } };
  });
}

function stop(kind: SadhanaKind) {
  setState((s) => {
    const sad = s.sadhana ?? { active: [], checks: {} };
    const checks = Object.fromEntries(Object.entries(sad.checks).filter(([k]) => !k.startsWith(`${kind}:`)));
    return { ...s, sadhana: { active: sad.active.filter((a) => a.kind !== kind), checks, updatedAt: new Date().toISOString() } };
  });
}

/** One running deeksha: where the reader is, today's practices and the day's song, pasuram or form of Devi. */
export function DeekshaCard({ kind, startDate, compact = false }: { kind: SadhanaKind; startDate: CivilDate; compact?: boolean }) {
  const { x, lang } = useText(DAILY_TEXT);
  const { sa } = useScript();
  const settings = useStore((s) => s.settings);
  const { today, checks } = useSadhana();
  const loc = LOCALE[lang];
  const p = progress(kind, startDate, today, settings.place, settings.tradition);
  const done = checks[`${kind}:${today}`] ?? [];
  const n = PRACTICES[kind];
  const jyothi = kind === 'mandala' ? makaraJyothi(today, settings.place) : null;
  const song = useMemo(() => {
    if (kind !== 'mandala') return undefined;
    const list = songsFor('ayyappa').filter((s) => songListedFor(s, lang));
    return list.length ? list[(Math.max(1, p.day) - 1) % list.length] : undefined;
  }, [kind, lang, p.day]);
  const running = p.day >= 1 && !p.done;

  return (
    <Card title={kindName(x, kind)} action={compact ? <button className="btn ghost small" onClick={() => go({ tab: 'deeksha' })}>→</button> : undefined}>
      {p.done ? <p style={{ marginTop: 0 }}>{x('finished', { n: p.total })}</p> : running ? (
        <>
          <div className="deeksha-bar" role="progressbar" aria-valuemin={1} aria-valuemax={p.total} aria-valuenow={p.day}><span style={{ width: `${(p.day / p.total) * 100}%` }} /></div>
          <p className="small" style={{ margin: '6px 0' }}><strong>{x('dayOf', { n: p.day, total: p.total })}</strong> · {x('daysLeft', { n: p.total - p.day })}
            {jyothi && <> · {x('untilJyothi', { n: daysBetween(today, jyothi) })}</>}</p>
        </>
      ) : <p className="small muted" style={{ marginTop: 0 }}>{x('nextRun', { from: formatCivil(p.start, loc, { day: 'numeric', month: 'short' }), to: formatCivil(p.end, loc, { day: 'numeric', month: 'short', year: 'numeric' }) })}</p>}
      {running && (
        <>
          <h3 className="small" style={{ marginBottom: 4 }}>{x('todayPractice')} <span className="muted">· {x('practiceDone', { n: done.length, total: n })}</span></h3>
          <ul className="checklist">
            {Array.from({ length: n }, (_, i) => (
              <li key={i}><label><input type="checkbox" checked={done.includes(i)} onChange={() => toggleCheck(kind, today, i)} /> {practice(x, kind, i)}</label></li>
            ))}
          </ul>
          {kind === 'mandala' && song && <p className="small" style={{ marginBottom: 0 }}>🎵 {x('songToday')}: <button className="linklike" onClick={() => go({ tab: 'songs', deity: 'ayyappa', song: song.id })}>{(song.lang ?? 'te') === lang || !song.roman ? song.title.te : song.title.en}</button></p>}
          {kind === 'dhanurmasam' && <p className="small" style={{ marginBottom: 0 }}>📖 <button className="linklike" onClick={() => go({ tab: 'stotram', id: 'thiruppavai' })}>{x('pasuram', { n: pasuramOfDay(p.day) })}</button></p>}
          {kind === 'navaratri' && p.day <= 9 && <>
            <p className="small" style={{ marginBottom: 0 }}>🪔 {x('alankaram', { name: lang === 'en' ? NAVADURGA_EN[p.day - 1] : sa(NAVADURGA[p.day - 1]) })}</p>
            {!compact && <p className="tiny muted">{x('alankaramNote')}</p>}
          </>}
        </>
      )}
      {!compact && <p className="tiny muted" style={{ marginBottom: 0 }}>{x('startedOn', { date: formatCivil(startDate, loc, { day: 'numeric', month: 'short', year: 'numeric' }) })} · <button className="linklike" onClick={() => { if (confirm(x('confirmStop'))) stop(kind); }}>{x('stopDeeksha')}</button></p>}
    </Card>
  );
}

export function DeekshaScreen() {
  const { x, lang } = useText(DAILY_TEXT);
  const settings = useStore((s) => s.settings);
  const { items, today } = useSadhana();
  const [mala, setMala] = useState(today);
  const loc = LOCALE[lang];
  const idle = SADHANA_KINDS.filter((k) => !items.some((a) => a.kind === k));
  const periods = useMemo(() => Object.fromEntries(idle.filter((k) => k !== 'mandala').map((k) => [k, nextPeriod(k as Exclude<SadhanaKind, 'mandala'>, today, settings.place, settings.tradition)])), [idle.join(), today, settings.place, settings.tradition]);

  return (
    <>
      <button className="btn ghost" onClick={() => go({ tab: 'home' })}>← {x('dailyPractice')}</button>
      <Card className="hero">
        <h2 style={{ margin: 0 }}>{x('deekshaTitle')}</h2>
        <p className="small muted" style={{ marginBottom: 0 }}>{x('deekshaIntro')}</p>
      </Card>
      {items.map((a) => <DeekshaCard key={a.kind} kind={a.kind} startDate={a.start} />)}
      {idle.map((k) => {
        const per = k === 'mandala' ? null : periods[k];
        const running = per && per.start <= today && per.end >= today;
        return (
          <Card key={k} title={kindName(x, k)}>
            {k === 'mandala' ? (
              <div className="row">
                <label className="field grow" style={{ margin: 0 }}>{x('startDate')}
                  <input type="date" value={mala} max={today} onChange={(e) => setMala(e.target.value || today)} />
                </label>
                <button className="btn primary" onClick={() => start('mandala', mala)}>{x('start')}</button>
              </div>
            ) : per ? (
              <div className="row">
                <span className="small grow">{x('nextRun', { from: formatCivil(per.start, loc, { day: 'numeric', month: 'short' }), to: formatCivil(per.end, loc, { day: 'numeric', month: 'short', year: 'numeric' }) })}</span>
                <button className="btn primary" onClick={() => start(k, running ? per.start : per.start)}>{x('start')}</button>
              </div>
            ) : null}
          </Card>
        );
      })}
    </>
  );
}
