// Traditional Muhurta screening. This encodes widely cited general rules (Rikta thithis, nakshatra
// classes, inauspicious yogas, Vishti karana, unsuitable months, Guru/Shukra moudhyami) and removes
// Rahu Kalam, Yamagandam, Gulika, Durmuhurtam and Varjyam from the windows. Personal Tarabala /
// Chandrabala is applied by muhurtamFinder.ts. Lagna shuddhi is not checked, so marriage muhurtas
// should still be confirmed with a priest.
import { grahaSidereal, isRetrograde } from './jyotish';
import { isVishti, karanaName, nakshatraName, tithiFullName, yogaName, monthName } from './names';
import { dayPanchang, type DayPanchang, type Place, type Span } from './panchang';
import { type CivilDate } from './tz';

export type Activity =
  | 'marriage' | 'engagement' | 'housewarming' | 'property' | 'business' | 'vehicle' | 'travel'
  | 'naming' | 'annaprasana' | 'aksharabhyasam' | 'upanayanam' | 'general';

export const ACTIVITY_LABEL: Record<Activity, string> = {
  business: 'starting a business or new project',
  property: 'buying or registering property',
  housewarming: 'a housewarming (Gruha Pravesham)',
  travel: 'starting a journey',
  vehicle: 'buying a vehicle',
  marriage: 'a marriage',
  engagement: 'an engagement (Nischitartham)',
  naming: 'a naming ceremony (Namakaranam)',
  annaprasana: 'Annaprasana (first rice feeding)',
  aksharabhyasam: 'Aksharabhyasam (start of learning)',
  upanayanam: 'Upanayanam (sacred thread ceremony)',
  general: 'an auspicious beginning',
};

// Nakshatra classes (Muhurta Chintamani tradition).
const DHRUVA = [3, 11, 20, 25];         // fixed: Rohini, U.Phalguni, U.Ashadha, U.Bhadrapada
const MRIDU = [4, 13, 16, 26];          // soft: Mrigashira, Chitra, Anuradha, Revati
const KSHIPRA = [0, 7, 12];             // swift: Ashwini, Pushya, Hasta
const CHARA = [6, 14, 21, 22, 23];      // movable: Punarvasu, Swati, Shravana, Dhanishta, Shatabhisha
const UGRA = [1, 9, 10, 19, 24];        // fierce
const TIKSHNA = [5, 8, 17, 18];         // sharp

const FAVORED_NAK: Record<Activity, number[]> = {
  business: [...KSHIPRA, ...DHRUVA, ...MRIDU],
  property: [...DHRUVA, ...MRIDU],
  housewarming: [...DHRUVA, ...MRIDU, 22, 23],
  travel: [...KSHIPRA, ...CHARA, ...MRIDU],
  vehicle: [...KSHIPRA, ...CHARA, ...MRIDU],
  marriage: [3, 4, 9, 11, 12, 14, 16, 18, 20, 25, 26],
  engagement: [3, 4, 9, 11, 12, 14, 16, 18, 20, 25, 26],
  naming: [...KSHIPRA, ...DHRUVA, ...MRIDU, ...CHARA],
  annaprasana: [...KSHIPRA, ...DHRUVA, ...MRIDU, ...CHARA],
  aksharabhyasam: [...KSHIPRA, ...MRIDU, 6, 14, 21, 22, 23],
  upanayanam: [...KSHIPRA, ...DHRUVA, ...MRIDU, 6, 14, 21, 22],
  general: [...KSHIPRA, ...DHRUVA, ...MRIDU],
};

const AVOID_WEEKDAY: Partial<Record<Activity, number[]>> = {
  business: [2, 6], property: [2, 6], housewarming: [0, 2], vehicle: [2, 6], general: [2],
  marriage: [2], engagement: [2], naming: [2, 6], annaprasana: [2, 6], aksharabhyasam: [2, 6], upanayanam: [2, 6],
};
// Lunar months traditionally avoided: Ashadha, Bhadrapada and Pushya for weddings and Gruha Pravesham.
const AVOID_MONTH: Partial<Record<Activity, number[]>> = { housewarming: [3, 5, 9], marriage: [3, 5, 9], engagement: [3, 5, 9], upanayanam: [3, 5, 9] };
/** Activities blocked while Jupiter or Venus is combust (Guru / Shukra moudhyami). */
const MOUDHYAMI: Activity[] = ['marriage', 'engagement', 'housewarming', 'upanayanam'];
/** Activities whose muhurtams may also fall at night (Telugu weddings are often held after sunset). */
const NIGHT_OK: Activity[] = ['marriage', 'engagement'];

/** Durmuhurtam: which of the 15 daytime muhurtas (1-based) are inauspicious, by weekday. */
const DURMUHURTAM: number[][] = [[14], [9, 12], [4], [8], [6, 12], [4, 9], [1, 2]];
/**
 * Varjyam: start of the inauspicious span, in ghatis (of 60) into each nakshatra; it lasts 4 ghatis.
 * Values follow the common Telugu panchangam table (some lists differ for Ardra and Mula).
 */
const VARJYAM_GHATI = [50, 24, 30, 40, 14, 21, 30, 20, 32, 30, 20, 18, 21, 20, 14, 14, 10, 14, 20, 24, 20, 10, 10, 18, 16, 24, 30];

/** Is Jupiter / Venus combust (too close to the Sun to be seen)? Guru 11°, Shukra 10° (8° retrograde). */
export function moudhyami(date: Date): { guru: boolean; shukra: boolean } {
  const sun = grahaSidereal('sun', date);
  const sep = (g: 'jupiter' | 'venus') => Math.abs(((grahaSidereal(g, date) - sun + 540) % 360) - 180);
  return { guru: sep('jupiter') < 11, shukra: sep('venus') < (isRetrograde('venus', date) ? 8 : 10) };
}

export function durmuhurtam(p: DayPanchang): Span[] {
  const m = (p.sunset.getTime() - p.sunrise.getTime()) / 15;
  return DURMUHURTAM[p.weekday].map((k) => ({ start: new Date(p.sunrise.getTime() + (k - 1) * m), end: new Date(p.sunrise.getTime() + k * m) }));
}

export function varjyam(p: DayPanchang): Span[] {
  const out: Span[] = [];
  for (const n of p.nakshatras) {
    const len = n.end.getTime() - n.start.getTime();
    const start = n.start.getTime() + (VARJYAM_GHATI[n.index] / 60) * len;
    const span = { start: new Date(start), end: new Date(start + (4 / 60) * len) };
    if (span.end > p.sunrise && span.start < p.nextSunrise) out.push(span);
  }
  return out;
}

const RIKTA = [3, 8, 13, 18, 23, 28];
const BAD_YOGA = [0, 5, 8, 9, 12, 14, 16, 18, 26];

export type Verdict = 'favorable' | 'mixed' | 'avoid';

export interface Factor { good: boolean; text: string }

export interface Window extends Span { tithi: number; nakshatra: number }

export interface DayAssessment {
  date: CivilDate;
  activity: Activity;
  verdict: Verdict;
  score: number;
  factors: Factor[];
  /** Daytime windows passing the thithi/nakshatra/karana screen, with Rahu, Yama and Gulika removed. */
  windows: Window[];
  avoid: Array<{ name: string; span: Span }>;
  panchang: DayPanchang;
}

function evalSegment(activity: Activity, tithi: number, nak: number, karana: number, yoga: number): { ok: boolean; factors: Factor[] } {
  const f: Factor[] = [];
  if (tithi === 29) f.push({ good: false, text: `${tithiFullName(tithi)} (new moon) is traditionally avoided for new beginnings.` });
  else if (RIKTA.includes(tithi)) f.push({ good: false, text: `${tithiFullName(tithi)} is a Rikta ("empty") thithi, traditionally avoided for starting things.` });
  else if ((activity === 'marriage' || activity === 'engagement') && tithi % 15 === 7) f.push({ good: false, text: `${tithiFullName(tithi)} is traditionally avoided for weddings.` });
  else f.push({ good: true, text: `${tithiFullName(tithi)} is not among the traditionally avoided thithis.` });

  if (FAVORED_NAK[activity].includes(nak)) f.push({ good: true, text: `${nakshatraName(nak)} nakshatra is traditionally recommended for ${ACTIVITY_LABEL[activity]}.` });
  else if (UGRA.includes(nak) || TIKSHNA.includes(nak)) f.push({ good: false, text: `${nakshatraName(nak)} is an Ugra/Tikshna (fierce/sharp) nakshatra, traditionally avoided for auspicious beginnings.` });
  else f.push({ good: false, text: `${nakshatraName(nak)} is not among the nakshatras usually chosen for ${ACTIVITY_LABEL[activity]}.` });

  if (isVishti(karana)) f.push({ good: false, text: `${karanaName(karana)} karana is traditionally avoided.` });
  if (BAD_YOGA.includes(yoga)) f.push({ good: false, text: `${yogaName(yoga)} yoga is considered inauspicious.` });
  return { ok: f.every((x) => x.good), factors: f };
}

function subtract(spans: Span[], cut: Span): Span[] {
  const out: Span[] = [];
  for (const s of spans) {
    if (cut.end <= s.start || cut.start >= s.end) { out.push(s); continue; }
    if (cut.start > s.start) out.push({ start: s.start, end: cut.start });
    if (cut.end < s.end) out.push({ start: cut.end, end: s.end });
  }
  return out;
}

export function assessDay(date: CivilDate, place: Place, activity: Activity): DayAssessment {
  const p = dayPanchang(date, place);
  const factors: Factor[] = [];

  const sunriseSeg = evalSegment(activity, p.tithis[0].index, p.nakshatras[0].index, p.karanas[0].index, p.yogas[0].index);
  factors.push(...sunriseSeg.factors);

  const wdAvoid = AVOID_WEEKDAY[activity] ?? [];
  if (wdAvoid.includes(p.weekday)) factors.push({ good: false, text: `This weekday is commonly avoided for ${ACTIVITY_LABEL[activity]}.` });
  if (p.month.adhika && activity !== 'travel') {
    factors.push({ good: false, text: `${monthName(p.month.index, 'en', true)} (an intercalary month) is traditionally avoided for ceremonies and major purchases.` });
  }
  if ((AVOID_MONTH[activity] ?? []).includes(p.month.index)) {
    factors.push({ good: false, text: `${monthName(p.month.index)} masam is traditionally avoided for ${ACTIVITY_LABEL[activity]}.` });
  }
  let combust = false;
  if (MOUDHYAMI.includes(activity)) {
    const m = moudhyami(new Date((p.sunrise.getTime() + p.sunset.getTime()) / 2));
    if (m.guru) factors.push({ good: false, text: 'Guru moudhyami (Jupiter combust) — traditionally no weddings, housewarmings or upanayanam.' });
    if (m.shukra) factors.push({ good: false, text: 'Shukra moudhyami (Venus combust) — traditionally no weddings, housewarmings or upanayanam.' });
    combust = m.guru || m.shukra;
  }

  // Split daytime at every limb change and keep segments that pass the screen.
  const dayEnd = (NIGHT_OK.includes(activity) ? p.nextSunrise : p.sunset).getTime();
  const cuts = new Set<number>([p.sunrise.getTime(), p.sunset.getTime(), dayEnd]);
  for (const list of [p.tithis, p.nakshatras, p.karanas, p.yogas]) {
    for (const s of list) {
      for (const t of [s.start.getTime(), s.end.getTime()]) if (t > p.sunrise.getTime() && t < dayEnd) cuts.add(t);
    }
  }
  const pts = [...cuts].sort((a, b) => a - b);
  // Adjacent spans come from independent root searches and may leave sub-second gaps; take the
  // last span that has started by `t`.
  const find = <T extends Span & { index: number }>(list: T[], t: number) =>
    [...list].reverse().find((s) => s.start.getTime() <= t + 2000) ?? list[0];
  const blocked = combust || wdAvoid.includes(p.weekday) || (p.month.adhika && activity !== 'travel') || (AVOID_MONTH[activity] ?? []).includes(p.month.index);
  let good: Window[] = [];
  if (!blocked) {
    for (let i = 0; i < pts.length - 1; i++) {
      if (pts[i + 1] - pts[i] < 60000) continue;
      const mid = (pts[i] + pts[i + 1]) / 2;
      const ti = find(p.tithis, mid).index, ni = find(p.nakshatras, mid).index;
      const seg = evalSegment(activity, ti, ni, find(p.karanas, mid).index, find(p.yogas, mid).index);
      if (seg.ok) good.push({ start: new Date(pts[i]), end: new Date(pts[i + 1]), tithi: ti, nakshatra: ni });
    }
  }
  const avoid = [
    { name: 'Rahu Kalam', span: p.rahuKalam },
    { name: 'Yamagandam', span: p.yamagandam },
    { name: 'Gulika Kalam', span: p.gulikaKalam },
    ...durmuhurtam(p).map((span) => ({ name: 'Durmuhurtam', span })),
    ...varjyam(p).map((span) => ({ name: 'Varjyam', span })),
  ];
  for (const a of avoid) {
    good = good.flatMap((w) => subtract([w], a.span).map((s) => ({ ...w, ...s })));
  }
  good = good.filter((w) => w.end.getTime() - w.start.getTime() >= 20 * 60000);

  const bad = factors.filter((f) => !f.good).length;
  const score = factors.filter((f) => f.good).length - bad * 2 + (good.length ? 2 : 0);
  const verdict: Verdict = good.length && bad === 0 ? 'favorable' : good.length ? 'mixed' : 'avoid';
  if (good.length && bad > 0) {
    factors.push({ good: true, text: 'Conditions change during the day — the windows listed below meet the traditional thithi and nakshatra screen.' });
  }
  return { date, activity, verdict, score, factors, windows: good, avoid, panchang: p };
}

export const MUHURTA_ASSUMPTIONS =
  'Screened with general Muhurta rules: Rikta thithis and Amavasya avoided, nakshatra classes suited to the activity, ' +
  'inauspicious yogas and Vishti karana avoided, unsuitable weekdays and months (and Guru/Shukra moudhyami for weddings and housewarmings) skipped, ' +
  'and Rahu Kalam, Yamagandam, Gulika Kalam, Durmuhurtam and Varjyam removed. Not considered: Lagna shuddhi or family customs.';
