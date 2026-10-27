// Vedic birth chart (Jathakam) primitives: sidereal graha positions, Lagna, Navamsa and
// Vimshottari dasha. Same astronomy core and Lahiri ayanamsa as the Panchangam, so the
// Janma Nakshatra here always agrees with the calendar.
import * as A from 'astronomy-engine';
import { lahiriAyanamsa, moonSidereal, sunSidereal } from './astro';

export type Graha = 'sun' | 'moon' | 'mars' | 'mercury' | 'jupiter' | 'venus' | 'saturn' | 'rahu' | 'ketu';
export const GRAHAS: Graha[] = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];

const DAY_MS = 86400000;
const norm = (x: number) => ((x % 360) + 360) % 360;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

const BODY: Partial<Record<Graha, A.Body>> = {
  mars: A.Body.Mars, mercury: A.Body.Mercury, jupiter: A.Body.Jupiter, venus: A.Body.Venus, saturn: A.Body.Saturn,
};

/** Mean lunar ascending node (Meeus 47.7), tropical degrees. Rahu uses the mean node, as most Indian panchangams do. */
export function meanNodeTropical(date: Date): number {
  const T = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / (36525 * DAY_MS);
  return norm(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T * T * T) / 467441 - (T * T * T * T) / 60616000);
}

/** Geocentric sidereal (Lahiri) ecliptic longitude of a graha, degrees 0..360. */
export function grahaSidereal(g: Graha, date: Date): number {
  switch (g) {
    case 'sun': return sunSidereal(date);
    case 'moon': return moonSidereal(date);
    case 'rahu': return norm(meanNodeTropical(date) - lahiriAyanamsa(date));
    case 'ketu': return norm(meanNodeTropical(date) + 180 - lahiriAyanamsa(date));
    default: return norm(A.Ecliptic(A.GeoVector(BODY[g]!, date, true)).elon - lahiriAyanamsa(date));
  }
}

export function isRetrograde(g: Graha, date: Date): boolean {
  if (g === 'rahu' || g === 'ketu') return true;
  if (g === 'sun' || g === 'moon') return false;
  const a = grahaSidereal(g, new Date(date.getTime() - DAY_MS / 2));
  const b = grahaSidereal(g, new Date(date.getTime() + DAY_MS / 2));
  return ((b - a + 540) % 360) - 180 < 0;
}

/** Tropical ascendant (rising ecliptic degree) for a moment and place. */
export function ascendantTropical(date: Date, lat: number, lon: number): number {
  const time = A.MakeTime(date);
  const ramc = rad(norm((A.SiderealTime(time) + lon / 15) * 15));
  const eps = rad(A.e_tilt(time).tobl);
  const asc = Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(rad(lat)) * Math.sin(eps)));
  return norm(deg(asc));
}

export function ascendantSidereal(date: Date, lat: number, lon: number): number {
  return norm(ascendantTropical(date, lat, lon) - lahiriAyanamsa(date));
}

/** Lord of each sign, Mesha … Meena. */
export const SIGN_LORD: Graha[] = ['mars', 'venus', 'mercury', 'moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'saturn', 'jupiter'];

export const rashiOf = (lon: number) => Math.floor(norm(lon) / 30);
export const nakshatraOf = (lon: number) => Math.floor(norm(lon) / (360 / 27));
export const padaOf = (lon: number) => Math.floor((norm(lon) % (360 / 27)) / (360 / 108)) + 1;
/** Navamsa (D9) sign: each sign is split into nine 3°20′ parts, counted continuously from Mesha. */
export const navamsaOf = (lon: number) => Math.floor(norm(lon) / (30 / 9)) % 12;

export interface Point {
  lon: number;
  rashi: number;
  degInSign: number;
  nakshatra: number;
  pada: number;
  navamsa: number;
}

export function point(lon: number): Point {
  const l = norm(lon);
  return { lon: l, rashi: rashiOf(l), degInSign: l % 30, nakshatra: nakshatraOf(l), pada: padaOf(l), navamsa: navamsaOf(l) };
}

export interface GrahaPosition extends Point {
  graha: Graha;
  retro: boolean;
  /** Whole-sign house from Lagna (1..12), when the birth time is known. */
  house?: number;
}

export interface ChartInput {
  instant: Date;
  lat: number;
  lon: number;
  timeKnown: boolean;
}

export interface BirthChart {
  instant: Date;
  timeKnown: boolean;
  ayanamsa: number;
  lagna?: Point;
  grahas: GrahaPosition[];
  moon: GrahaPosition;
}

export function birthChart({ instant, lat, lon, timeKnown }: ChartInput): BirthChart {
  const lagna = timeKnown ? point(ascendantSidereal(instant, lat, lon)) : undefined;
  const grahas = GRAHAS.map((g): GrahaPosition => {
    const p = point(grahaSidereal(g, instant));
    return { ...p, graha: g, retro: isRetrograde(g, instant), house: lagna ? ((p.rashi - lagna.rashi + 12) % 12) + 1 : undefined };
  });
  return { instant, timeKnown, ayanamsa: lahiriAyanamsa(instant), lagna, grahas, moon: grahas[1] };
}

// ---- Vimshottari dasha -------------------------------------------------------------------

export const DASHA_ORDER: Graha[] = ['ketu', 'venus', 'sun', 'moon', 'mars', 'rahu', 'jupiter', 'saturn', 'mercury'];
export const DASHA_YEARS: Record<Graha, number> = { ketu: 7, venus: 20, sun: 6, moon: 10, mars: 7, rahu: 18, jupiter: 16, saturn: 19, mercury: 17 };
/** Vimshottari uses the 365.25-day year (as most Indian software does). */
const YEAR_MS = 365.25 * DAY_MS;

export interface DashaPeriod {
  lord: Graha;
  start: Date;
  end: Date;
}

export interface MahaDasha extends DashaPeriod {
  antar: DashaPeriod[];
}

export const nakshatraLord = (nak: number) => DASHA_ORDER[nak % 9];

/** Maha dashas (with antardashas) from birth, covering one full 120-year cycle. */
export function vimshottari(birth: Date, moonLon: number): MahaDasha[] {
  const span = 360 / 27;
  const nak = nakshatraOf(moonLon);
  const elapsed = (norm(moonLon) % span) / span;
  const first = DASHA_ORDER.indexOf(nakshatraLord(nak));
  let start = birth.getTime() - elapsed * DASHA_YEARS[DASHA_ORDER[first]] * YEAR_MS;
  const out: MahaDasha[] = [];
  for (let i = 0; i < 9; i++) {
    const lord = DASHA_ORDER[(first + i) % 9];
    const len = DASHA_YEARS[lord] * YEAR_MS;
    const antar: DashaPeriod[] = [];
    let s = start;
    for (let j = 0; j < 9; j++) {
      const sub = DASHA_ORDER[(DASHA_ORDER.indexOf(lord) + j) % 9];
      const subLen = (len * DASHA_YEARS[sub]) / 120;
      antar.push({ lord: sub, start: new Date(s), end: new Date(s + subLen) });
      s += subLen;
    }
    out.push({ lord, start: new Date(start), end: new Date(start + len), antar });
    start += len;
  }
  return out;
}

export function dashaAt(periods: MahaDasha[], date: Date): { maha: MahaDasha; antar: DashaPeriod; next: DashaPeriod | null } | null {
  const t = date.getTime();
  for (let i = 0; i < periods.length; i++) {
    const maha = periods[i];
    if (t < maha.start.getTime() || t >= maha.end.getTime()) continue;
    const k = maha.antar.findIndex((a) => t >= a.start.getTime() && t < a.end.getTime());
    const next = maha.antar[k + 1] ?? periods[i + 1]?.antar[0] ?? null;
    return { maha, antar: maha.antar[k], next };
  }
  return null;
}

// ---- Transits ---------------------------------------------------------------------------

/** Next time graha `g` changes sign after `from` (daily scan, then bisection to ~1 minute). */
export function nextSignChange(g: Graha, from: Date, maxDays: number): { date: Date; rashi: number } | null {
  const r0 = rashiOf(grahaSidereal(g, from));
  const step = g === 'moon' ? DAY_MS / 8 : DAY_MS;
  let lo = from.getTime();
  for (let t = lo + step; t <= from.getTime() + maxDays * DAY_MS; t += step) {
    const r = rashiOf(grahaSidereal(g, new Date(t)));
    if (r !== r0) {
      let a = lo, b = t;
      while (b - a > 60000) {
        const mid = (a + b) / 2;
        if (rashiOf(grahaSidereal(g, new Date(mid))) === r0) a = mid; else b = mid;
      }
      return { date: new Date(b), rashi: r };
    }
    lo = t;
  }
  return null;
}
