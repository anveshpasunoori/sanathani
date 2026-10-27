// Daily Panchangam: the five limbs (Thithi, Vara, Nakshatra, Yoga, Karana) computed for a
// civil date at a specific location, using sunrise as the start of the Hindu day.
import {
  elongation, findCrossing, findPrevCrossing, moonrise, moonSidereal, nextElongation,
  sunEvent, sunSidereal,
} from './astro';
import { lunarMonthAt, samvatsaraAt, type LunarMonth } from './lunar';
import { addDays, civilDateOf, startOfCivilDay, weekdayOf, zonedToUtc, parseCivil, type CivilDate } from './tz';

export interface Place { name: string; lat: number; lon: number; tz: string }

export interface Span { start: Date; end: Date }
export interface LimbSpan extends Span { index: number }

const NAK = 360 / 27;

export function tithiIndexAt(d: Date): number {
  return Math.floor(elongation(d) / 12) % 30;
}

/** The full span of the Thithi prevailing at `d`. */
export function tithiSpanAt(d: Date): LimbSpan {
  const index = tithiIndexAt(d);
  const start = nextElongation(index * 12, new Date(d.getTime() - 2 * 86400000), 2.2)!;
  const end = nextElongation(((index + 1) * 12) % 360, d, 2)!;
  return { index, start, end };
}

export function nakshatraIndexAt(d: Date): number {
  return Math.floor(moonSidereal(d) / NAK) % 27;
}

export function nakshatraSpanAt(d: Date): LimbSpan {
  const index = nakshatraIndexAt(d);
  const start = findPrevCrossing(moonSidereal, index * NAK, d, 1.6)!;
  const end = findCrossing(moonSidereal, ((index + 1) % 27) * NAK, d, 1.6)!;
  return { index, start, end };
}

const yogaAngle = (d: Date) => (sunSidereal(d) + moonSidereal(d)) % 360;

export function yogaSpanAt(d: Date): LimbSpan {
  const index = Math.floor(yogaAngle(d) / NAK) % 27;
  const start = findPrevCrossing(yogaAngle, index * NAK, d, 1.6)!;
  const end = findCrossing(yogaAngle, ((index + 1) % 27) * NAK, d, 1.6)!;
  return { index, start, end };
}

export function karanaSpanAt(d: Date): LimbSpan {
  const index = Math.floor(elongation(d) / 6) % 60;
  const start = nextElongation(index * 6, new Date(d.getTime() - 86400000), 1.2)!;
  const end = nextElongation(((index + 1) * 6) % 360, d, 1.2)!;
  return { index, start, end };
}

/** Collect consecutive spans of a limb covering [from, to). */
function spansCovering(first: LimbSpan, to: Date, next: (d: Date) => LimbSpan): LimbSpan[] {
  const out = [first];
  while (out[out.length - 1].end.getTime() < to.getTime()) {
    out.push(next(new Date(out[out.length - 1].end.getTime() + 1000)));
  }
  return out;
}

export interface DayPanchang {
  date: CivilDate;
  place: Place;
  weekday: number;
  sunrise: Date;
  sunset: Date;
  nextSunrise: Date;
  /** True when the sun did not rise/set (polar latitudes); 06:00/18:00 local was used. */
  sunApproximated: boolean;
  moonrise: Date | null;
  /** Thithis overlapping the Hindu day (sunrise → next sunrise); [0] prevails at sunrise. */
  tithis: LimbSpan[];
  nakshatras: LimbSpan[];
  yogas: LimbSpan[];
  karanas: LimbSpan[];
  month: LunarMonth;
  samvatsara: number;
  shakaYear: number;
  rahuKalam: Span;
  yamagandam: Span;
  gulikaKalam: Span;
  /** Null on Wednesdays, when Abhijit is traditionally not used. */
  abhijit: Span | null;
}

// 1-based segment (of 8 daytime parts) per weekday, Sunday first.
const RAHU = [8, 2, 7, 5, 6, 4, 3];
const YAMA = [5, 4, 3, 2, 1, 7, 6];
const GULIKA = [7, 6, 5, 4, 3, 2, 1];

function part(sr: Date, ss: Date, seg: number, of: number): Span {
  const len = (ss.getTime() - sr.getTime()) / of;
  return { start: new Date(sr.getTime() + (seg - 1) * len), end: new Date(sr.getTime() + seg * len) };
}

export function sunTimes(date: CivilDate, place: Place): { sunrise: Date; sunset: Date; approx: boolean } {
  const midnight = startOfCivilDay(date, place.tz);
  const sr = sunEvent(place, 1, midnight, 1);
  const ss = sr ? sunEvent(place, -1, sr, 1) : null;
  if (sr && ss && civilDateOf(sr, place.tz) === date) return { sunrise: sr, sunset: ss, approx: false };
  const { y, m, d } = parseCivil(date);
  return { sunrise: zonedToUtc(y, m, d, 6, 0, place.tz), sunset: zonedToUtc(y, m, d, 18, 0, place.tz), approx: true };
}

export function sunriseOf(date: CivilDate, place: Place): Date {
  return sunTimes(date, place).sunrise;
}

const cache = new Map<string, DayPanchang>();

export function dayPanchang(date: CivilDate, place: Place): DayPanchang {
  const key = `${date}|${place.lat}|${place.lon}|${place.tz}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const { sunrise, sunset, approx } = sunTimes(date, place);
  const nextSunrise = sunTimes(addDays(date, 1), place).sunrise;
  const weekday = weekdayOf(date);

  const tithis = spansCovering(tithiSpanAt(sunrise), nextSunrise, tithiSpanAt);
  const nakshatras = spansCovering(nakshatraSpanAt(sunrise), nextSunrise, nakshatraSpanAt);
  const yogas = spansCovering(yogaSpanAt(sunrise), nextSunrise, yogaSpanAt);
  const karanas = spansCovering(karanaSpanAt(sunrise), nextSunrise, karanaSpanAt);
  const month = lunarMonthAt(sunrise);
  const { samvatsara, shakaYear } = samvatsaraAt(sunrise, month);

  const dayLen = sunset.getTime() - sunrise.getTime();
  const mid = sunrise.getTime() + dayLen / 2;
  const muhurta = dayLen / 15;

  const result: DayPanchang = {
    date, place, weekday, sunrise, sunset, nextSunrise, sunApproximated: approx,
    moonrise: moonrise(place, startOfCivilDay(date, place.tz), 1),
    tithis, nakshatras, yogas, karanas, month, samvatsara, shakaYear,
    rahuKalam: part(sunrise, sunset, RAHU[weekday], 8),
    yamagandam: part(sunrise, sunset, YAMA[weekday], 8),
    gulikaKalam: part(sunrise, sunset, GULIKA[weekday], 8),
    abhijit: weekday === 3 ? null : { start: new Date(mid - muhurta / 2), end: new Date(mid + muhurta / 2) },
  };
  if (cache.size > 2000) cache.clear();
  cache.set(key, result);
  return result;
}
