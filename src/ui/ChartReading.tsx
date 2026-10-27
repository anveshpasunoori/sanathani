import { useMemo } from 'react';
import type { BirthProfile } from '../data/types';
import { chartReading, type Strength } from '../engine/chartReading';
import { grahaName } from '../engine/horoscope';
import { rashiName, type Lang } from '../engine/names';
import { LOCALE, useText } from '../i18n';
import { chartText } from '../locales/chartReading';
import { HOROSCOPE_TEXT } from '../locales/horoscope';
import { Card } from './components';
import { chartFor } from './Horoscope';

// The full birth-chart reading: nature, each planet, the twelve houses, yogas, Saturn's phases and
// the Ashtakavarga. Readings are written per language in src/locales/chartReading.ts (English where missing).

const STRENGTH_ICON: Record<Strength, string> = { strong: '💪', steady: '⚖️', care: '🙏' };

export function ChartReadingView({ profile, lang }: { profile: BirthProfile; lang: Lang }) {
  const { x } = useText(HOROSCOPE_TEXT);
  const loc = LOCALE[lang];
  const T = chartText(lang);
  const chart = useMemo(() => chartFor(profile), [profile]);
  const r = useMemo(() => chartReading(chart, new Date(), lang), [chart, lang]);
  const strength = (s: Strength) => x(s === 'strong' ? 'strStrong' : s === 'steady' ? 'strSteady' : 'strCare');
  const monthYear = (d: Date) => new Intl.DateTimeFormat(loc, { month: 'short', year: 'numeric' }).format(d);
  const { current, next } = r.saturn;

  return (
    <>
      <Card title={x('yourNature')}>
        <p className="small muted" style={{ marginTop: 0 }}>{x('chartIntro')}</p>
        <ul className="insights">
          {r.nature.map((n) => <li key={n.title} className="good"><strong>{n.title}</strong><p>{n.text}</p></li>)}
        </ul>
        {!r.fromLagna && <p className="small muted" style={{ marginBottom: 0 }}>{x('howMoon', { rashi: rashiName(chart.moon.rashi, lang) })}</p>}
      </Card>

      <Card title={x('yogasTitle')}>
        {r.yogas.length ? (
          <ul className="insights">
            {r.yogas.map((y) => (
              <li key={y.id} className={y.tone}>
                <strong>{y.tone === 'good' ? '✨ ' : '🔸 '}{y.name}</strong>
                <p>{y.text}</p>
                {y.tip && <p className="tip">💡 {y.tip}</p>}
              </li>
            ))}
          </ul>
        ) : <p className="muted" style={{ margin: 0 }}>{x('noYogas')}</p>}
      </Card>

      <Card title={x('planetsTitle')}>
        <div className="stack" style={{ gap: 6 }}>
          {r.planets.map((p) => (
            <details key={p.graha} className={`note ${p.strength === 'strong' ? 'good' : p.strength === 'care' ? 'warn' : 'info'}`}>
              <summary>
                <strong>{grahaName(p.graha, lang)}</strong> — {rashiName(p.rashi, lang)} · {x('house')} {p.house}
                {' '}<span className="badge">{STRENGTH_ICON[p.strength]} {strength(p.strength)}</span>
                {p.dignity && p.dignity !== 'neutral' && <> <span className="badge">{T.dignity[p.dignity]}</span></>}
              </summary>
              <p className="small" style={{ marginBottom: p.tip ? 4 : 0 }}>{p.text}</p>
              {p.tip && <p className="tip small" style={{ margin: 0 }}>💡 {x('remedy')}: {p.tip}</p>}
            </details>
          ))}
        </div>
      </Card>

      <Card title={x('housesTitle')}>
        <div className="stack" style={{ gap: 6 }}>
          {r.houses.map((h) => (
            <details key={h.house} className={`note ${h.strength === 'strong' ? 'good' : h.strength === 'care' ? 'warn' : 'info'}`}>
              <summary>
                <strong>{h.house}. {T.houseName[h.house - 1]}</strong> — {rashiName(h.rashi, lang)}
                {' '}<span className="badge">{STRENGTH_ICON[h.strength]} {strength(h.strength)}</span>
              </summary>
              <p className="small" style={{ marginBottom: h.tip ? 4 : 0 }}>{h.text}</p>
              {h.tip && <p className="tip small" style={{ margin: 0 }}>💡 {x('remedy')}: {h.tip}</p>}
            </details>
          ))}
        </div>
      </Card>

      <Card title={x('saturnTitle')}>
        {current && (
          <div className="note warn small" style={{ marginBottom: 8 }}>
            <strong>{x('saturnNow', { phase: T.saturn[current.kind].name, date: monthYear(current.end) })}</strong>
            <p style={{ margin: '4px 0 0' }}>{T.saturn[current.kind].text}</p>
          </div>
        )}
        {next ? (
          <p className="small" style={{ margin: 0 }}>
            {x('saturnNext', { phase: T.saturn[next.kind].name, from: monthYear(next.start), to: monthYear(next.end) })}
          </p>
        ) : !current && <p className="small muted" style={{ margin: 0 }}>{x('noSaturn')}</p>}
      </Card>

      {r.ashtakavarga && (
        <Card title={x('avTitle')}>
          <p className="small muted" style={{ marginTop: 0 }}>{x('avNote')}</p>
          <div className="av-grid">
            {r.ashtakavarga.sav.map((n, i) => (
              <div key={i} className={`av-cell ${n >= 30 ? 'good' : n < 25 ? 'low' : ''}`}>
                <span className="small">{rashiName(i, lang)}</span>
                <strong>{n}</strong>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
