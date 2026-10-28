// "In simple words": a short summary of the birth-chart reading for someone who has never studied
// Jyotisha — what is good, what to be careful about, and what to do — in everyday language with the
// Jyotisha term beside it. It is built only from the chart reading itself (chartReading.ts) and the
// current Vimshottari dasha, so it never says more than the reading does; like the rest of the
// Horoscope tab it builds confidence or asks the reader to stay alert — never to be afraid.
import { chartReading, type ChartReading, type Dignity, type HouseReading, type PlanetReading } from './chartReading';
import { grahaName } from './horoscope';
import { dashaAt, vimshottari, type BirthChart, type Graha } from './jyotish';
import type { Lang } from './names';
import { chartText } from '../locales/chartReading';
import { summaryText } from '../locales/chartSummary';
import { fill, readingText } from '../locales/reading';

export interface ChartSummary {
  overall: string;
  good: string[];
  care: string[];
  todo: string[];
  period?: string;
}

// The yogas that matter most to a family, in the order to mention them.
const YOGA_ORDER = ['raja', 'hamsa', 'malavya', 'ruchaka', 'bhadra', 'sasa', 'gajakesari', 'dhana', 'neechabhanga', 'viparita', 'budhaditya', 'adhi', 'amala', 'chandramangala', 'parivartana', 'sunapha'];
const DIGNITY_RANK: Partial<Record<Dignity, number>> = { exalted: 3, moolatrikona: 2, own: 2 };

export function chartSummary(chart: BirthChart, now: Date, lang: Lang, date: (d: Date) => string, reading: ChartReading = chartReading(chart, now, lang)): ChartSummary {
  const S = summaryText(lang);
  const T = chartText(lang);
  const R = readingText(lang);
  const g = (x: Graha) => grahaName(x, lang);
  const area = (h: HouseReading) => (h.house === 8 ? S.eighth : T.houseName[h.house - 1]);
  const pts = (h: HouseReading) => (h.bindus !== undefined ? fill(S.points, { n: h.bindus }) : '');

  // What is good: the strongest yogas, houses and planets.
  const good: string[] = [];
  const goodYogas = reading.yogas.filter((y) => y.tone === 'good').sort((a, b) => YOGA_ORDER.indexOf(a.id) - YOGA_ORDER.indexOf(b.id));
  for (const y of goodYogas.slice(0, 2)) good.push(`${y.name} — ${y.text}`);
  const strongHouses = reading.houses.filter((h) => h.strength === 'strong').sort((a, b) => (b.bindus ?? 0) - (a.bindus ?? 0));
  for (const h of strongHouses.slice(0, 2)) good.push(fill(S.goodHouse, { area: area(h), h: T.ord(h.house), pts: pts(h) }));
  const strongPlanets = reading.planets.filter((p) => p.strength === 'strong' && DIGNITY_RANK[p.dignity ?? 'neutral'])
    .sort((a, b) => (DIGNITY_RANK[b.dignity!] ?? 0) - (DIGNITY_RANK[a.dignity!] ?? 0));
  for (const p of strongPlanets.slice(0, 1)) good.push(fill(S.goodPlanet, { g: g(p.graha), d: T.dignity[p.dignity!], s: R.dashaTheme[p.graha] }));

  // What to be careful about: Saturn's phase if one is running, the houses and planets that need care, cautionary yogas.
  const care: string[] = [];
  const { current: saturn } = reading.saturn;
  if (saturn) care.push(fill(S.saturnNow, { name: T.saturn[saturn.kind].name, date: date(saturn.end), text: T.saturn[saturn.kind].text }));
  const careHouses = reading.houses.filter((h) => h.strength === 'care').sort((a, b) => (a.bindus ?? 99) - (b.bindus ?? 99)).slice(0, 2);
  for (const h of careHouses) care.push(fill(S.careHouse, { area: area(h), h: T.ord(h.house), pts: pts(h) }));
  // A debilitation that is cancelled (neecha bhanga) is a strength in the making, not a caution.
  const carePlanets = reading.planets.filter((p) => p.strength === 'care' && !p.neechaBhanga).slice(0, 2);
  // Weak planets are named without labels like "debilitated" — the point is what to give attention to.
  for (const p of carePlanets) care.push(fill(S.carePlanet, { g: g(p.graha), s: R.dashaTheme[p.graha] }));
  const careYogas = reading.yogas.filter((y) => y.tone === 'caution');
  for (const y of careYogas) care.push(`${y.name} — ${y.text}`);

  // What to do: everyday habits for the areas that need care, then the traditional remedies for the
  // planets involved — the weak ones, the current dasha lords and Saturn in its phases.
  const todo: string[] = [];
  for (const h of careHouses) todo.push(S.practical[h.house - 1]);
  const periods = vimshottari(chart.instant, chart.moon.lon);
  const dasha = dashaAt(periods, now);
  const remedyFor: Graha[] = [];
  const add = (x: Graha) => { if (!remedyFor.includes(x)) remedyFor.push(x); };
  carePlanets.forEach((p: PlanetReading) => add(p.graha));
  if (saturn) add('saturn');
  if (dasha) { add(dasha.antar.lord); if (reading.planets.find((p) => p.graha === dasha.maha.lord)?.strength !== 'strong') add(dasha.maha.lord); }
  for (const x of remedyFor) todo.push(`${g(x)}: ${T.remedy[x]}`);
  for (const y of careYogas) if (y.tip) todo.push(y.tip);
  if (!todo.length) todo.push(S.keepGoing);

  const period = dasha
    ? fill(S.period, { maha: g(dasha.maha.lord), antar: g(dasha.antar.lord), date: date(dasha.antar.end), theme: R.dashaTheme[dasha.antar.lord] })
    : undefined;
  const balance = good.length - care.length;
  const overall = S.overall[balance >= 2 ? 0 : balance >= 0 ? 1 : 2];
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  return { overall, good: good.map(cap), care: care.map(cap), todo: [...new Set(todo)].slice(0, 6), period };
}
