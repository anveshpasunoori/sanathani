import { useMemo, useState, useEffect } from 'react';
import { upcoming } from '../data/occurrences';
import { setState, useStore } from '../data/store';
import { displayMonth, solarLabel, traditionYear } from '../data/traditions';
import { LOCALE, untilTime, useText } from '../i18n';
import { festivalName } from '../locales/festivals';
import { HOME_TEXT } from '../locales/home';
import { nakshatraName, pakshaName, pakshaOf, samvatsaraName, tithiFullName, tithiName, weekdayName, yogaName, karanaName } from '../engine/names';
import { observancesInRange } from '../engine/observances';
import { dayPanchang, type Span } from '../engine/panchang';
import { ritualsFor } from '../engine/rituals';
import { addDays, formatCivil, formatTime, formatTimeRel, todayIn } from '../engine/tz';
import { Avatar, Card, categoryLabel, DateBox, relativeDay, ShareButton } from './components';
import { go } from './router';

function useNow(ms = 60000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}

export function HomeScreen() {
  const { t, x, lang } = useText(HOME_TEXT);
  const s = useStore((x) => x);
  const { place, tradition } = s.settings;
  const now = useNow();
  const today = todayIn(place.tz);
  const p = useMemo(() => dayPanchang(today, place), [today, place]);
  // Tamil Nadu and Kerala name the day by the solar month; the lunar month is shown beside it.
  const solar = useMemo(() => solarLabel(today, place, tradition, lang), [today, place, tradition, lang]);
  const yr = useMemo(() => traditionYear(today, place, tradition, p), [today, place, tradition, p]);
  const yearName = 'era' in yr ? x(yr.era, { n: yr.n }) : x('samvatsaram', { name: samvatsaraName(yr.samvatsara, lang) });
  const events = useMemo(() => upcoming(s.events, s.settings, today, 60).slice(0, 5), [s.events, s.settings, today]);
  const obs = useMemo(() => observancesInRange(today, addDays(today, 30), place, tradition).slice(0, 6), [today, place, tradition]);
  const [q, setQ] = useState('');
  const tz = place.tz;
  const t0 = p.tithis[0];
  const unread = s.notices.filter((n) => !n.read);
  const loc = LOCALE[lang];
  const until = (d: Date) => untilTime(lang, formatTimeRel(d, today, tz, loc));
  const clock = (d: Date | null) => formatTime(d, tz, loc);
  const isNow = (sp: Span | null) => !!sp && now >= sp.start && now < sp.end;

  const guidance = [
    ...p.tithis.flatMap((ti) => ritualsFor(ti.index, lang)),
    ...(t0.index === 29 || [3, 8, 13, 18, 23, 28].includes(t0.index) ? [x('rikta')] : []),
    ...(p.month.adhika ? [x('adhika')] : []),
  ];

  return (
    <>
      {unread.length > 0 && (
        <div className="note warn" role="status">
          <strong>{x('dateUpdate')}</strong> {unread[0].text}{' '}
          <button className="btn ghost" onClick={() => setState((st) => ({ ...st, notices: st.notices.map((n) => ({ ...n, read: true })) }))}>{x('gotIt')}</button>
        </div>
      )}

      <Card className="hero">
        <div className="greg">{formatCivil(today, loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        <div className="lunar">{solar ?? displayMonth(p.month, t0.index, tradition, lang)} · {tithiFullName(t0.index, lang)}</div>
        <div className="muted">{yearName} · {weekdayName(p.weekday, lang)}</div>
        <form className="ask-box" onSubmit={(e) => { e.preventDefault(); if (q.trim()) go({ tab: 'ask', q }); }}>
          <label className="sr-only" htmlFor="home-ask">{t('ask')}</label>
          <input id="home-ask" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('askPlaceholder')} />
          <button className="btn primary round" type="submit">{t('ask')}</button>
        </form>
      </Card>

      <Card title={t('upcomingFamily')} action={<button className="btn saffron" onClick={() => go({ tab: 'events', id: 'new' })}>+ {t('addEvent')}</button>}>
        {events.length === 0 ? <p className="muted">{t('noEvents')} {x('noEventsHint')}</p> : (
          <ul className="list">
            {events.map((o) => (
              <li key={o.event.id + o.date}>
                <button className="item" onClick={() => go({ tab: 'events', id: o.event.id })}>
                  <DateBox date={o.date} />
                  <Avatar e={o.event} />
                  <div className="grow">
                    <div><strong>{o.event.personName}</strong> {o.event.isSample && <span className="badge sample">{t('sample')}</span>}</div>
                    <div className="small muted">{o.event.title ?? categoryLabel(o.event.category, lang)} · {relativeDay(today, o.date, lang)}</div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={t('todayPanchang')} action={<div className="row" style={{ gap: 6 }}>
        {/* A "good morning" Panchang for the family WhatsApp group. */}
        <ShareButton title={t('todayPanchang')} lines={[
          `🙏 ${formatCivil(today, loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`,
          `📅 ${solar ? `${solar} · ` : ''}${displayMonth(p.month, t0.index, tradition, lang)} · ${yearName}`,
          `🌙 ${t('thithi')}: ${tithiFullName(t0.index, lang)} ${until(t0.end)}`,
          `⭐ ${t('nakshatra')}: ${nakshatraName(p.nakshatras[0].index, lang)} ${until(p.nakshatras[0].end)}`,
          `🌅 ${t('sunrise')} ${clock(p.sunrise)} · 🌇 ${t('sunset')} ${clock(p.sunset)}`,
          `⚠️ ${t('rahu')}: ${clock(p.rahuKalam.start)} – ${clock(p.rahuKalam.end)}`,
          ...(p.abhijit ? [`✨ ${t('abhijit')}: ${clock(p.abhijit.start)} – ${clock(p.abhijit.end)}`] : []),
          ...obs.filter((o) => o.date === today).map((o) => `🪔 ${festivalName(o, lang)}`),
          `📍 ${place.name}`,
        ]} />
        <button className="btn ghost" onClick={() => go({ tab: 'calendar', date: today })}>{x('details')}</button>
      </div>}>
        <dl className="kv">
          <dt>{t('thithi')}</dt>
          <dd>{p.tithis.map((x, i) => <div key={i}>{tithiName(x.index, lang)} <span className="muted">{until(x.end)}</span></div>)}</dd>
          <dt>{t('nakshatra')}</dt>
          <dd>{p.nakshatras.map((x, i) => <div key={i}>{nakshatraName(x.index, lang)} <span className="muted">{until(x.end)}</span></div>)}</dd>
          <dt>{t('paksha')}</dt><dd>{pakshaName(pakshaOf(t0.index), lang)}</dd>
          <dt>{t('month')}</dt><dd>{solar ? <>{solar} <span className="muted">({displayMonth(p.month, t0.index, tradition, lang)})</span></> : displayMonth(p.month, t0.index, tradition, lang)}</dd>
          <dt>{t('year')}</dt><dd>{'era' in yr ? yearName : samvatsaraName(yr.samvatsara, lang)} <span className="muted">({x('shaka', { n: p.shakaYear })})</span></dd>
          <dt>{t('yoga')}</dt><dd>{yogaName(p.yogas[0].index, lang)} <span className="muted">{until(p.yogas[0].end)}</span></dd>
          <dt>{t('karana')}</dt><dd>{karanaName(p.karanas[0].index, lang)} <span className="muted">{until(p.karanas[0].end)}</span></dd>
        </dl>
      </Card>

      <Card title={t('timings')}>
        <div className="times">
          <div className="time"><b>{t('sunrise')}</b>{clock(p.sunrise)}</div>
          <div className="time"><b>{t('sunset')}</b>{clock(p.sunset)}</div>
          {([['rahu', p.rahuKalam], ['yama', p.yamagandam], ['gulika', p.gulikaKalam]] as const).map(([k, sp]) => (
            <div key={k} className={`time bad ${isNow(sp) ? 'now' : ''}`}><b>{t(k)}{isNow(sp) ? ` · ${x('now')}` : ''}</b>{clock(sp.start)} – {clock(sp.end)}</div>
          ))}
          <div className={`time good ${isNow(p.abhijit) ? 'now' : ''}`}><b>{t('abhijit')}</b>{p.abhijit ? `${clock(p.abhijit.start)} – ${clock(p.abhijit.end)}` : x('abhijitWed')}</div>
        </div>
        {p.sunApproximated && <div className="note warn small">{x('noSunrise')}</div>}
      </Card>

      <Card title={t('upcomingObs')} action={<button className="btn ghost" onClick={() => go({ tab: 'calendar' })}>{t('calendar')} →</button>}>
        <ul className="list">
          {obs.map((o) => (
            <li key={o.id + o.date}>
              <button className="item" onClick={() => go({ tab: 'calendar', date: o.date })}>
                <DateBox date={o.date} />
                <div className="grow">
                  <div><strong>{festivalName(o, lang)}</strong></div>
                  <div className="small muted">{relativeDay(today, o.date, lang)} · {x(o.kind === 'festival' ? 'festival' : o.kind === 'solar' ? 'solar' : 'vrata')}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
        <p className="tiny muted">{x('almanac', { place: place.name })}</p>
      </Card>

      <button className="cta" onClick={() => go({ tab: 'muhurtam' })}>
        <span aria-hidden="true">🪔</span>
        <span className="grow"><strong>{x('ceremonyQ')}</strong><span className="small muted">{x('ceremonySub')}</span></span>
        <span aria-hidden="true">→</span>
      </button>

      <Card title={t('guidance')}>
        {guidance.length ? <ul className="stack" style={{ margin: 0, paddingLeft: 18 }}>{guidance.map((g, i) => <li key={i}>{g}</li>)}</ul> : <p>{x('noGuidance')}</p>}
        <p className="tiny muted">{x('guidanceNote')}</p>
      </Card>
    </>
  );
}
