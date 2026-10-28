import { useMemo } from 'react';
import type { BirthChart } from '../engine/jyotish';
import { chartSummary } from '../engine/chartSummary';
import type { Lang } from '../engine/names';
import { LOCALE, useText } from '../i18n';
import { HOROSCOPE_TEXT } from '../locales/horoscope';
import { Card } from './components';

// "In simple words": what is good in the chart, what to stay alert about, and what to do — the chart
// reading boiled down for someone who has never studied Jyotisha (engine/chartSummary.ts).
export function ChartSummaryCard({ chart, lang, onFull }: { chart: BirthChart; lang: Lang; onFull: () => void }) {
  const { x } = useText(HOROSCOPE_TEXT);
  const loc = LOCALE[lang];
  const s = useMemo(() => {
    const monthYear = (d: Date) => new Intl.DateTimeFormat(loc, { month: 'short', year: 'numeric' }).format(d);
    return chartSummary(chart, new Date(), lang, monthYear);
  }, [chart, lang, loc]);

  return (
    <Card title={x('summaryTitle')}>
      <p style={{ marginTop: 0 }}>{s.overall}</p>
      {s.good.length > 0 && <>
        <h3 className="small">💪 {x('goodTitle')}</h3>
        <ul className="insights">{s.good.map((t) => <li key={t} className="good">{t}</li>)}</ul>
      </>}
      {s.care.length > 0 && <>
        <h3 className="small">👀 {x('careTitle')}</h3>
        <ul className="insights">{s.care.map((t) => <li key={t} className="caution">{t}</li>)}</ul>
      </>}
      <h3 className="small">🙏 {x('doTitle')}</h3>
      <ul style={{ paddingLeft: 18, margin: 0 }}>{s.todo.map((t) => <li key={t} className="small" style={{ marginBottom: 4 }}>{t}</li>)}</ul>
      {s.period && <>
        <h3 className="small">⏳ {x('periodTitle')}</h3>
        <p className="small" style={{ marginTop: 0 }}>{s.period}</p>
      </>}
      <button className="btn ghost small" onClick={onFull}>{x('fullReading')}</button>
    </Card>
  );
}
