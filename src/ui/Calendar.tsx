import { Fragment, useMemo, useState } from 'react';
import { occurrencesBetween } from '../data/occurrences';
import { updateSettings, useStore } from '../data/store';
import { displayMonth, solarLabel, tradition as getTradition, traditionYear } from '../data/traditions';
import { LOCALE, untilTime, useText } from '../i18n';
import { CALENDAR_TEXT } from '../locales/calendar';
import { festivalName, traditionName } from '../locales/festivals';
import { HOME_TEXT } from '../locales/home';
import { lunarMonthAt } from '../engine/lunar';
import { karanaName, nakshatraName, pakshaName, pakshaOf, samvatsaraName, tithiName, yogaName, type Lang } from '../engine/names';
import { observancesInRange, type CalendarObservance } from '../engine/observances';
import { dayPanchang } from '../engine/panchang';
import { solarDate, solarMonthName, solarMonthsBetween } from '../engine/solar';
import { ritualsFor } from '../engine/rituals';
import { addDays, civil, civilDateOf, formatCivil, formatTime, formatTimeRel, parseCivil, todayIn, weekdayOf, type CivilDate } from '../engine/tz';
import { buildIcs } from '../reminders/ics';
import { Card, categoryLabel, FollowButton, ShareButton } from './components';
import { go } from './router';

type Filter = 'family' | 'festival' | 'vrata';

// Compact thithi labels for narrow calendar cells (index 14 = Purnima, 15 = Amavasya).
const SHORT = ['Prat', 'Dwi', 'Tri', 'Chav', 'Pan', 'Shas', 'Sapt', 'Asht', 'Nav', 'Dash', 'Ekad', 'Dwad', 'Tray', 'Chtr', 'Purn', 'Amav'];
const shortTithi = (ti: number, lang: Lang) => (lang === 'en' ? SHORT[ti % 15 === 14 ? (ti === 14 ? 14 : 15) : ti % 15] : tithiName(ti, lang));
/** Sun…Sat, short, in the language's own words (1 Jan 2023 was a Sunday). */
const weekdayShort = (w: number, lang: Lang) => new Date(Date.UTC(2023, 0, 1 + w)).toLocaleDateString(LOCALE[lang], { weekday: 'short', timeZone: 'UTC' });

export function downloadIcs(ics: string, name: string) {
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function CalendarScreen({ initialDate }: { initialDate?: string }) {
  const { t, x, lang } = useText(CALENDAR_TEXT);
  const { x: home } = useText(HOME_TEXT);
  const loc = LOCALE[lang];
  const s = useStore((st) => st);
  const { place, tradition, calendarMode: mode } = s.settings;
  const today = todayIn(place.tz);
  const [anchor, setAnchor] = useState<CivilDate>(initialDate ?? today);
  const [selected, setSelected] = useState<CivilDate>(initialDate ?? today);
  const [filters, setFilters] = useState<Record<Filter, boolean>>({ family: true, festival: true, vrata: true });

  // Tamil Nadu, Kerala, Bengal and Odisha show solar months where the others show lunar ones.
  const system = getTradition(tradition).solar;
  const yearText = (d: CivilDate) => {
    const yr = traditionYear(d, place, tradition, dayPanchang(d, place));
    return 'era' in yr ? home(yr.era, { n: yr.n }) : samvatsaraName(yr.samvatsara, lang);
  };

  // Visible range: Gregorian month, or one lunar month (new moon to new moon), or one solar month.
  const view = useMemo(() => {
    if (mode === 'gregorian') {
      const { y, m } = parseCivil(anchor);
      const first = civil(y, m, 1), last = civil(y, m + 1, 0);
      return { first, last, title: formatCivil(first, loc, { month: 'long', year: 'numeric' }), sub: '' };
    }
    if (system) {
      const sm = solarMonthsBetween(anchor, anchor, place, system)[0];
      return {
        first: sm.start, last: sm.end, title: solarMonthName(system, sm.month, lang),
        sub: `${yearText(sm.start)} · ${formatCivil(sm.start, loc, { day: 'numeric', month: 'short' })} – ${formatCivil(sm.end, loc, { day: 'numeric', month: 'short', year: 'numeric' })}`,
      };
    }
    const lm = lunarMonthAt(dayPanchang(anchor, place).sunrise);
    const first = addDays(civilDateOf(lm.start, place.tz), 1);
    const last = civilDateOf(lm.end, place.tz);
    const p = dayPanchang(first, place);
    return {
      first, last,
      title: x('masam', { month: displayMonth(lm, 0, tradition, lang) }),
      sub: `${samvatsaraName(p.samvatsara, lang)} · ${formatCivil(first, loc, { day: 'numeric', month: 'short' })} – ${formatCivil(last, loc, { day: 'numeric', month: 'short', year: 'numeric' })}`,
    };
  }, [anchor, mode, place, tradition, lang, system]);

  const gridStart = addDays(view.first, -weekdayOf(view.first));
  const gridEnd = addDays(view.last, 6 - weekdayOf(view.last));
  const days: CivilDate[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

  const obs = useMemo(() => observancesInRange(gridStart, gridEnd, place, tradition), [gridStart, gridEnd, place, tradition]);
  const fam = useMemo(() => s.events.flatMap((e) => occurrencesBetween(e, s.settings, gridStart, gridEnd)), [s.events, s.settings, gridStart, gridEnd]);
  const obsOn = (d: CivilDate) => obs.filter((o) => o.date === d && filters[o.kind === 'festival' || o.kind === 'solar' ? 'festival' : 'vrata']);
  const famOn = (d: CivilDate) => (filters.family ? fam.filter((o) => o.date === d) : []);

  const move = (dir: 1 | -1) => {
    if (mode === 'gregorian') {
      const { y, m } = parseCivil(anchor);
      setAnchor(civil(y, m + dir, 1));
    } else {
      setAnchor(dir === 1 ? addDays(view.last, 2) : addDays(view.first, -3));
    }
  };
  const year = parseCivil(anchor).y;

  return (
    <>
      <Card>
        <div className="row" role="group" aria-label={x('calSystem')}>
          <button className="chip" aria-pressed={mode === 'gregorian'} onClick={() => updateSettings({ calendarMode: 'gregorian' })}>{x('gregorian')}</button>
          <button className="chip" aria-pressed={mode === 'lunar'} onClick={() => updateSettings({ calendarMode: 'lunar' })}>{x(system ? 'solar' : 'lunar')}</button>
          <select aria-label={t('year')} style={{ width: 'auto', marginLeft: 'auto' }} value={year}
            onChange={(e) => { const { m, d } = parseCivil(anchor); setAnchor(civil(+e.target.value, m, Math.min(d, 28))); }}>
            {Array.from({ length: 41 }, (_, i) => year - 20 + i).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="cal-head">
          <button className="btn" onClick={() => move(-1)} aria-label={x('prev')}>‹</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <h2>{view.title}</h2>
            {view.sub && <div className="small muted">{view.sub}</div>}
          </div>
          <button className="btn" onClick={() => move(1)} aria-label={t('next')}>›</button>
        </div>
        <div className="cal" role="grid">
          {[0, 1, 2, 3, 4, 5, 6].map((w) => <div key={w} className="wd" role="columnheader">{weekdayShort(w, lang)}</div>)}
          {days.map((d) => {
            const p = dayPanchang(d, place);
            const inView = d >= view.first && d <= view.last;
            const o = obsOn(d), f = famOn(d);
            const ti = p.tithis[0].index;
            return (
              <button key={d} role="gridcell"
                className={`cell ${inView ? '' : 'out'} ${d === today ? 'today' : ''} ${d === selected ? 'sel' : ''} ${ti === 14 || ti === 29 ? 'full' : ''}`}
                onClick={() => setSelected(d)}
                aria-label={`${formatCivil(d, loc)}: ${tithiName(ti, lang)}${o.length ? ', ' + o.map((ob) => festivalName(ob, lang)).join(', ') : ''}${f.length ? `, ${x('familyCount', { n: f.length })}` : ''}`}>
                <span className="n">{mode === 'gregorian' ? parseCivil(d).d : system ? solarDate(d, place, system).day : (ti % 15) + 1}</span>
                {mode === 'gregorian' ? (
                  <span className="t"><span className="long">{tithiName(ti, lang)}</span><span className="short">{shortTithi(ti, lang)}</span></span>
                ) : <span className="t">{parseCivil(d).d} {formatCivil(d, loc, { month: 'short' })}</span>}
                {o.filter((ob) => !['ekadashi', 'purnima', 'amavasya'].includes(ob.id)).slice(0, 1).map((ob) => <span key={ob.id} className="t obs">{festivalName(ob, lang)}</span>)}
                <span className="dots">
                  {f.length > 0 && <i className="dot family" />}
                  {o.some((ob) => ob.kind !== 'vrata') && <i className="dot festival" />}
                  {o.some((ob) => ob.kind === 'vrata') && <i className="dot vrata" />}
                </span>
              </button>
            );
          })}
        </div>
        <div className="row">
          {(['family', 'festival', 'vrata'] as Filter[]).map((k) => (
            <button key={k} className="chip" aria-pressed={filters[k]} onClick={() => setFilters({ ...filters, [k]: !filters[k] })}>
              <i className={`dot ${k}`} style={{ display: 'inline-block', marginRight: 6 }} />
              {k === 'family' ? t('familyEvents') : x(k === 'festival' ? 'festivals' : 'vratas')}
            </button>
          ))}
        </div>
      </Card>

      <button className="cta" onClick={() => go({ tab: 'muhurtam' })}>
        <span aria-hidden="true">🪔</span>
        <span className="grow"><strong>{x('findMuhurtam')}</strong><span className="small muted">{x('findMuhurtamSub')}</span></span>
        <span aria-hidden="true">→</span>
      </button>

      <DayDetail date={selected} obs={obsOn(selected)} family={famOn(selected)} />

      <Card title={x('export')}>
        <p className="small muted">{x('exportNote')}</p>
        <button className="btn" disabled={!s.events.length} onClick={() => downloadIcs(buildIcs(s.events, s.settings, 5), 'thithi-family-events.ics')}>{x('download')}</button>
      </Card>
    </>
  );

  function DayDetail({ date, obs, family }: { date: CivilDate; obs: CalendarObservance[]; family: ReturnType<typeof famOn> }) {
    const p = dayPanchang(date, place);
    const tz = place.tz;
    const rituals = p.tithis.flatMap((ti) => ritualsFor(ti.index, lang));
    const until = (d: Date) => untilTime(lang, formatTimeRel(d, date, tz, loc));
    const clock = (d: Date) => formatTime(d, tz, loc);
    return (
      <Card title={formatCivil(date, loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}>
        <p className="muted small">{x('localDate', { place: place.name, tz, nakshatra: nakshatraName(p.nakshatras[0].index, lang) })}</p>
        {family.length > 0 && (
          <div className="stack">
            <strong>{t('familyEvents')}</strong>
            {family.map((f) => (
              <button key={f.event.id} className="note good" style={{ textAlign: 'left', border: 0, cursor: 'pointer' }} onClick={() => go({ tab: 'events', id: f.event.id })}>
                <strong>{f.event.personName}</strong> — {f.event.title ?? categoryLabel(f.event.category, lang)}<div className="small">{f.reason}</div>
              </button>
            ))}
          </div>
        )}
        {obs.length > 0 && (
          <div className="stack">
            <strong>{x('observances')}</strong>
            {obs.map((o) => (
              <div key={o.id} className="note info row" style={{ alignItems: 'flex-start' }}>
                <div className="grow"><strong>{festivalName(o, lang)}</strong><div className="small muted">{o.reason}</div></div>
                <div className="row" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <FollowButton follow={o.id} />
                  <ShareButton title={festivalName(o, lang)} lines={[`🪔 ${festivalName(o, lang)}`, `📅 ${formatCivil(o.date, loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`, `📍 ${place.name}`]} />
                </div>
              </div>
            ))}
          </div>
        )}
        <strong>{x('panchangam')}</strong>
        <dl className="kv">
          <dt>{t('thithi')}</dt>
          <dd>{p.tithis.map((ti, i) => <div key={i}>{tithiName(ti.index, lang)} <span className="muted">{until(ti.end)}</span></div>)}</dd>
          <dt>{t('nakshatra')}</dt>
          <dd>{p.nakshatras.map((n, i) => <div key={i}>{nakshatraName(n.index, lang)} <span className="muted">{until(n.end)}</span></div>)}</dd>
          <dt>{t('paksha')}</dt><dd>{pakshaName(pakshaOf(p.tithis[0].index), lang)}</dd>
          <dt>{t('month')}</dt><dd>{solarLabel(date, place, tradition, lang) ?? ''}{system && ' '}{system ? <span className="muted">({displayMonth(p.month, p.tithis[0].index, tradition, lang)})</span> : displayMonth(p.month, p.tithis[0].index, tradition, lang)}</dd>
          <dt>{t('year')}</dt><dd>{yearText(date)}</dd>
          <dt>{t('yoga')}</dt><dd>{yogaName(p.yogas[0].index, lang)} <span className="muted">{until(p.yogas[0].end)}</span></dd>
          <dt>{t('karana')}</dt><dd>{karanaName(p.karanas[0].index, lang)} <span className="muted">{until(p.karanas[0].end)}</span></dd>
        </dl>
        <strong>{t('timings')}</strong>
        <dl className="kv">
          <dt>{t('sunrise')}</dt><dd>{clock(p.sunrise)}</dd>
          <dt>{t('sunset')}</dt><dd>{clock(p.sunset)}</dd>
          {([['rahu', p.rahuKalam], ['yama', p.yamagandam], ['gulika', p.gulikaKalam]] as const).map(([k, sp]) => (
            <Fragment key={k}><dt>{t(k)}</dt><dd>{clock(sp.start)} – {clock(sp.end)}</dd></Fragment>
          ))}
          <dt>{t('abhijit')}</dt><dd>{p.abhijit ? `${clock(p.abhijit.start)} – ${clock(p.abhijit.end)}` : home('abhijitWed')}</dd>
        </dl>
        {p.sunApproximated && <div className="note warn small">{home('noSunrise')}</div>}
        {rituals.length > 0 && <div className="stack"><strong>{x('traditionally')}</strong><ul style={{ margin: 0, paddingLeft: 18 }}>{rituals.map((r, i) => <li key={i}>{r}</li>)}</ul></div>}
        <p className="source">{x('source', { tradition: traditionName(getTradition(tradition), lang) })}</p>
      </Card>
    );
  }
}
