// A full reading of the birth chart, by classical Parashari rules: each graha's dignity and
// strength, the twelve houses (lord placement, occupants, Ashtakavarga), yogas, Saturn's phases
// (Sade Sati, Ashtama, Ardhashtama) and the Lagna, Moon-sign and birth-star nature.
// Like the rest of the Horoscope tab, every result is phrased as a strength or as a gentle caution
// with something constructive to do — never as a prediction of misfortune.
import { grahaName } from './horoscope';
import { GRAHAS, SIGN_LORD, grahaSidereal, type BirthChart, type Graha, type GrahaPosition } from './jyotish';
import type { Lang } from './names';
import { chartText, type YogaId } from '../locales/chartReading';
import { readingText } from '../locales/reading';

const mod12 = (n: number) => ((n % 12) + 12) % 12;
/** House of `rashi` counted from `from` (1..12). */
const houseOf = (from: number, rashi: number) => mod12(rashi - from) + 1;

type Seven = Exclude<Graha, 'rahu' | 'ketu'>;
const SEVEN: Seven[] = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];
const isSeven = (g: Graha): g is Seven => g !== 'rahu' && g !== 'ketu';

// ---- Dignity -------------------------------------------------------------------------------

const EXALT: Record<Seven, number> = { sun: 0, moon: 1, mars: 9, mercury: 5, jupiter: 3, venus: 11, saturn: 6 };
const MOOLATRIKONA: Record<Seven, number> = { sun: 4, moon: 1, mars: 0, mercury: 5, jupiter: 8, venus: 6, saturn: 10 };
// Natural friendships (Parashara): [friends, enemies]; the rest are neutral.
const RELATION: Record<Seven, [Seven[], Seven[]]> = {
  sun: [['moon', 'mars', 'jupiter'], ['venus', 'saturn']],
  moon: [['sun', 'mercury'], []],
  mars: [['sun', 'moon', 'jupiter'], ['mercury']],
  mercury: [['sun', 'venus'], ['moon']],
  jupiter: [['sun', 'moon', 'mars'], ['mercury', 'venus']],
  venus: [['mercury', 'saturn'], ['sun', 'moon']],
  saturn: [['mercury', 'venus'], ['sun', 'moon', 'mars']],
};
/** Degrees from the Sun within which a planet is combust (Mercury and Venus less when retrograde). */
const COMBUST: Partial<Record<Seven, [number, number]>> = { moon: [12, 12], mars: [17, 17], mercury: [14, 12], jupiter: [11, 11], venus: [10, 8], saturn: [15, 15] };
/** House where each planet gains directional strength (Dig bala). */
const DIGBALA: Record<Seven, number> = { sun: 10, mars: 10, moon: 4, venus: 4, mercury: 1, jupiter: 1, saturn: 7 };

export type Dignity = 'exalted' | 'moolatrikona' | 'own' | 'friend' | 'neutral' | 'enemy' | 'debilitated';

export function dignityOf(g: Graha, rashi: number): Dignity | null {
  if (!isSeven(g)) return null;
  if (EXALT[g] === rashi) return 'exalted';
  if (mod12(EXALT[g] + 6) === rashi) return 'debilitated';
  if (MOOLATRIKONA[g] === rashi) return 'moolatrikona';
  const lord = SIGN_LORD[rashi] as Graha;
  if (lord === g) return 'own';
  const [friends, enemies] = RELATION[g];
  if (friends.includes(lord as Seven)) return 'friend';
  if (enemies.includes(lord as Seven)) return 'enemy';
  return 'neutral';
}


const angularDistance = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

// ---- Ashtakavarga (Parashara) -------------------------------------------------------------------

// For each planet's Bhinnashtakavarga: the houses, counted from each contributor (the seven
// planets and the Lagna), in which that contributor gives a benefic point (bindu).
type Contributor = Seven | 'lagna';
const BAV: Record<Seven, Record<Contributor, number[]>> = {
  sun: { sun: [1, 2, 4, 7, 8, 9, 10, 11], moon: [3, 6, 10, 11], mars: [1, 2, 4, 7, 8, 9, 10, 11], mercury: [3, 5, 6, 9, 10, 11, 12], jupiter: [5, 6, 9, 11], venus: [6, 7, 12], saturn: [1, 2, 4, 7, 8, 9, 10, 11], lagna: [3, 4, 6, 10, 11, 12] },
  moon: { sun: [3, 6, 7, 8, 10, 11], moon: [1, 3, 6, 7, 10, 11], mars: [2, 3, 5, 6, 9, 10, 11], mercury: [1, 3, 4, 5, 7, 8, 10, 11], jupiter: [1, 4, 7, 8, 10, 11, 12], venus: [3, 4, 5, 7, 9, 10, 11], saturn: [3, 5, 6, 11], lagna: [3, 6, 10, 11] },
  mars: { sun: [3, 5, 6, 10, 11], moon: [3, 6, 11], mars: [1, 2, 4, 7, 8, 10, 11], mercury: [3, 5, 6, 11], jupiter: [6, 10, 11, 12], venus: [6, 8, 11, 12], saturn: [1, 4, 7, 8, 9, 10, 11], lagna: [1, 3, 6, 10, 11] },
  mercury: { sun: [5, 6, 9, 11, 12], moon: [2, 4, 6, 8, 10, 11], mars: [1, 2, 4, 7, 8, 9, 10, 11], mercury: [1, 3, 5, 6, 9, 10, 11, 12], jupiter: [6, 8, 11, 12], venus: [1, 2, 3, 4, 5, 8, 9, 11], saturn: [1, 2, 4, 7, 8, 9, 10, 11], lagna: [1, 2, 4, 6, 8, 10, 11] },
  jupiter: { sun: [1, 2, 3, 4, 7, 8, 9, 10, 11], moon: [2, 5, 7, 9, 11], mars: [1, 2, 4, 7, 8, 10, 11], mercury: [1, 2, 4, 5, 6, 9, 10, 11], jupiter: [1, 2, 3, 4, 7, 8, 10, 11], venus: [2, 5, 6, 9, 10, 11], saturn: [3, 5, 6, 12], lagna: [1, 2, 4, 5, 6, 7, 9, 10, 11] },
  venus: { sun: [8, 11, 12], moon: [1, 2, 3, 4, 5, 8, 9, 11, 12], mars: [3, 5, 6, 9, 11, 12], mercury: [3, 5, 6, 9, 11], jupiter: [5, 8, 9, 10, 11], venus: [1, 2, 3, 4, 5, 8, 9, 10, 11], saturn: [3, 4, 5, 8, 9, 10, 11], lagna: [1, 2, 3, 4, 5, 8, 9, 11] },
  saturn: { sun: [1, 2, 4, 7, 8, 10, 11], moon: [3, 6, 11], mars: [3, 5, 6, 10, 11, 12], mercury: [6, 8, 9, 10, 11, 12], jupiter: [5, 6, 11, 12], venus: [6, 11, 12], saturn: [3, 5, 6, 11], lagna: [1, 3, 4, 6, 10, 11] },
};

export interface Ashtakavarga {
  /** Bindus per planet per sign (index 0 = Mesha). */
  bav: Record<Seven, number[]>;
  /** Sarvashtakavarga: the total per sign (they add up to 337). */
  sav: number[];
}

/** Needs the Lagna, so only when the birth time is known. */
export function ashtakavarga(chart: BirthChart): Ashtakavarga | null {
  if (!chart.lagna) return null;
  const rashiOfC = (c: Contributor) => (c === 'lagna' ? chart.lagna!.rashi : chart.grahas.find((p) => p.graha === c)!.rashi);
  const bav = {} as Record<Seven, number[]>;
  const sav = Array(12).fill(0);
  for (const g of SEVEN) {
    const row = Array(12).fill(0);
    for (const [c, houses] of Object.entries(BAV[g]) as Array<[Contributor, number[]]>) {
      for (const h of houses) row[mod12(rashiOfC(c) + h - 1)]++;
    }
    bav[g] = row;
    row.forEach((n, i) => { sav[i] += n; });
  }
  return { bav, sav };
}

// ---- Planets ---------------------------------------------------------------------------------

export type Strength = 'strong' | 'steady' | 'care';

export interface PlanetReading {
  graha: Graha;
  rashi: number;
  house: number;
  dignity: Dignity | null;
  retro: boolean;
  combust: boolean;
  vargottama: boolean;
  digbala: boolean;
  neechaBhanga: boolean;
  strength: Strength;
  text: string;
  tip?: string;
}




const fill = (t: string, v: Record<string, string>) => Object.entries(v).reduce((s, [k, x]) => s.split(`{${k}}`).join(x), t);

function planetReadings(chart: BirthChart, ref: number, lang: Lang): PlanetReading[] {
  const T = chartText(lang);
  const sun = chart.grahas.find((p) => p.graha === 'sun')!;
  const moonRashi = chart.moon.rashi;
  return chart.grahas.map((p) => {
    const g = p.graha;
    const house = houseOf(ref, p.rashi);
    const dignity = dignityOf(g, p.rashi);
    const c = isSeven(g) ? COMBUST[g] : undefined;
    const combust = !!c && angularDistance(p.lon, sun.lon) < (p.retro ? c[1] : c[0]);
    const vargottama = p.rashi === p.navamsa;
    const digbala = isSeven(g) && !!chart.lagna && DIGBALA[g] === house;
    // Neecha bhanga: the lord of the debilitation sign, or of the exaltation sign, is in a kendra from the Lagna or the Moon.
    let neechaBhanga = false;
    if (dignity === 'debilitated' && isSeven(g)) {
      const lords = [SIGN_LORD[p.rashi], SIGN_LORD[EXALT[g]]] as Graha[];
      neechaBhanga = lords.some((l) => {
        const lp = chart.grahas.find((x) => x.graha === l)!;
        return [1, 4, 7, 10].includes(houseOf(ref, lp.rashi)) || [1, 4, 7, 10].includes(houseOf(moonRashi, lp.rashi));
      });
    }
    let score = { exalted: 2, moolatrikona: 2, own: 2, friend: 1, neutral: 0, enemy: -1, debilitated: neechaBhanga ? 0 : -2 }[dignity ?? 'neutral'];
    if (digbala) score += 1;
    if (vargottama) score += 1;
    if (combust) score -= 1;
    const natural = ['sun', 'mars', 'saturn', 'rahu', 'ketu'].includes(g) ? 'malefic' : 'benefic';
    if ([1, 4, 5, 7, 9, 10].includes(house)) score += 1;
    if (natural === 'malefic' && [3, 6, 11].includes(house)) score += 1;
    if ([6, 8, 12].includes(house) && !(natural === 'malefic' && house === 6)) score -= 1;
    const strength: Strength = score >= 2 ? 'strong' : score <= -1 ? 'care' : 'steady';

    const name = grahaName(g, lang);
    const sig = readingText(lang).dashaTheme[g];
    const parts = [
      fill(dignity ? T.dignityLine[dignity] : T.nodeLine, { g: name, s: sig }),
      fill(T.inHouse, { h: T.ord(house), name: T.houseName[house - 1] }),
    ];
    if (neechaBhanga) parts.push(T.neechaBhanga);
    if (vargottama) parts.push(T.vargottama);
    if (digbala) parts.push(T.digbala);
    if (p.retro && isSeven(g) && g !== 'sun' && g !== 'moon') parts.push(T.retro);
    if (combust) parts.push(T.combust);
    return { graha: g, rashi: p.rashi, house, dignity, retro: p.retro, combust, vargottama, digbala, neechaBhanga, strength, text: parts.join(' '), tip: strength === 'care' ? T.remedy[g] : undefined };
  });
}

// ---- Houses ------------------------------------------------------------------------------------

export interface HouseReading {
  house: number;
  rashi: number;
  lord: Graha;
  lordHouse: number;
  occupants: Graha[];
  /** Sarvashtakavarga bindus of the house's sign (when the birth time is known). */
  bindus?: number;
  strength: Strength;
  text: string;
  tip?: string;
}

// Where the house lord sits; the wording is in ChartText.lordLine, in the same order.
const LORD_LINE: Array<[number[], Strength | null]> = [
  [[1, 4, 7, 10], 'strong'],
  [[5, 9], 'strong'],
  [[2, 11], null],
  [[3], null],
  [[6, 8, 12], 'care'],
];
const BENEFICS: Graha[] = ['jupiter', 'venus', 'mercury', 'moon'];

function houseReadings(ref: number, planets: PlanetReading[], av: Ashtakavarga | null, lang: Lang): HouseReading[] {
  const T = chartText(lang);
  return Array.from({ length: 12 }, (_, i) => {
    const house = i + 1;
    const rashi = mod12(ref + i);
    const lord = SIGN_LORD[rashi] as Graha;
    const lp = planets.find((p) => p.graha === lord)!;
    const occupants = planets.filter((p) => p.house === house).map((p) => p.graha);
    const li = LORD_LINE.findIndex(([hs]) => hs.includes(lp.house));
    const lean = LORD_LINE[li][1];
    let score = (lean === 'strong' ? 1 : lean === 'care' ? -1 : 0) + (lp.strength === 'strong' ? 1 : lp.strength === 'care' ? -1 : 0);
    const bindus = av?.sav[rashi];
    if (bindus !== undefined) score += bindus >= 30 ? 1 : bindus < 25 ? -1 : 0;
    for (const o of occupants) {
      if (BENEFICS.includes(o)) score += 1;
      else if (![3, 6, 10, 11].includes(house)) score -= 0.5;
    }
    const strength: Strength = score >= 1.5 ? 'strong' : score <= -1.5 ? 'care' : 'steady';
    const lordName = grahaName(lord, lang);
    const parts = [fill(T.houseLord, { h: T.ord(house), name: T.houseName[i], lord: lordName, lh: T.ord(lp.house) }), T.lordLine[li]];
    const names = (gs: Graha[]) => gs.map((g) => grahaName(g, lang)).join(', ');
    const one = (pair: [string, string], gs: Graha[]) => fill(pair[gs.length === 1 ? 0 : 1], { g: names(gs) });
    const ben = occupants.filter((o) => BENEFICS.includes(o));
    const mal = occupants.filter((o) => !BENEFICS.includes(o));
    if (ben.length) parts.push(one(T.brighten, ben));
    if (mal.length) parts.push(one([3, 6, 10, 11].includes(house) ? T.drive : T.patience, mal));
    if (bindus !== undefined) parts.push(fill(T.bindus, { n: String(bindus), q: T.bindusQ[bindus >= 30 ? 0 : bindus >= 25 ? 1 : 2] }));
    return { house, rashi, lord, lordHouse: lp.house, occupants, bindus, strength, text: parts.join(' '), tip: strength === 'care' ? T.remedy[lord] : undefined };
  });
}

// ---- Yogas ---------------------------------------------------------------------------------------

export interface YogaReading { id: YogaId; name: string; tone: 'good' | 'caution'; text: string; tip?: string }


function yogas(chart: BirthChart, ref: number, planets: PlanetReading[], lang: Lang): YogaReading[] {
  const T = chartText(lang);
  const out: YogaReading[] = [];
  const at = (g: Graha) => chart.grahas.find((p) => p.graha === g)!;
  const moon = at('moon').rashi;
  const fromMoon = (g: Graha) => houseOf(moon, at(g).rashi);
  const name = (g: Graha) => grahaName(g, lang);
  const push = (id: YogaId, p?: string) => {
    const y = T.yoga[id];
    out.push({ id, name: y.name, tone: id === 'kemadruma' || id === 'kalasarpa' ? 'caution' : 'good', text: fill(y.text, { p: p ?? '' }), tip: y.tip });
  };
  const pair = (p: string) => p.split('+').map((g) => name(g as Graha)).join(T.and);
  const timeKnown = !!chart.lagna;
  const lordOf = (h: number) => SIGN_LORD[mod12(ref + h - 1)] as Graha;

  if ([1, 4, 7, 10].includes(fromMoon('jupiter'))) push('gajakesari');
  if (at('sun').rashi === at('mercury').rashi) push('budhaditya');
  if (at('moon').rashi === at('mars').rashi) push('chandramangala');
  if (timeKnown) {
    const MAHA: Array<[Seven, YogaId]> = [['mars', 'ruchaka'], ['mercury', 'bhadra'], ['jupiter', 'hamsa'], ['venus', 'malavya'], ['saturn', 'sasa']];
    for (const [g, id] of MAHA) {
      const pr = planets.find((p) => p.graha === g)!;
      if ([1, 4, 7, 10].includes(pr.house) && ['exalted', 'own', 'moolatrikona'].includes(pr.dignity ?? '')) push(id);
    }
    // Raja yoga: a kendra lord and a trikona lord (different planets) together in one sign, or exchanging signs.
    const kendra = [1, 4, 7, 10].map(lordOf), trikona = [5, 9, 1].map(lordOf);
    const pairs = new Set<string>();
    for (const k of kendra) for (const t of trikona) {
      if (k === t) continue;
      const together = at(k).rashi === at(t).rashi;
      const exchange = SIGN_LORD[at(k).rashi] === t && SIGN_LORD[at(t).rashi] === k;
      if (together || exchange) pairs.add([k, t].sort().join('+'));
    }
    if (pairs.size) push('raja', [...pairs].map(pair).join('; '));
    // Dhana yoga: a lord of the 2nd or 11th with a lord of the 5th or 9th.
    const dhana = new Set<string>();
    for (const w of [2, 11].map(lordOf)) for (const f of [5, 9].map(lordOf)) {
      if (w !== f && at(w).rashi === at(f).rashi) dhana.add([w, f].sort().join('+'));
    }
    if (dhana.size) push('dhana', [...dhana].map(pair).join('; '));
    // Viparita raja yoga: a lord of the 6th, 8th or 12th placed in the 6th, 8th or 12th.
    const vip = [6, 8, 12].filter((h) => { const l = lordOf(h); return [6, 8, 12].includes(houseOf(ref, at(l).rashi)) && houseOf(ref, at(l).rashi) !== h; }).map((h) => name(lordOf(h)));
    if (vip.length) push('viparita', [...new Set(vip)].join(', '));
    // Amala: a natural benefic in the 10th from the Lagna.
    if (planets.some((p) => p.house === 10 && ['jupiter', 'venus', 'mercury'].includes(p.graha))) push('amala');
  }
  const nb = planets.filter((p) => p.neechaBhanga).map((p) => name(p.graha));
  if (nb.length) push('neechabhanga', nb.join(', '));
  // Parivartana: any two planets each in the other's sign.
  const swaps = new Set<string>();
  for (const a of SEVEN) for (const b of SEVEN) {
    if (a < b && SIGN_LORD[at(a).rashi] === b && SIGN_LORD[at(b).rashi] === a) swaps.add(name(a) + T.and + name(b));
  }
  if (swaps.size) push('parivartana', [...swaps].join('; '));
  // Adhi: at least two of Mercury, Jupiter, Venus in the 6th, 7th or 8th from the Moon.
  if ((['mercury', 'jupiter', 'venus'] as Graha[]).filter((g) => [6, 7, 8].includes(fromMoon(g))).length >= 2) push('adhi');
  // Sunapha / Anapha / Kemadruma: planets other than the Sun and the nodes in the 2nd or 12th from the Moon.
  const beside = (['mars', 'mercury', 'jupiter', 'venus', 'saturn'] as Graha[]).filter((g) => [2, 12].includes(fromMoon(g)));
  const withMoon = (['mars', 'mercury', 'jupiter', 'venus', 'saturn'] as Graha[]).some((g) => fromMoon(g) === 1);
  const kendraFromMoon = (['mars', 'mercury', 'jupiter', 'venus', 'saturn'] as Graha[]).some((g) => [4, 7, 10].includes(fromMoon(g)));
  if (beside.length) push('sunapha');
  else if (!withMoon && !kendraFromMoon) push('kemadruma');
  // Kala Sarpa: all seven planets within the half of the zodiac from Rahu to Ketu (either direction).
  const rahu = at('rahu').lon;
  const offsets = SEVEN.map((g) => (at(g).lon - rahu + 360) % 360);
  if (offsets.every((o) => o < 180) || offsets.every((o) => o > 180)) push('kalasarpa');
  return out;
}

// ---- Saturn phases (Sade Sati, Ashtama, Ardhashtama) -------------------------------------------

export interface SaturnPhase { kind: 'sadesati' | 'ashtama' | 'ardhashtama'; start: Date; end: Date }

/** Saturn's phases from the Moon sign between `from` and `to`, scanning week by week. */
export function saturnPhases(chart: BirthChart, from: Date, to: Date): SaturnPhase[] {
  const moon = chart.moon.rashi;
  const kindAt = (d: Date): SaturnPhase['kind'] | null => {
    const h = houseOf(moon, Math.floor(grahaSidereal('saturn', d) / 30));
    return [12, 1, 2].includes(h) ? 'sadesati' : h === 8 ? 'ashtama' : h === 4 ? 'ardhashtama' : null;
  };
  const out: SaturnPhase[] = [];
  const step = 7 * 86400000;
  let cur: SaturnPhase | null = null;
  for (let t = from.getTime(); t <= to.getTime(); t += step) {
    const d = new Date(t);
    const k = kindAt(d);
    if (cur && k === cur.kind) { cur.end = d; continue; }
    // Retrograde loops can dip out of a phase for a few months; treat short gaps as the same phase.
    if (cur && !k) {
      const ahead = [60, 120, 180, 240].map((days) => kindAt(new Date(t + days * 86400000)));
      if (ahead.includes(cur.kind)) { cur.end = d; continue; }
    }
    if (cur) out.push(cur);
    cur = k ? { kind: k, start: d, end: d } : null;
  }
  if (cur) out.push(cur);
  return out;
}


// ---- Nature: Lagna, Moon sign and birth star ------------------------------------------------------



// ---- The whole reading -----------------------------------------------------------------------------

export interface ChartReading {
  /** Houses are counted from the Lagna, or from the Moon sign (Chandra Lagna) when the birth time is unknown. */
  fromLagna: boolean;
  nature: Array<{ title: string; text: string }>;
  planets: PlanetReading[];
  houses: HouseReading[];
  yogas: YogaReading[];
  ashtakavarga: Ashtakavarga | null;
  saturn: { current?: SaturnPhase; next?: SaturnPhase; nextSadeSati?: SaturnPhase };
}

export function chartReading(chart: BirthChart, now: Date, lang: Lang = 'en'): ChartReading {
  const ref = chart.lagna?.rashi ?? chart.moon.rashi;
  const planets = planetReadings(chart, ref, lang);
  const av = ashtakavarga(chart);
  const phases = saturnPhases(chart, new Date(now.getTime() - 8 * 365 * 86400000), new Date(now.getTime() + 32 * 365 * 86400000));
  const current = phases.find((p) => p.start <= now && p.end >= now);
  const next = phases.find((p) => p.start > now);
  const nextSadeSati = phases.find((p) => p.kind === 'sadesati' && p.start > now);
  const nature: ChartReading['nature'] = [];
  const T = chartText(lang);
  if (chart.lagna) nature.push({ title: T.lagnaTitle, text: fill(T.lagnaText, { x: T.signNature[chart.lagna.rashi] }) });
  nature.push({ title: T.moonTitle, text: fill(T.moonText, { x: T.signNature[chart.moon.rashi] }) });
  nature.push({ title: T.starTitle, text: fill(T.starText, { x: T.nakshatraNature[chart.moon.nakshatra] }) });
  return {
    fromLagna: !!chart.lagna,
    nature,
    planets,
    houses: houseReadings(ref, planets, av, lang),
    yogas: yogas(chart, ref, planets, lang),
    ashtakavarga: av,
    saturn: { current, next, nextSadeSati },
  };
}

export const GRAHA_ORDER = GRAHAS;
export type { GrahaPosition };
