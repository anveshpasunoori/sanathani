// Personal readings built from classical Gochara (transit) rules, read from the Janma Rashi
// (Moon sign) and Janma Nakshatra, as Telugu panchangams do. Every rule result is phrased
// either as encouragement or as a gentle caution with something constructive to do; the
// readings never predict misfortune.
import { findCrossing, moonSidereal } from './astro';
import { type Graha, dashaAt, grahaSidereal, nakshatraOf, nextSignChange, rashiOf, vimshottari, type BirthChart } from './jyotish';
import { sanskritName, type Lang } from './names';
import { astroLabel } from '../locales/astro';
import { fill, readingText } from '../locales/reading';
import { dayPanchang, type Place } from './panchang';
import { addDays, weekdayOf, type CivilDate } from './tz';

type Text = { en: string; te: string };

export interface Insight {
  tone: 'good' | 'caution';
  title: string;
  text: string;
  tip?: string;
}

export const GRAHA_NAME: Record<Graha, Text> = {
  sun: { en: 'Sun (Surya)', te: 'సూర్యుడు' }, moon: { en: 'Moon (Chandra)', te: 'చంద్రుడు' },
  mars: { en: 'Mars (Kuja)', te: 'కుజుడు' }, mercury: { en: 'Mercury (Budha)', te: 'బుధుడు' },
  jupiter: { en: 'Jupiter (Guru)', te: 'గురువు' }, venus: { en: 'Venus (Shukra)', te: 'శుక్రుడు' },
  saturn: { en: 'Saturn (Shani)', te: 'శని' }, rahu: { en: 'Rahu', te: 'రాహువు' }, ketu: { en: 'Ketu', te: 'కేతువు' },
};
export const GRAHA_SHORT: Record<Graha, Text> = {
  sun: { en: 'Su', te: 'ర' }, moon: { en: 'Mo', te: 'చం' }, mars: { en: 'Ma', te: 'కు' }, mercury: { en: 'Me', te: 'బు' },
  jupiter: { en: 'Ju', te: 'గు' }, venus: { en: 'Ve', te: 'శు' }, saturn: { en: 'Sa', te: 'శ' }, rahu: { en: 'Ra', te: 'రా' }, ketu: { en: 'Ke', te: 'కే' },
};
export const grahaName = (g: Graha, lang: Lang) => astroLabel(GRAHA_NAME[g], lang, (l) => l.graha[g]);
export const grahaShort = (g: Graha, lang: Lang) => astroLabel(GRAHA_SHORT[g], lang, (l) => l.short[g]);

// ---- Tara bala: the day's nakshatra counted from the Janma Nakshatra ---------------------

// Wording for each tara is in src/locales/reading.ts (ReadingText.tara), in the same order.
const TARA: Array<{ name: Text; good: boolean }> = [
  { name: { en: 'Janma Tara', te: 'జన్మ తార' }, good: false },
  { name: { en: 'Sampat Tara', te: 'సంపత్ తార' }, good: true },
  { name: { en: 'Vipat Tara', te: 'విపత్ తార' }, good: false },
  { name: { en: 'Kshema Tara', te: 'క్షేమ తార' }, good: true },
  { name: { en: 'Pratyak Tara', te: 'ప్రత్యక్ తార' }, good: false },
  { name: { en: 'Sadhana Tara', te: 'సాధన తార' }, good: true },
  { name: { en: 'Naidhana Tara', te: 'నైధన తార' }, good: false },
  { name: { en: 'Mitra Tara', te: 'మిత్ర తార' }, good: true },
  { name: { en: 'Parama Mitra Tara', te: 'పరమ మిత్ర తార' }, good: true },
];

/** Name of the tara numbered 1–9 in the chosen language. */
export const taraName = (n: number, lang: Lang) => sanskritName(TARA[n - 1].name.en, TARA[n - 1].name.te, lang);

export function taraOf(janmaNak: number, dayNak: number) {
  const n = ((dayNak - janmaNak + 27) % 27) % 9;
  return { number: n + 1, ...TARA[n] };
}

// ---- Chandra gochara: the Moon's sign counted from the Janma Rashi -----------------------

// Whether the Moon's transit house from the Moon sign is favourable; wording in ReadingText.moonHouse.
const MOON_HOUSE_GOOD = [true, false, true, false, false, true, true, false, false, true, true, false];

export const houseFrom = (fromRashi: number, rashi: number) => ((rashi - fromRashi + 12) % 12) + 1;

const COLOR: Text[] = [
  { en: 'Orange / red', te: 'కాషాయం / ఎరుపు' }, { en: 'White / silver', te: 'తెలుపు / వెండి' }, { en: 'Red / coral', te: 'ఎరుపు / పగడం' },
  { en: 'Green', te: 'ఆకుపచ్చ' }, { en: 'Yellow / gold', te: 'పసుపు / బంగారు' }, { en: 'White / pastel', te: 'తెలుపు / లేత రంగులు' },
  { en: 'Blue / dark', te: 'నీలం / ముదురు' },
];
const WEEKDAY_DEITY: Text[] = [
  { en: 'Surya', te: 'సూర్యుడు' }, { en: 'Shiva', te: 'శివుడు' }, { en: 'Hanuman / Subrahmanya', te: 'హనుమంతుడు / సుబ్రహ్మణ్యుడు' },
  { en: 'Vishnu / Ganesha', te: 'విష్ణువు / గణపతి' }, { en: 'Dattatreya / Guru', te: 'దత్తాత్రేయుడు / గురువు' },
  { en: 'Lakshmi', te: 'లక్ష్మీదేవి' }, { en: 'Venkateswara / Hanuman', te: 'వేంకటేశ్వరుడు / హనుమంతుడు' },
];

export type DayTone = 'favourable' | 'steady' | 'gentle';

export interface DailyReading {
  date: CivilDate;
  tone: DayTone;
  moonRashi: number;
  moonHouse: number;
  tara: ReturnType<typeof taraOf>;
  /** When the day's nakshatra changes before next sunrise, the tara from then on. */
  laterTara?: { from: Date; tara: ReturnType<typeof taraOf> };
  chandrashtama: boolean;
  insights: Insight[];
  color: string;
  deity: string;
}

/** Reading for one Hindu day (sunrise to sunrise) at `place`. */
export function dailyReading(chart: BirthChart, date: CivilDate, place: Place, lang: Lang = 'en'): DailyReading {
  const p = dayPanchang(date, place);
  const janmaRashi = chart.moon.rashi, janmaNak = chart.moon.nakshatra;
  const moonRashi = rashiOf(moonSidereal(p.sunrise));
  const moonHouse = houseFrom(janmaRashi, moonRashi);
  const tara = taraOf(janmaNak, p.nakshatras[0].index);
  const n2 = p.nakshatras[1];
  const laterTara = n2 && n2.start < p.sunset ? { from: n2.start, tara: taraOf(janmaNak, n2.index) } : undefined;
  const R = readingText(lang);
  const mhGood = MOON_HOUSE_GOOD[moonHouse - 1];
  const mh = R.moonHouse[moonHouse - 1], tl = R.tara[tara.number - 1];
  const insights: Insight[] = [
    { tone: mhGood ? 'good' : 'caution', title: fill(R.chandraBala, { h: R.ord(moonHouse) }), text: mh.text, tip: mh.tip },
    { tone: tara.good ? 'good' : 'caution', title: fill(R.taraBala, { name: taraName(tara.number, lang) }), text: tl.text, tip: tl.tip },
  ];
  const goodCount = Number(mhGood) + Number(tara.good);
  const tone: DayTone = moonHouse === 8 ? 'gentle' : goodCount === 2 ? 'favourable' : goodCount === 1 ? 'steady' : 'gentle';
  const wd = weekdayOf(date);
  return { date, tone, moonRashi, moonHouse, tara, laterTara, chandrashtama: moonHouse === 8, insights, color: astroLabel(COLOR[wd], lang, (l) => l.colour[wd]), deity: astroLabel(WEEKDAY_DEITY[wd], lang, (l) => l.deity[wd]) };
}

export const TONE_LABEL: Record<DayTone, Text> = {
  favourable: { en: 'Favourable day', te: 'అనుకూలమైన రోజు' },
  steady: { en: 'Steady day', te: 'స్థిరమైన రోజు' },
  gentle: { en: 'Go-gently day', te: 'నిదానంగా ఉండే రోజు' },
};

/** Days in the next `days` whose Chandra bala and Tara bala are both favourable. */
export function goodDays(chart: BirthChart, from: CivilDate, days: number, place: Place): CivilDate[] {
  const out: CivilDate[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(from, i);
    if (dailyReading(chart, d, place).tone === 'favourable') out.push(d);
  }
  return out;
}

/** Chandrashtama periods (Moon in the 8th sign from Janma Rashi) overlapping [from, from+days]. */
export function chandrashtamaPeriods(chart: BirthChart, from: Date, days: number): Array<{ start: Date; end: Date }> {
  const sign = (chart.moon.rashi + 7) % 12;
  const out: Array<{ start: Date; end: Date }> = [];
  const limit = from.getTime() + days * 86400000;
  // If already inside, find when it began.
  let t = from;
  if (rashiOf(moonSidereal(from)) === sign) {
    const back = findCrossing(moonSidereal, sign * 30, new Date(from.getTime() - 3 * 86400000), 3);
    const end = findCrossing(moonSidereal, ((sign + 1) % 12) * 30, from, 3);
    if (back && end) { out.push({ start: back, end }); t = end; }
  }
  while (t.getTime() < limit) {
    const start = findCrossing(moonSidereal, sign * 30, t, 30);
    if (!start || start.getTime() > limit) break;
    const end = findCrossing(moonSidereal, ((sign + 1) % 12) * 30, start, 4);
    if (!end) break;
    out.push({ start, end });
    t = end;
  }
  return out;
}

// ---- Slow-planet transits (the bigger picture) -----------------------------------------

// Houses from the Moon sign where each slow planet's transit is favourable; wording in ReadingText.transit.
const TRANSIT_GOOD: Record<'jupiter' | 'saturn' | 'rahu' | 'ketu', number[]> = { jupiter: [2, 5, 7, 9, 11], saturn: [3, 6, 11], rahu: [3, 6, 11], ketu: [3, 6, 11] };

export interface TransitInsight extends Insight {
  graha: Graha;
  rashi: number;
  house: number;
  until?: Date;
  nextRashi?: number;
  special?: string;
}

export function transits(chart: BirthChart, now: Date, lang: Lang = 'en'): TransitInsight[] {
  const R = readingText(lang);
  const out: TransitInsight[] = [];
  for (const g of ['jupiter', 'saturn', 'rahu', 'ketu'] as const) {
    const rule = R.transit[g];
    const rashi = rashiOf(grahaSidereal(g, now));
    const house = houseFrom(chart.moon.rashi, rashi);
    const good = TRANSIT_GOOD[g].includes(house);
    const change = nextSignChange(g, now, g === 'saturn' ? 1100 : 600);
    let special: string | undefined;
    if (g === 'saturn' && [12, 1, 2].includes(house)) {
      const phase = house === 12 ? 1 : house === 1 ? 2 : 3;
      special = fill(R.sadeSati, { n: phase });
    } else if (g === 'saturn' && house === 8) special = R.ashtama;
    else if (g === 'saturn' && house === 4) special = R.ardhashtama;
    out.push({
      graha: g, rashi, house, until: change?.date, nextRashi: change?.rashi, special,
      tone: good ? 'good' : 'caution',
      title: grahaName(g, lang),
      text: good ? rule.good : rule.caution,
      tip: good ? undefined : rule.tip,
    });
  }
  return out;
}

// ---- Dasha themes ----------------------------------------------------------------------


export function dashaReading(chart: BirthChart, now: Date, lang: Lang = 'en') {
  const periods = vimshottari(chart.instant, chart.moon.lon);
  const cur = dashaAt(periods, now);
  if (!cur) return null;
  const R = readingText(lang);
  const text = fill(R.dashaText, { maha: grahaName(cur.maha.lord, lang), mt: R.dashaTheme[cur.maha.lord], antar: grahaName(cur.antar.lord, lang), at: R.dashaTheme[cur.antar.lord] });
  return { periods, ...cur, text, tip: R.dashaCare[cur.antar.lord] };
}

export function janmaNakshatraOf(chart: BirthChart) {
  return nakshatraOf(chart.moon.lon);
}


export const horoscopeAssumptions = (lang: Lang) => readingText(lang).assumptions;
