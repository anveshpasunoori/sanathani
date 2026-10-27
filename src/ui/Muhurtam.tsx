import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../data/store';
import { displayMonth, solarLabel } from '../data/traditions';
import { LOCALE, translate, useText } from '../i18n';
import { MUHURTAM_TEXT } from '../locales/muhurtam';
import { taraName } from '../engine/horoscope';
import type { Activity } from '../engine/muhurta';
import { findMuhurtams, type MuhurtamDay, type MuhurtamWindow } from '../engine/muhurtamFinder';
import { nakshatraName, tithiFullName, weekdayName, type Lang } from '../engine/names';
import type { Place } from '../engine/panchang';
import { formatCivil, formatTimeRel, todayIn, type CivilDate } from '../engine/tz';
import { downloadIcs } from './Calendar';
import { Card, DateBox } from './components';
import { chartFor } from './Horoscope';
import { PlacePicker } from './PlacePicker';

const ACTIVITIES: Array<{ id: Exclude<Activity, 'general'>; icon: string }> = [
  { id: 'marriage', icon: '💍' }, { id: 'engagement', icon: '💐' }, { id: 'housewarming', icon: '🏠' },
  { id: 'property', icon: '📜' }, { id: 'naming', icon: '👶' }, { id: 'annaprasana', icon: '🍚' },
  { id: 'aksharabhyasam', icon: '✏️' }, { id: 'upanayanam', icon: '🧵' }, { id: 'vehicle', icon: '🚗' },
  { id: 'business', icon: '🏪' }, { id: 'travel', icon: '✈️' },
];

const RANGES = [[30, 'r30'], [90, 'r90'], [180, 'r180'], [365, 'r365']] as const;

type X = ReturnType<typeof useText<keyof typeof MUHURTAM_TEXT.en>>['x'];

export function MuhurtamScreen({ initialActivity }: { initialActivity?: string }) {
  const settings = useStore((s) => s.settings);
  const profiles = useStore((s) => s.profiles);
  const { lang, x } = useText(MUHURTAM_TEXT);
  const loc = LOCALE[lang];
  const today = todayIn(settings.place.tz);

  const [activity, setActivity] = useState<(typeof ACTIVITIES)[number]['id']>(() => ACTIVITIES.find((a) => a.id === initialActivity)?.id ?? 'marriage');
  const [from, setFrom] = useState<CivilDate>(today);
  const [days, setDays] = useState(90);
  const [people, setPeople] = useState<string[]>([]);
  const [place, setPlace] = useState<Place>(settings.place);
  const [showPlace, setShowPlace] = useState(false);
  const [bestOnly, setBestOnly] = useState(false);
  const [results, setResults] = useState<MuhurtamDay[] | null>(null);
  const [busy, setBusy] = useState(false);

  const chosen = useMemo(() => profiles.filter((p) => people.includes(p.id)).map((p) => ({ name: p.name, chart: chartFor(p) })), [profiles, people]);

  // Recalculate when inputs change; yield to the browser first so the "searching" state paints.
  useEffect(() => {
    setBusy(true);
    const t = setTimeout(() => {
      setResults(findMuhurtams({ activity, from, days, place, people: chosen }));
      setBusy(false);
    }, 30);
    return () => clearTimeout(t);
  }, [activity, from, days, place, chosen]);

  const shown = (results ?? []).filter((d) => !bestOnly || d.quality === 'excellent');
  const byMonth = shown.reduce<Record<string, MuhurtamDay[]>>((acc, d) => { (acc[d.date.slice(0, 7)] ??= []).push(d); return acc; }, {});

  return (
    <>
      <Card title={x('title')}>
        <div className="activity-grid" role="radiogroup" aria-label={x('occasion')}>
          {ACTIVITIES.map((a) => (
            <button key={a.id} role="radio" aria-checked={activity === a.id} className="activity" onClick={() => setActivity(a.id)}>
              <span aria-hidden="true">{a.icon}</span>{x(a.id)}
            </button>
          ))}
        </div>
        <div className="grid2">
          <label className="field">{x('startingFrom')}
            <input type="date" value={from} min={today} onChange={(e) => e.target.value && setFrom(e.target.value)} />
          </label>
          <div className="field">{x('searchNext')}
            <div className="row" role="group">
              {RANGES.map(([n, k]) => <button key={n} className="chip" aria-pressed={days === n} onClick={() => setDays(n)}>{x(k)}</button>)}
            </div>
          </div>
        </div>

        <div className="field">{x('forWhom')}
          {profiles.length ? (
            <div className="row">
              {profiles.map((p) => (
                <button key={p.id} className="chip" aria-pressed={people.includes(p.id)}
                  onClick={() => setPeople((x) => (x.includes(p.id) ? x.filter((i) => i !== p.id) : [...x, p.id]))}>{p.name}</button>
              ))}
            </div>
          ) : (
            <span className="small muted">{x('noProfiles')}</span>
          )}
        </div>

        <div className="row small">
          <span className="grow">📍 {x('venue')}: <strong>{place.name}</strong></span>
          <button className="btn ghost" onClick={() => setShowPlace((v) => !v)}>{showPlace ? x('done') : x('changeVenue')}</button>
        </div>
        {showPlace && <PlacePicker value={place} onChange={(p) => { setPlace(p); setShowPlace(false); }} label={x('venueLabel')} locate={false} />}
      </Card>

      <div className="row">
        <h2 className="grow" style={{ margin: 0, fontSize: '1.1rem' }}>
          {busy ? x('searching') : x(shown.length === 1 ? 'found1' : 'found', { activity: x(activity), n: shown.length })}
        </h2>
        <label className="row small"><input type="checkbox" checked={bestOnly} onChange={(e) => setBestOnly(e.target.checked)} /> {x('bestOnly')}</label>
      </div>

      {!busy && results && shown.length === 0 && (
        <Card>
          <p>{x('none')}</p>
          <p className="small muted">{noneReason(activity, chosen.length, x)}</p>
          {days < 365 && <button className="btn" onClick={() => setDays(days < 180 ? 180 : 365)}>{x('longer')}</button>}
        </Card>
      )}

      {Object.entries(byMonth).map(([ym, list]) => (
        <section key={ym} className="stack">
          <h3 className="month-head">{formatCivil(`${ym}-01`, loc, { month: 'long', year: 'numeric' })}</h3>
          {list.map((d) => <DayCard key={d.date} d={d} place={place} activity={activity} />)}
        </section>
      ))}

      <div className="note info small">
        {x('confirmNote')}
      </div>
      <details className="small muted">
        <summary>{x('how')}</summary>
        <p>{x('assumptions')}</p>
        <p>{x('personalCheck')}</p>
      </details>
    </>
  );
}

function DayCard({ d, place, activity }: { d: MuhurtamDay; place: Place; activity: (typeof ACTIVITIES)[number]['id'] }) {
  const { lang, x } = useText(MUHURTAM_TEXT);
  const tradition = useStore((s) => s.settings.tradition);
  const loc = LOCALE[lang];
  const p = d.assessment.panchang;
  const [open, setOpen] = useState(false);
  const fmt = (t: Date) => formatTimeRel(t, d.date, place.tz, loc);
  const exportIcs = (w: MuhurtamWindow) => {
    const stamp = (t: Date) => t.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sanathani//Muhurtam//EN', 'BEGIN:VEVENT',
      `UID:${stamp(w.start)}-${activity}@thithi-reminder`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(w.start)}`, `DTEND:${stamp(w.end)}`,
      `SUMMARY:${x('title')} — ${x(activity)}`,
      `DESCRIPTION:${tithiFullName(w.tithi)}\\, ${nakshatraName(w.nakshatra)} nakshatra. Calculated for ${place.name}. Confirm with your purohit.`,
      `LOCATION:${place.name}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    downloadIcs(ics, `muhurtam-${d.date}.ics`);
  };
  return (
    <article className="card muhurtam">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <DateBox date={d.date} />
        <div className="grow">
          <div className="row" style={{ gap: 6 }}>
            <strong>{weekdayName(p.weekday, lang)}</strong>
            <span className={`badge ${d.quality}`}>{x(d.quality === 'excellent' ? 'excellent' : 'good')}</span>
          </div>
          <div className="small muted">{solarLabel(d.date, place, tradition, lang) ?? displayMonth(p.month, d.windows[0].tithi, tradition, lang)} · {tithiFullName(d.windows[0].tithi, lang)} · {nakshatraName(d.windows[0].nakshatra, lang)}</div>
          <ul className="windows">
            {d.windows.map((w) => (
              <li key={w.start.toISOString()}>
                <span className="wtime">{w.night ? '🌙' : '☀️'} {fmt(w.start)} – {fmt(w.end)}</span>
                {(w.tithi !== d.windows[0].tithi || w.nakshatra !== d.windows[0].nakshatra) && <span className="tiny muted"> {tithiFullName(w.tithi, lang)}, {nakshatraName(w.nakshatra, lang)}</span>}
                {w.abhijit && <span className="badge">{x('abhijit')}</span>}
                <button className="linklike tiny" onClick={() => exportIcs(w)} aria-label={x('addToCalendar', { time: fmt(w.start) })}>+ {x('calendar')}</button>
              </li>
            ))}
          </ul>
          {d.windows[0].personal.length > 0 && (
            <div className="tiny good-text">✅ {d.windows[0].personal.map((c) => `${c.name}: ${taraName(c.taraNo, lang)}`).join(' · ')}</div>
          )}
          {d.windows[0].personal.some((c) => c.taraNo === 1) && (
            <div className="tiny muted">{x('janmaTara')}</div>
          )}
        </div>
      </div>
      <button className="btn ghost small" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{x(open ? 'less' : 'details')}</button>
      {open && (
        <div className="stack small">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {d.assessment.factors.filter((f) => f.good).map((f, i) => <li key={i}>{f.text}</li>)}
          </ul>
          <div><strong>{x('avoided')}:</strong>{' '}
            {d.assessment.avoid.filter((a) => a.span.end > p.sunrise).map((a) => `${avoidName(a.name, lang, x)} ${fmt(a.span.start)}–${fmt(a.span.end)}`).join(' · ')}
          </div>
          {d.dropped.length > 0 && <div className="muted">{x('dropped')}: {d.dropped.join(', ')}</div>}
          <div className="muted">{translate(lang, 'sunrise')} {fmt(p.sunrise)} · {translate(lang, 'sunset')} {fmt(p.sunset)}</div>
        </div>
      )}
    </article>
  );
}

function noneReason(activity: Activity, people: number, x: X): string {
  const parts: string[] = [];
  if (['marriage', 'engagement', 'housewarming', 'upanayanam'].includes(activity)) parts.push(x('noneSeason'));
  if (people) parts.push(x('noneFewer'));
  return parts.join(' ') || x('noneDefault');
}

/** The engine names the periods it avoids in English; show them in the chosen language. */
function avoidName(name: string, lang: Lang, x: X): string {
  const key = ({ 'Rahu Kalam': 'rahu', Yamagandam: 'yama', 'Gulika Kalam': 'gulika' } as const)[name as 'Rahu Kalam'];
  if (key) return translate(lang, key);
  return name === 'Durmuhurtam' ? x('durmuhurtam') : name === 'Varjyam' ? x('varjyam') : name;
}
