// Life themes by Vimshottari dasha. Each period's themes come from (a) the houses its lord
// occupies and rules in this chart (whole-sign, from Lagna — or from the Moon when the birth time
// is unknown) and (b) the planet's natural significations. These are the traditional associations
// a jyotishi reads; they describe areas of life in focus, never events that will happen.
import { grahaName } from './horoscope';
import { SIGN_LORD, vimshottari, type BirthChart, type DashaPeriod, type Graha, type MahaDasha } from './jyotish';
import type { Lang } from './names';
import { fill, readingText } from '../locales/reading';

type Text = { en: string; te: string };


export type LifeArea = 'marriage' | 'children' | 'career' | 'home' | 'education' | 'wealth' | 'abroad' | 'spiritual';

export const LIFE_AREAS: Record<LifeArea, { name: Text; icon: string; main: number[]; support: number[]; karaka: Graha[] }> = {
  marriage: { name: { en: 'Marriage & partnership', te: 'వివాహం & భాగస్వామ్యం' }, icon: '💍', main: [7], support: [2, 11], karaka: ['venus', 'jupiter'] },
  children: { name: { en: 'Children & family growth', te: 'సంతానం & కుటుంబ వృద్ధి' }, icon: '👶', main: [5], support: [9, 2], karaka: ['jupiter'] },
  career: { name: { en: 'Career & recognition', te: 'ఉద్యోగం & గుర్తింపు' }, icon: '💼', main: [10], support: [6, 11], karaka: ['saturn', 'sun', 'mercury'] },
  home: { name: { en: 'Home, property & vehicles', te: 'ఇల్లు, ఆస్తి & వాహనాలు' }, icon: '🏠', main: [4], support: [2, 11], karaka: ['mars', 'venus', 'moon'] },
  education: { name: { en: 'Education & learning', te: 'విద్య & అభ్యాసం' }, icon: '🎓', main: [5, 9], support: [4, 2], karaka: ['mercury', 'jupiter'] },
  wealth: { name: { en: 'Wealth & gains', te: 'ధనం & లాభాలు' }, icon: '💰', main: [2, 11], support: [9, 5], karaka: ['jupiter', 'venus'] },
  abroad: { name: { en: 'Travel & life abroad', te: 'విదేశ ప్రయాణం & నివాసం' }, icon: '✈️', main: [12, 9], support: [3, 7], karaka: ['rahu', 'moon'] },
  spiritual: { name: { en: 'Spiritual growth & pilgrimage', te: 'ఆధ్యాత్మిక అభివృద్ధి & తీర్థయాత్ర' }, icon: '🪔', main: [9, 12], support: [5, 8], karaka: ['ketu', 'jupiter'] },
};
export const AREA_ORDER: LifeArea[] = ['marriage', 'children', 'career', 'home', 'education', 'wealth', 'abroad', 'spiritual'];

export interface Placement {
  graha: Graha;
  /** House occupied (1..12) from the reference point. */
  occupies: number;
  /** Houses ruled. Rahu and Ketu rule none; they act through the sign lord they occupy. */
  rules: number[];
  /** For Rahu/Ketu: the lord of the sign they sit in. */
  dispositor?: Graha;
}

export interface ChartBasis { fromLagna: boolean; ref: number; placements: Record<Graha, Placement> }

export function chartBasis(chart: BirthChart): ChartBasis {
  const ref = chart.lagna?.rashi ?? chart.moon.rashi;
  const house = (rashi: number) => ((rashi - ref + 12) % 12) + 1;
  const placements = {} as Record<Graha, Placement>;
  for (const g of chart.grahas) {
    const rules = g.graha === 'rahu' || g.graha === 'ketu' ? [] : SIGN_LORD.map((l, r) => (l === g.graha ? house(r) : 0)).filter(Boolean);
    placements[g.graha] = { graha: g.graha, occupies: house(g.rashi), rules, dispositor: rules.length ? undefined : SIGN_LORD[g.rashi] };
  }
  return { fromLagna: !!chart.lagna, ref, placements };
}

/** Houses a planet activates in its period, strongest first (occupied, ruled, then via dispositor). */
export function housesOf(b: ChartBasis, g: Graha): number[] {
  const p = b.placements[g];
  const via = p.dispositor ? [b.placements[p.dispositor].occupies, ...b.placements[p.dispositor].rules] : [];
  return [...new Set([p.occupies, ...p.rules, ...via])];
}

/** How strongly a planet's period connects to a life area (0 = not at all). */
/** A reason a period links to a life area, worded later in the reader's language. */
export interface Why { key: keyof ReturnType<typeof readingText>['why']; g: Graha; h?: number }

export function areaLink(b: ChartBasis, g: Graha, area: LifeArea): { score: number; why: Why[] } {
  const a = LIFE_AREAS[area];
  const p = b.placements[g];
  const why: Why[] = [];
  let score = 0;
  for (const h of a.main) {
    if (p.occupies === h) { score += 2; why.push({ key: 'sits', g, h }); }
    if (p.rules.includes(h)) { score += 2; why.push({ key: 'rules', g, h }); }
    if (p.dispositor && b.placements[p.dispositor].rules.includes(h)) { score += 1; why.push({ key: 'actsFor', g, h }); }
  }
  for (const h of a.support) {
    if (p.occupies === h || p.rules.includes(h)) { score += 1; why.push({ key: 'linked', g, h }); break; }
  }
  if (a.karaka.includes(g)) { score += 1; why.push({ key: 'karaka', g }); }
  return { score, why };
}

export interface PeriodThemes {
  lord: Graha;
  houses: number[];
  areas: string[];
  nature: string;
}

export function periodThemes(b: ChartBasis, g: Graha, lang: Lang = 'en'): PeriodThemes {
  const R = readingText(lang);
  const houses = housesOf(b, g);
  return { lord: g, houses, areas: houses.slice(0, 3).map((h) => R.houseTheme[h - 1]), nature: R.dashaTheme[g] };
}

export interface AreaPeriod extends DashaPeriod {
  maha: Graha;
  score: number;
  why: string[];
}

/**
 * Antardashas (from `from`, for `years`) most strongly linked to a life area. The maha dasha sets
 * the backdrop and the antardasha the focus, so both lords count; the antardasha weighs a little more.
 */
export function periodsForArea(chart: BirthChart, area: LifeArea, from: Date, years: number, lang: Lang = 'en'): AreaPeriod[] {
  const b = chartBasis(chart);
  const R = readingText(lang);
  const word = (w: Why) => fill(R.why[w.key], { g: grahaName(w.g, lang), h: w.h ? R.ord(w.h) : '' });
  const until = from.getTime() + years * 365.25 * 86400000;
  const out: AreaPeriod[] = [];
  for (const m of vimshottari(chart.instant, chart.moon.lon)) {
    const ml = areaLink(b, m.lord, area);
    for (const a of m.antar) {
      if (a.end.getTime() <= from.getTime() || a.start.getTime() >= until) continue;
      const al = areaLink(b, a.lord, area);
      const score = ml.score + al.score * 1.2;
      if (score < 3 || (ml.score === 0 && al.score < 3) || (al.score === 0 && ml.score < 3)) continue;
      const why = [...new Set([...ml.why, ...(a.lord === m.lord ? [] : al.why)].map(word))];
      out.push({ ...a, maha: m.lord, score, why });
    }
  }
  return out;
}

export function lifeTimeline(chart: BirthChart): MahaDasha[] {
  const end = chart.instant.getTime() + 100 * 365.25 * 86400000;
  return vimshottari(chart.instant, chart.moon.lon).filter((m) => m.start.getTime() < end);
}


export const lifeThemesNote = (lang: Lang) => readingText(lang).lifeNote;
