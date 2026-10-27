import { useMemo, useState } from 'react';
import type { BirthProfile } from '../data/types';
import { grahaName } from '../engine/horoscope';
import { dashaAt } from '../engine/jyotish';
import { AREA_ORDER, chartBasis, LIFE_AREAS, lifeThemesNote, lifeTimeline, periodsForArea, periodThemes, type LifeArea } from '../engine/lifeThemes';
import { rashiName, type Lang } from '../engine/names';
import { LOCALE, useText } from '../i18n';
import { astroLabel } from '../locales/astro';
import { HOROSCOPE_TEXT } from '../locales/horoscope';
import { Card } from './components';
import { chartFor } from './Horoscope';

const fmtMY = (d: Date, loc: string) => new Intl.DateTimeFormat(loc, { month: 'short', year: 'numeric' }).format(d);
const ageAt = (birth: Date, d: Date) => Math.floor((d.getTime() - birth.getTime()) / (365.25 * 86400000));

export function LifeThemesView({ profile, lang }: { profile: BirthProfile; lang: Lang }) {
  const { x } = useText(HOROSCOPE_TEXT);
  const loc = LOCALE[lang];
  const chart = useMemo(() => chartFor(profile), [profile]);
  const basis = useMemo(() => chartBasis(chart), [chart]);
  const timeline = useMemo(() => lifeTimeline(chart), [chart]);
  const now = useMemo(() => new Date(), []);
  const cur = dashaAt(timeline, now);
  const [area, setArea] = useState<LifeArea | null>(null);
  const [years, setYears] = useState(25);
  const [openMaha, setOpenMaha] = useState<string | null>(cur?.maha.lord ?? null);
  const areaPeriods = useMemo(() => (area ? periodsForArea(chart, area, now, years, lang) : []), [area, chart, now, years, lang]);

  const birth = chart.instant;
  const refLabel = basis.fromLagna
    ? x('refLagna', { rashi: rashiName(basis.ref, lang) })
    : x('refMoon', { rashi: rashiName(basis.ref, lang) });

  return (
    <>
      {cur && (() => {
        const m = periodThemes(basis, cur.maha.lord, lang), a = periodThemes(basis, cur.antar.lord, lang);
        return (
          <Card className="hero" title={x('current')}>
            <p className="lunar" style={{ margin: 0 }}>{grahaName(cur.maha.lord, lang)} / {grahaName(cur.antar.lord, lang)}</p>
            <p className="small muted" style={{ margin: 0 }}>
              {x('antardasha')} {fmtMY(cur.antar.start, loc)} – {fmtMY(cur.antar.end, loc)} · {x('mahaUntil')} {fmtMY(cur.maha.end, loc)}
            </p>
            <div className="theme-block">
              <strong>{x('inFocus')}</strong>
              <div className="row">{[...new Set([...a.areas, ...m.areas])].slice(0, 5).map((t) => <span key={t} className="chip good">{t}</span>)}</div>
            </div>
            <p style={{ marginBottom: 0 }}>
              {x('backdrop', { maha: grahaName(cur.maha.lord, lang), mnature: m.nature, antar: grahaName(cur.antar.lord, lang), anature: a.nature })}
            </p>
            {cur.next && <p className="tiny muted">{x('nextPeriod', { lord: grahaName(cur.next.lord, lang), date: fmtMY(cur.next.start, loc) })}</p>}
          </Card>
        );
      })()}

      <Card title={x('byArea')}>
        <p className="small muted" style={{ marginTop: 0 }}>
          {x('pickArea')}
        </p>
        <div className="activity-grid" role="radiogroup" aria-label={x('lifeArea')}>
          {AREA_ORDER.map((k) => (
            <button key={k} role="radio" aria-checked={area === k} className="activity" onClick={() => setArea(area === k ? null : k)}>
              <span aria-hidden="true">{LIFE_AREAS[k].icon}</span>{astroLabel(LIFE_AREAS[k].name, lang, (l) => l.area[k])}
            </button>
          ))}
        </div>
        {area && (
          <>
            <div className="row small">
              <span className="grow muted">{x('lookingAhead')}</span>
              {[10, 25, 50].map((y) => <button key={y} className="chip" aria-pressed={years === y} onClick={() => setYears(y)}>{x('years', { n: y })}</button>)}
            </div>
            {areaPeriods.length ? (
              <ul className="area-periods">
                {areaPeriods.map((p) => {
                  const isNow = now >= p.start && now < p.end;
                  return (
                    <li key={p.start.toISOString()} className={isNow ? 'now' : undefined}>
                      <div className="row" style={{ gap: 6 }}>
                        <strong className="grow">{fmtMY(p.start, loc)} – {fmtMY(p.end, loc)}</strong>
                        {isNow && <span className="badge excellent">{x('now')}</span>}
                        <span className="tiny muted">{x('age', { a: ageAt(birth, p.start), b: ageAt(birth, p.end) })}</span>
                      </div>
                      <div className="small">{grahaName(p.maha, lang)} / {grahaName(p.lord, lang)} · <Strength score={p.score} /></div>
                      <div className="tiny muted">{p.why.join(' · ')}</div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="small muted">{x('noPeriods')}</p>
            )}
            <p className="tiny muted">
              {x('assocOnly')}
            </p>
          </>
        )}
      </Card>

      <Card title={x('timeline')}>
        <div className="dasha-bar" aria-hidden="true">
          {timeline.map((m) => {
            const total = timeline[timeline.length - 1].end.getTime() - timeline[0].start.getTime();
            return <span key={m.lord} className={cur?.maha.lord === m.lord ? 'cur' : undefined} style={{ flexGrow: (m.end.getTime() - m.start.getTime()) / total }} title={grahaName(m.lord, lang)} />;
          })}
        </div>
        <ul className="maha-list">
          {timeline.map((m) => {
            const th = periodThemes(basis, m.lord, lang);
            const open = openMaha === m.lord;
            const past = m.end < now;
            return (
              <li key={m.lord} className={`${cur?.maha.lord === m.lord ? 'cur' : ''} ${past ? 'past' : ''}`}>
                <button className="maha-head" aria-expanded={open} onClick={() => setOpenMaha(open ? null : m.lord)}>
                  <span className="grow">
                    <strong>{grahaName(m.lord, lang)}</strong>
                    <span className="small muted"> · {m.start < birth ? fmtMY(birth, loc) : fmtMY(m.start, loc)} – {fmtMY(m.end, loc)} · {x('age', { a: Math.max(0, ageAt(birth, m.start)), b: ageAt(birth, m.end) })}</span>
                  </span>
                  <span aria-hidden="true">{open ? '▾' : '▸'}</span>
                </button>
                <div className="small muted">{th.areas.join(' · ')}</div>
                {open && (
                  <div className="stack small" style={{ marginTop: 6 }}>
                    <p style={{ margin: 0 }}>{x('byNature', { nature: th.nature })}</p>
                    <p className="tiny muted" style={{ margin: 0 }}>
                      {x('housesFrom', { ref: refLabel })}: {th.houses.join(', ')}
                    </p>
                    <ul className="antar-list">
                      {m.antar.filter((a) => a.end > birth).map((a) => {
                        const at = periodThemes(basis, a.lord, lang);
                        const isNow = now >= a.start && now < a.end;
                        return (
                          <li key={a.start.toISOString()} className={isNow ? 'now' : a.end < now ? 'past' : undefined}>
                            <span className="atime">{fmtMY(a.start < birth ? birth : a.start, loc)} – {fmtMY(a.end, loc)}</span>
                            <span><strong>{grahaName(a.lord, lang)}</strong> <span className="muted">· {at.areas.slice(0, 2).join(' · ')}</span></span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="note info small">
        {x('dashaNote')}
      </div>
      <details className="small muted">
        <summary>{x('how')}</summary>
        <p>{lifeThemesNote(lang)}</p>
        <p>{x(basis.fromLagna ? 'howLagna' : 'howMoon', { rashi: rashiName(basis.ref, lang) })}</p>
      </details>
    </>
  );
}

function Strength({ score }: { score: number }) {
  const { x } = useText(HOROSCOPE_TEXT);
  const strong = score >= 5;
  return <span className={strong ? 'good-text' : 'muted'}>{x(strong ? 'strong' : 'linked')}</span>;
}
