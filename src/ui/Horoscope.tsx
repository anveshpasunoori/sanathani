import { useMemo, useState } from 'react';
import { deleteProfile, saveProfile, setState, uid, useStore } from '../data/store';
import type { BirthProfile } from '../data/types';
import {
  chandrashtamaPeriods, dailyReading, dashaReading, goodDays, grahaName, grahaShort, horoscopeAssumptions, taraName, TONE_LABEL, transits,
  type Insight,
} from '../engine/horoscope';
import { birthChart, nakshatraLord, type BirthChart, type Graha } from '../engine/jyotish';
import { nakshatraName, rashiName, type Lang } from '../engine/names';
import { addDays, civilDateOf as civilOf, formatCivil, formatTime, parseCivil, todayIn, zonedToUtc } from '../engine/tz';
import { LOCALE, useText } from '../i18n';
import { astroLabel } from '../locales/astro';
import { relationLabel } from '../locales/common';
import { HOROSCOPE_TEXT } from '../locales/horoscope';
import { HOROSCOPE_INTRO_TEXT } from '../locales/horoscopeIntro';
import { Card, DateFields } from './components';
import { go } from './router';
import { JathakaCard } from './JathakaCard';
import { ChartReadingView } from './ChartReading';
import { ChartSummaryCard } from './ChartSummary';
import { hasReadingText } from '../locales/reading';
import { LifeThemesView } from './LifeThemes';
import { MatchingView } from './Matching';
import { PlacePicker } from './PlacePicker';

export function chartFor(p: BirthProfile): BirthChart {
  const { y, m, d } = parseCivil(p.date);
  const [hh, mm] = (p.time ?? '12:00').split(':').map(Number);
  return birthChart({ instant: zonedToUtc(y, m, d, hh, mm, p.place.tz), lat: p.place.lat, lon: p.place.lon, timeKnown: !!p.time });
}

export function HoroscopeScreen() {
  const profiles = useStore((s) => s.profiles);
  const activeProfile = useStore((s) => s.activeProfile);
  const settings = useStore((s) => s.settings);
  const [editing, setEditing] = useState<BirthProfile | 'new' | null>(null);
  const [mode, setMode] = useState<'reading' | 'chart' | 'themes' | 'match'>('reading');
  const { lang, x } = useText(HOROSCOPE_TEXT);
  const active = profiles.find((p) => p.id === activeProfile) ?? profiles[0];

  if (editing) {
    return <ProfileForm initial={editing === 'new' ? undefined : editing} defaultPlace={settings.place} onDone={() => setEditing(null)} canCancel />;
  }
  // Birth details are never required: without them the tab explains what they unlock and lets people move on.
  if (!active) return <HoroscopeIntro onAdd={() => setEditing('new')} />;

  return (
    <>
      <div className="segmented" role="group" aria-label={x('view')}>
        <button aria-pressed={mode === 'reading'} onClick={() => setMode('reading')}>{x('horoscope')}</button>
        <button aria-pressed={mode === 'chart'} onClick={() => setMode('chart')}>{x('chartTab')}</button>
        <button aria-pressed={mode === 'themes'} onClick={() => setMode('themes')}>{x('lifeThemes')}</button>
        <button aria-pressed={mode === 'match'} onClick={() => setMode('match')}>{x('matching')}</button>
      </div>
      {/* Readings and matching are written for the languages in src/locales/reading.ts and match.ts. */}
      {lang !== 'en' && lang !== 'te' && !hasReadingText(lang) && <p className="tiny muted">{x('contentNote')}</p>}
      {mode === 'match' ? <MatchingView profiles={profiles} lang={lang} onAdd={() => setEditing('new')} /> : <>
      <div className="row" role="tablist" aria-label={x('person')}>
        {profiles.map((p) => (
          <button key={p.id} className="chip" role="tab" aria-selected={p.id === active.id} aria-pressed={p.id === active.id}
            onClick={() => setState((s) => ({ ...s, activeProfile: p.id }))}>{p.name}</button>
        ))}
        <button className="chip" onClick={() => setEditing('new')}>+ {x('addPerson')}</button>
      </div>
      {mode === 'themes' ? <LifeThemesView profile={active} lang={lang} /> : mode === 'chart' ? <ChartReadingView profile={active} lang={lang} /> : <Reading profile={active} lang={lang} onEdit={() => setEditing(active)} onFull={() => setMode('chart')} />}
      </>}
    </>
  );
}

function HoroscopeIntro({ onAdd }: { onAdd: () => void }) {
  const { x } = useText(HOROSCOPE_INTRO_TEXT);
  return (
    <Card className="hero">
      <h2 style={{ margin: 0 }}>{x('title')}</h2>
      <p>{x('intro')}</p>
      <p className="small muted">{x('optional')}</p>
      <div className="row">
        <button className="btn primary" onClick={onAdd}>{x('add')}</button>
        <button className="btn ghost" onClick={() => go({ tab: 'home' })}>{x('notNow')}</button>
      </div>
      <p className="tiny muted" style={{ marginBottom: 0 }}>🔒 {x('privacy')}</p>
    </Card>
  );
}

function Reading({ profile, lang, onEdit, onFull }: { profile: BirthProfile; lang: Lang; onEdit: () => void; onFull: () => void }) {
  const place = useStore((s) => s.settings.place);
  const tz = place.tz;
  const today = todayIn(tz);
  const [offset, setOffset] = useState(0);
  const date = addDays(today, offset);
  const loc = LOCALE[lang];
  const { x } = useText(HOROSCOPE_TEXT);

  const chart = useMemo(() => chartFor(profile), [profile]);
  const day = useMemo(() => dailyReading(chart, date, place, lang), [chart, date, place, lang]);
  const now = useMemo(() => new Date(), [today]);
  const good = useMemo(() => goodDays(chart, today, 30, place), [chart, today, place]);
  const ashtama = useMemo(() => chandrashtamaPeriods(chart, now, 30), [chart, now]);
  const big = useMemo(() => transits(chart, now, lang), [chart, now, lang]);
  const dasha = useMemo(() => dashaReading(chart, now, lang), [chart, now, lang]);
  const moon = chart.moon;

  return (
    <>
      <Card className="hero">
        <div className="row">
          <div className="grow">
            <div className="greg">{profile.name}</div>
            <div className="lunar">{x('rashiOf', { rashi: rashiName(moon.rashi, lang) })} · {nakshatraName(moon.nakshatra, lang)} {x('pada', { n: moon.pada })}</div>
            <div className="muted small">
              {chart.lagna ? <>{x('lagna')}: {rashiName(chart.lagna.rashi, lang)} · </> : null}
              {formatCivil(profile.date, loc)}{profile.time ? ` ${profile.time}` : ''} · {profile.place.name}
            </div>
          </div>
          <button className="btn ghost" onClick={onEdit}>{x('edit')}</button>
        </div>
        {profile.isSample && <div className="note warn small">{x('sampleProfile')}</div>}
        {profile.eventId && !profile.time && <div className="note small">{x('fromBirthday')}</div>}
      </Card>

      <ChartSummaryCard chart={chart} lang={lang} onFull={onFull} />

      <JathakaCard profile={profile} chart={chart} />

      <Card title={x('dailyReading')} action={
        <div className="row" role="group" aria-label={x('day')}>
          {[0, 1, 2].map((o) => <button key={o} className="chip" aria-pressed={offset === o} onClick={() => setOffset(o)}>
            {o === 0 ? x('today') : o === 1 ? x('tomorrow') : formatCivil(addDays(today, 2), loc, { weekday: 'short', day: 'numeric' })}
          </button>)}
        </div>}>
        <div className={`tone tone-${day.tone}`}>
          <span aria-hidden="true">{day.tone === 'favourable' ? '🌞' : day.tone === 'steady' ? '🌤️' : '🌙'}</span>
          <strong>{astroLabel(TONE_LABEL[day.tone], lang, (l) => l.tone[day.tone])}</strong>
          <span className="muted small">{formatCivil(date, loc, { weekday: 'long', day: 'numeric', month: 'short' })}</span>
        </div>
        <InsightList items={day.insights} />
        {day.laterTara && (
          <p className="small muted">
            {x('laterTara', { time: formatTime(day.laterTara.from, tz, loc), tara: taraName(day.laterTara.tara.number, lang) })}
            {` — ${x(day.laterTara.tara.good ? 'favourable' : 'goGently')}.`}
          </p>
        )}
        <div className="kv small">
          <span className="muted">{x('moonToday')}</span><span>{rashiName(day.moonRashi, lang)}</span>
          <span className="muted">{x('colour')}</span><span>{day.color}</span>
          <span className="muted">{x('deity')}</span><span>{day.deity}</span>
        </div>
      </Card>

      <Card title={x('next30')}>
        <strong className="small">{x('favDays')}</strong>
        <div className="row">
          {good.length ? good.slice(0, 12).map((d) => <span key={d} className="chip good">{formatCivil(d, loc, { weekday: 'short', day: 'numeric', month: 'short' })}</span>)
            : <span className="small muted">{x('steadyMonth')}</span>}
        </div>
        {ashtama.length > 0 && <>
          <strong className="small">{x('ashtama')}</strong>
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
            {ashtama.map((a) => <li key={a.start.toISOString()}>{fmtDT(a.start, tz, loc)} → {fmtDT(a.end, tz, loc)}</li>)}
          </ul>
          <p className="tiny muted">{x('ashtamaNote')}</p>
        </>}
      </Card>

      <Card title={x('transits')}>
        <ul className="insights">
          {big.map((g) => (
            <li key={g.graha} className={g.tone}>
              <div className="ins-head">
                <strong>{g.title}</strong>
                <span className="small muted">{x('inHouse', { rashi: rashiName(g.rashi, lang), nth: lang === 'en' ? `${g.house}${sfx(g.house)}` : g.house })}</span>
              </div>
              {g.special && <span className="badge">{g.special}</span>}
              <p>{g.text}</p>
              {g.tip && <p className="tip">🙏 {g.tip}</p>}
              {g.until && g.nextRashi !== undefined && (
                <p className="tiny muted">{x('movesTo', { rashi: rashiName(g.nextRashi, lang), date: formatCivil(civilOf(g.until, tz), loc) })}</p>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {dasha && (
        <Card title={x('dasha')}>
          <p className="lunar" style={{ margin: 0 }}>{grahaName(dasha.maha.lord, lang)} / {grahaName(dasha.antar.lord, lang)}</p>
          <p className="small muted" style={{ margin: 0 }}>
            {x('mahaDasha')} {yr(dasha.maha.start)}–{yr(dasha.maha.end)} · {x('antarUntil')} {formatCivil(civilOf(dasha.antar.end, tz), loc)}
          </p>
          <p>{dasha.text}</p>
          <p className="tip small">✨ {dasha.tip}</p>
          <details>
            <summary className="small">{x('allMaha')}</summary>
            <ul className="small" style={{ paddingLeft: 18 }}>
              {dasha.periods.map((p) => <li key={p.lord} style={p.lord === dasha.maha.lord ? { fontWeight: 600 } : undefined}>{grahaName(p.lord, lang)}: {yr(p.start)} – {yr(p.end)}</li>)}
            </ul>
            <p className="tiny muted">{x('starLord')}: {grahaName(nakshatraLord(moon.nakshatra), lang)}</p>
          </details>
        </Card>
      )}

      <ChartCard chart={chart} lang={lang} />

      <div className="note info small">
        {x('disclaimer')}
      </div>
      <details className="small muted">
        <summary>{x('how')}</summary>
        <ul style={{ paddingLeft: 18 }}>{horoscopeAssumptions(lang).map((a) => <li key={a}>{a}</li>)}</ul>
        <p>{x('ayanamsa', { v: dms(chart.ayanamsa) })}</p>
      </details>
    </>
  );
}

function InsightList({ items }: { items: Insight[] }) {
  return (
    <ul className="insights">
      {items.map((i) => (
        <li key={i.title} className={i.tone}>
          <strong>{i.tone === 'good' ? '✅ ' : '🔸 '}{i.title}</strong>
          <p>{i.text}</p>
          {i.tip && <p className="tip">💡 {i.tip}</p>}
        </li>
      ))}
    </ul>
  );
}

// South Indian chart: signs fixed in a 4×4 ring, Meena at top-left.
const SOUTH: Array<number | null> = [11, 0, 1, 2, 10, null, null, 3, 9, null, null, 4, 8, 7, 6, 5];

function ChartCard({ chart, lang }: { chart: BirthChart; lang: Lang }) {
  const [d9, setD9] = useState(false);
  const { x } = useText(HOROSCOPE_TEXT);
  const signOf = (p: { rashi: number; navamsa: number }) => (d9 ? p.navamsa : p.rashi);
  const inSign = (r: number) => chart.grahas.filter((g) => signOf(g) === r);
  return (
    <Card title={x('birthChart')} action={
      <div className="row" role="group" aria-label={x('birthChart')}>
        <button className="chip" aria-pressed={!d9} onClick={() => setD9(false)}>{x('rasi')}</button>
        <button className="chip" aria-pressed={d9} onClick={() => setD9(true)}>{x('navamsa')}</button>
      </div>}>
      <div className="jchart" role="img" aria-label={x('chartLabel', { chart: x(d9 ? 'navamsa' : 'rasi') })}>
        {SOUTH.map((r, i) => {
          if (r === null) return i === 5 ? <div key={i} className="jcenter">{x(d9 ? 'navamsa' : 'rasi')}<br /><span className="tiny muted">{x('southIndian')}</span></div> : null;
          const lagnaHere = chart.lagna && signOf(chart.lagna) === r;
          return (
            <div key={i} className={`jcell${lagnaHere ? ' lagna' : ''}`}>
              <span className="jsign">{rashiName(r, lang)}</span>
              <span className="jplanets">
                {lagnaHere && <b>{x('la')}</b>}
                {inSign(r).map((g) => <span key={g.graha}>{grahaShort(g.graha, lang)}{g.retro && g.graha !== 'rahu' && g.graha !== 'ketu' ? '℞' : ''}</span>)}
              </span>
            </div>
          );
        })}
      </div>
      {!chart.timeKnown && <p className="small muted">{x('noTime')}</p>}
      <div className="table-wrap">
        <table className="ptable small">
          <thead><tr><th>{x('graha')}</th><th>{x('sign')}</th><th>{x('degree')}</th><th>{x('nakshatra')}</th>{chart.lagna && <th>{x('house')}</th>}</tr></thead>
          <tbody>
            {chart.lagna && <tr><td>{x('lagna')}</td><td>{rashiName(chart.lagna.rashi, lang)}</td><td>{dms(chart.lagna.degInSign)}</td><td>{nakshatraName(chart.lagna.nakshatra, lang)}-{chart.lagna.pada}</td><td>1</td></tr>}
            {chart.grahas.map((g) => (
              <tr key={g.graha}>
                <td>{grahaName(g.graha as Graha, lang)}{g.retro && g.graha !== 'rahu' && g.graha !== 'ketu' ? ' ℞' : ''}</td>
                <td>{rashiName(g.rashi, lang)}</td><td>{dms(g.degInSign)}</td><td>{nakshatraName(g.nakshatra, lang)}-{g.pada}</td>
                {chart.lagna && <td>{g.house}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ProfileForm({ initial, defaultPlace, onDone, canCancel }: { initial?: BirthProfile; defaultPlace: BirthProfile['place']; onDone: () => void; canCancel: boolean }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [relation, setRelation] = useState(initial?.relation ?? 'Self');
  const { lang, x } = useText(HOROSCOPE_TEXT);
  const [date, setDate] = useState(initial?.date ?? '');
  const [time, setTime] = useState(initial?.time ?? '');
  const [unknownTime, setUnknownTime] = useState(!!initial && !initial.time);
  const [place, setPlace] = useState(initial?.place ?? defaultPlace);
  const [error, setError] = useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError(x('errName'));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError(x('errDate'));
    if (!unknownTime && !time) return setError(x('errTime'));
    saveProfile({ id: initial?.id ?? uid(), eventId: initial?.eventId, name: name.trim(), relation, date, time: unknownTime ? undefined : time, place });
    onDone();
  };
  return (
    <Card title={x(initial ? 'editBirth' : 'birthDetails')}>
      <form className="stack" onSubmit={submit}>
        <div className="grid2">
          <label className="field">{x('name')}<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" /></label>
          <label className="field">{x('relationship')}
            <select value={relation} onChange={(e) => setRelation(e.target.value)}>
              {(PROFILE_RELATIONS.includes(relation) ? PROFILE_RELATIONS : [...PROFILE_RELATIONS, relation]).map((r) => <option key={r} value={r}>{r === 'Spouse' ? x('spouse') : r === 'Marriage proposal' ? x('proposal') : relationLabel(r, lang)}</option>)}
            </select>
          </label>
        </div>
        <DateFields lang={lang} label={x('dob')} value={date} onChange={setDate} />
        <label className="field">{x('tob')}
          <input type="time" value={time} disabled={unknownTime} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label className="row small"><input type="checkbox" checked={unknownTime} onChange={(e) => setUnknownTime(e.target.checked)} /> {x('unknownTime')}</label>
        <PlacePicker value={place} onChange={setPlace} label={x('pob')} locate={false} />
        {error && <p className="note warn small" role="alert">{error}</p>}
        <div className="row">
          <button className="btn primary" type="submit">{x('save')}</button>
          {canCancel && <button className="btn" type="button" onClick={onDone}>{x('cancel')}</button>}
          {initial && <button className="btn danger" type="button" onClick={() => { if (confirm(x('confirmDelete', { name: initial.name }))) { deleteProfile(initial.id); onDone(); } }}>{x('delete')}</button>}
        </div>
        <p className="tiny muted">{x('formNote')}</p>
      </form>
    </Card>
  );
}

// Profiles were saved with these English values; the labels are translated when shown.
const PROFILE_RELATIONS = ['Self', 'Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Marriage proposal', 'Other'];
const sfx = (n: number) => (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
const yr = (d: Date) => d.getUTCFullYear();
const fmtDT = (d: Date, tz: string, loc: string) => new Intl.DateTimeFormat(loc, { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(d);
function dms(x: number) {
  const d = Math.floor(x), m = Math.floor((x - d) * 60), s = Math.floor(((x - d) * 60 - m) * 60);
  return `${d}°${String(m).padStart(2, '0')}′${String(s).padStart(2, '0')}″`;
}
