import { useMemo, useState } from 'react';
import type { BirthProfile } from '../data/types';
import { BAND_TEXT, matchAssumptions, matchCharts, type KujaResult } from '../engine/matching';
import { nakshatraName, rashiName, sanskritName, type Lang } from '../engine/names';
import { useText } from '../i18n';
import { astroLabel } from '../locales/astro';
import { HOROSCOPE_TEXT } from '../locales/horoscope';
import { Card } from './components';
import { chartFor } from './Horoscope';

export function MatchingView({ profiles, lang, onAdd }: { profiles: BirthProfile[]; lang: Lang; onAdd: () => void }) {
  const { x } = useText(HOROSCOPE_TEXT);
  const [brideId, setBrideId] = useState(profiles[0]?.id ?? '');
  const [groomId, setGroomId] = useState(profiles[1]?.id ?? '');
  const bride = profiles.find((p) => p.id === brideId);
  const groom = profiles.find((p) => p.id === groomId);
  const result = useMemo(() => (bride && groom && bride.id !== groom.id ? { r: matchCharts(chartFor(bride), chartFor(groom), lang), bc: chartFor(bride), gc: chartFor(groom) } : null), [bride, groom, lang]);

  return (
    <>
      <Card title={x('matchTitle')}>
        <p className="small muted" style={{ marginTop: 0 }}>
          {x('matchIntro')}
        </p>
        <div className="grid2">
          <label className="field">{x('bride')}
            <select value={brideId} onChange={(e) => setBrideId(e.target.value)}>
              <option value="">—</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="field">{x('groom')}
            <select value={groomId} onChange={(e) => setGroomId(e.target.value)}>
              <option value="">—</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        </div>
        <div className="row">
          <button className="btn" onClick={() => { setBrideId(groomId); setGroomId(brideId); }} disabled={!brideId && !groomId}>⇄ {x('swap')}</button>
          <button className="btn" onClick={onAdd}>+ {x('addPerson')}</button>
        </div>
        {bride && groom && bride.id === groom.id && <p className="note warn small">{x('twoPeople')}</p>}
      </Card>

      {result && bride && groom && (
        <>
          <Card className="hero">
            <div className="score">
              <div className="score-num"><strong>{fmt(result.r.adjusted)}</strong><span>/36</span></div>
              <div className="grow">
                <div className="lunar" style={{ fontSize: '1.15rem' }}>{astroLabel(BAND_TEXT[result.r.band], lang, (l) => l.band[result.r.band])}</div>
                <div className="small muted">
                  {bride.name}: {rashiName(result.bc.moon.rashi, lang)} · {nakshatraName(result.bc.moon.nakshatra, lang)}-{result.bc.moon.pada}<br />
                  {groom.name}: {rashiName(result.gc.moon.rashi, lang)} · {nakshatraName(result.gc.moon.nakshatra, lang)}-{result.gc.moon.pada}
                </div>
                {result.r.adjusted !== result.r.total && (
                  <div className="tiny muted">{x('rawScore', { raw: fmt(result.r.total), adj: fmt(result.r.adjusted) })}</div>
                )}
              </div>
            </div>
          </Card>

          <Card title={x('kootas')}>
            <ul className="kootas">
              {result.r.kootas.map((k) => {
                const full = k.score === k.max || !!k.cancelled;
                return (
                  <li key={k.key}>
                    <div className="koota-head">
                      <strong>{sanskritName(k.name, k.te, lang)}</strong>
                      <span className="small muted grow">{k.about}</span>
                      <span className={`pts ${full ? 'good' : k.score > 0 ? 'mid' : 'low'}`}>{fmt(k.score)}/{k.max}</span>
                    </div>
                    <div className="bar" aria-hidden="true"><span style={{ width: `${(k.score / k.max) * 100}%` }} /></div>
                    <div className="small muted">{k.detail}</div>
                    {k.cancelled && <div className="small good-text">✅ {k.cancelled}</div>}
                    {!k.cancelled && k.score === 0 && k.max >= 6 && (
                      <div className="small caution-text">🔸 {x('pariharam')}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card title={x('kuja')}>
            <KujaLine name={bride.name} k={result.r.kuja.bride} />
            <KujaLine name={groom.name} k={result.r.kuja.groom} />
            <p className={`small ${result.r.kuja.bride.present === result.r.kuja.groom.present ? 'good-text' : 'caution-text'}`}>{result.r.kuja.note}</p>
            {(!bride.time || !groom.time) && <p className="tiny muted">{x('kujaMoon')}</p>}
          </Card>

          <div className="note info small">
            {x('gunaNote')}
          </div>
          <details className="small muted">
            <summary>{x('how')}</summary>
            <ul style={{ paddingLeft: 18 }}>{matchAssumptions(lang).map((a) => <li key={a}>{a}</li>)}</ul>
          </details>
        </>
      )}
    </>
  );
}

function KujaLine({ name, k }: { name: string; k: KujaResult }) {
  const { x } = useText(HOROSCOPE_TEXT);
  return (
    <p className="small" style={{ margin: '4px 0' }}>
      <strong>{name}:</strong>{' '}
      {x(k.present ? 'kujaPresent' : k.exception ? 'kujaSetAside' : 'kujaNone')}
      <span className="muted"> — {k.basis}{k.exception ? `; ${k.exception}` : ''}.</span>
    </p>
  );
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
