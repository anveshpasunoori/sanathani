// Kundali matching: Ashtakoota (36-point Guna Milan) from the bride's and groom's Moon
// sign and birth star, plus Kuja (Mangal) dosha. Results are reported as traditional
// scores with the usual parihara (cancellation) rules — never as a verdict on a marriage.
import { grahaName } from './horoscope';
import { SIGN_LORD as MOON_LORD, type BirthChart, type Graha } from './jyotish';
import type { Lang } from './names';
import { matchText, type KootaKey, type VashyaGroup } from '../locales/match';
import { fill, readingText } from '../locales/reading';

export interface Koota {
  key: KootaKey;
  name: string;
  te: string;
  max: number;
  score: number;
  /** What the koota traditionally looks at. */
  about: string;
  detail: string;
  /** A classical exception applies, so the low score is traditionally set aside. */
  cancelled?: string;
}

export interface MatchResult {
  kootas: Koota[];
  total: number;
  /** Total after counting cancelled doshas at full marks (how many almanacs report it). */
  adjusted: number;
  band: 'excellent' | 'very-good' | 'good' | 'consult';
  kuja: { bride: KujaResult; groom: KujaResult; note: string };
}


// ---- 1. Varna (1) ----
const VARNA = [3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1, 4]; // 4 Brahmana … 1 Shudra, by rashi

// ---- 2. Vashya (2) ----
function vashyaOf(moonLon: number): VashyaGroup {
  const r = Math.floor(moonLon / 30), deg = moonLon % 30;
  if (r === 8) return deg < 15 ? 'Manava' : 'Chatushpada';
  if (r === 9) return deg < 15 ? 'Chatushpada' : 'Jalachara';
  return (['Chatushpada', 'Chatushpada', 'Manava', 'Jalachara', 'Vanachara', 'Manava', 'Manava', 'Keeta', '', '', 'Manava', 'Jalachara'] as const)[r] as VashyaGroup;
}
const VG: VashyaGroup[] = ['Chatushpada', 'Manava', 'Jalachara', 'Vanachara', 'Keeta'];
// Rows: groom, columns: bride.
const VASHYA_TABLE = [
  [2, 1, 1, 0.5, 1],
  [1, 2, 0.5, 0, 1],
  [1, 0.5, 2, 1, 1],
  [0.5, 0, 1, 2, 0],
  [1, 1, 1, 0, 2],
];

// ---- 4. Yoni (4) ----
// Yoni animal names (Horse … Lion) are in src/locales/match.ts.
/** Yoni animal index for each nakshatra (Ashwini … Revati). */
export const NAK_YONI = [0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1];
export const YONI_TABLE = [
  [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 3, 3, 2, 1],
  [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
  [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1],
  [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
  [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
  [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
  [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2],
  [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
  [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 1],
  [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1],
  [3, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1],
  [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
  [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2],
  [1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 2, 4],
];

// ---- 5. Graha Maitri (5): natural friendships ----
const FRIENDS: Record<string, { f: Graha[]; e: Graha[] }> = {
  sun: { f: ['moon', 'mars', 'jupiter'], e: ['venus', 'saturn'] },
  moon: { f: ['sun', 'mercury'], e: [] },
  mars: { f: ['sun', 'moon', 'jupiter'], e: ['mercury'] },
  mercury: { f: ['sun', 'venus'], e: ['moon'] },
  jupiter: { f: ['sun', 'moon', 'mars'], e: ['mercury', 'venus'] },
  venus: { f: ['mercury', 'saturn'], e: ['sun', 'moon'] },
  saturn: { f: ['mercury', 'venus'], e: ['sun', 'moon', 'mars'] },
};
export function relation(a: Graha, b: Graha): 'friend' | 'neutral' | 'enemy' {
  if (a === b) return 'friend';
  const r = FRIENDS[a];
  return r.f.includes(b) ? 'friend' : r.e.includes(b) ? 'enemy' : 'neutral';
}
function maitriScore(a: Graha, b: Graha): number {
  if (a === b) return 5;
  const pair = [relation(a, b), relation(b, a)].sort().join('+');
  return ({ 'friend+friend': 5, 'friend+neutral': 4, 'neutral+neutral': 3, 'enemy+friend': 1, 'enemy+neutral': 0.5, 'enemy+enemy': 0 } as Record<string, number>)[pair];
}

// ---- 6. Gana (6) ----
export const GANA = [0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0]; // 0 Deva, 1 Manushya, 2 Rakshasa
// Rows: bride, columns: groom.
const GANA_TABLE = [[6, 5, 1], [6, 6, 0], [0, 0, 6]];

// ---- 8. Nadi (8) ----
export const nadiOf = (nak: number) => [0, 1, 2, 2, 1, 0][nak % 6];

const taraGood = (from: number, to: number) => ![3, 5, 7].includes(((to - from + 27) % 27 + 1) % 9);

export function matchCharts(bride: BirthChart, groom: BirthChart, lang: Lang = 'en'): MatchResult {
  const T = matchText(lang);
  const bg2 = (b: string, g: string) => fill(T.brideGroom, { b, g });
  const bm = bride.moon, gm = groom.moon;
  const br = bm.rashi, gr = gm.rashi, bn = bm.nakshatra, gn = gm.nakshatra;
  const bl = MOON_LORD[br], gl = MOON_LORD[gr];
  const lordsFriendly = maitriScore(bl, gl) >= 4;
  const kootas: Koota[] = [];

  kootas.push({
    key: 'varna', name: 'Varna', te: 'వర్ణ', max: 1, score: VARNA[gr] >= VARNA[br] ? 1 : 0,
    about: T.about.varna,
    detail: bg2(T.varna[VARNA[br] - 1], T.varna[VARNA[gr] - 1]),
  });

  const bv = vashyaOf(bm.lon), gv = vashyaOf(gm.lon);
  kootas.push({
    key: 'vashya', name: 'Vashya', te: 'వశ్య', max: 2, score: VASHYA_TABLE[VG.indexOf(gv)][VG.indexOf(bv)],
    about: T.about.vashya, detail: bg2(T.vashya[bv], T.vashya[gv]),
  });

  const t1 = taraGood(bn, gn), t2 = taraGood(gn, bn);
  kootas.push({
    key: 'tara', name: 'Tara', te: 'తారా', max: 3, score: (t1 ? 1.5 : 0) + (t2 ? 1.5 : 0),
    about: T.about.tara,
    detail: T.taraDetail[t1 && t2 ? 0 : t1 || t2 ? 1 : 2],
  });

  const by = NAK_YONI[bn], gy = NAK_YONI[gn];
  kootas.push({
    key: 'yoni', name: 'Yoni', te: 'యోని', max: 4, score: YONI_TABLE[by][gy],
    about: T.about.yoni, detail: bg2(T.yoni[by], T.yoni[gy]),
  });

  kootas.push({
    key: 'maitri', name: 'Graha Maitri', te: 'గ్రహ మైత్రి', max: 5, score: maitriScore(bl, gl),
    about: T.about.maitri, detail: fill(T.lords, { b: grahaName(bl, lang), g: grahaName(gl, lang) }),
  });

  const bg = GANA[bn], gg = GANA[gn];
  const ganaScore = GANA_TABLE[bg][gg];
  kootas.push({
    key: 'gana', name: 'Gana', te: 'గణ', max: 6, score: ganaScore,
    about: T.about.gana, detail: bg2(T.gana[bg], T.gana[gg]),
    cancelled: ganaScore <= 1 && (lordsFriendly || br === gr) ? T.cancel.gana : undefined,
  });

  const d = ((gr - br + 12) % 12) + 1; // groom's sign counted from bride's
  const pair = Math.min(d, 14 - d);
  const bhakootBad = [2, 5, 6].includes(pair);
  kootas.push({
    key: 'bhakoot', name: 'Bhakoot', te: 'భకూట', max: 7, score: bhakootBad ? 0 : 7,
    about: T.about.bhakoot,
    detail: fill(T.bhakootDetail, { b: d, g: ((br - gr + 12) % 12) + 1 }),
    cancelled: bhakootBad && (bl === gl || lordsFriendly) ? T.cancel.bhakoot : undefined,
  });

  const sameNadi = nadiOf(bn) === nadiOf(gn);
  let nadiCancel: string | undefined;
  if (sameNadi) {
    if (br === gr && bn !== gn) nadiCancel = T.cancel.nadiSign;
    else if (bn === gn && br !== gr) nadiCancel = T.cancel.nadiStar;
    else if (bn === gn && bm.pada !== gm.pada) nadiCancel = T.cancel.nadiPada;
  }
  kootas.push({
    key: 'nadi', name: 'Nadi', te: 'నాడి', max: 8, score: sameNadi ? 0 : 8,
    about: T.about.nadi, detail: bg2(T.nadi[nadiOf(bn)], T.nadi[nadiOf(gn)]),
    cancelled: nadiCancel,
  });

  const total = kootas.reduce((s, k) => s + k.score, 0);
  const adjusted = kootas.reduce((s, k) => s + (k.cancelled ? k.max : k.score), 0);
  const band = adjusted >= 33 ? 'excellent' : adjusted >= 25 ? 'very-good' : adjusted >= 18 ? 'good' : 'consult';

  const kb = kujaDosha(bride, lang), kg = kujaDosha(groom, lang);
  const note = T.kujaNote[kb.present === kg.present ? (kb.present ? 0 : 1) : 2];
  return { kootas, total, adjusted, band, kuja: { bride: kb, groom: kg, note } };
}

export interface KujaResult {
  /** Dosha present after exceptions. */
  present: boolean;
  fromLagna?: number;
  fromMoon: number;
  exception?: string;
  basis: string;
}

const KUJA_HOUSES = [1, 2, 4, 7, 8, 12];

/** Mars in the 1st, 2nd, 4th, 7th, 8th or 12th from Lagna (or Moon when birth time is unknown). */
export function kujaDosha(chart: BirthChart, lang: Lang = 'en'): KujaResult {
  const T = matchText(lang), ord = readingText(lang).ord;
  const mars = chart.grahas.find((g) => g.graha === 'mars')!;
  const fromMoon = ((mars.rashi - chart.moon.rashi + 12) % 12) + 1;
  const fromLagna = chart.lagna ? ((mars.rashi - chart.lagna.rashi + 12) % 12) + 1 : undefined;
  const ref = fromLagna ?? fromMoon;
  const raw = KUJA_HOUSES.includes(ref);
  let exception: string | undefined;
  if (raw) {
    if (mars.rashi === 0 || mars.rashi === 7) exception = T.kujaOwn;
    else if (mars.rashi === 9) exception = T.kujaExalted;
  }
  return {
    present: raw && !exception, fromLagna, fromMoon, exception,
    basis: fromLagna ? fill(T.kujaFromLagna, { n: ord(fromLagna) }) : fill(T.kujaFromMoon, { n: ord(fromMoon) }),
  };
}

export const BAND_TEXT: Record<MatchResult['band'], { en: string; te: string }> = {
  excellent: { en: 'Excellent traditional match', te: 'అత్యుత్తమ పొంతన' },
  'very-good': { en: 'Very good traditional match', te: 'చాలా మంచి పొంతన' },
  good: { en: 'Good — meets the traditional 18-point guideline', te: 'మంచిది — సంప్రదాయ 18 గుణాల ప్రమాణం సరిపోతుంది' },
  consult: { en: 'Below the 18-point guideline — families usually review the full charts with an astrologer', te: '18 గుణాల కంటే తక్కువ — పూర్తి జాతకాలను జ్యోతిష్కుడితో చూపించడం సంప్రదాయం' },
};

export const matchAssumptions = (lang: Lang) => matchText(lang).assumptions;
