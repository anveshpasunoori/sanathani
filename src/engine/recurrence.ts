// Annual recurrence of family events and observances.
// Step 1 resolves the original event to a lunar date (month, adhika flag, thithi).
// Step 2 finds that thithi's astronomical span in each future year's matching lunar month.
// Step 3 applies a traditional day-selection rule (the "kala" in which the thithi must prevail)
// to choose the civil date of observance at the observer's location.
import { moonrise as moonriseAfter, nextElongation } from './astro';
import { lunarMonthAt, lunarMonthsBetween, type LunarMonth } from './lunar';
import { monthName, tithiFullName, type Lang } from './names';
import { sunTimes, tithiSpanAt, type Place, type Span } from './panchang';
import {
  addDays, civil, civilDateOf, daysBetween, formatCivil, formatTime, parseCivil, startOfCivilDay,
  zonedToUtc, type CivilDate,
} from './tz';

export interface LunarDate {
  monthIndex: number;
  adhika: boolean;
  tithiIndex: number;
}

/**
 * - sunrise: thithi prevailing at sunrise (Udaya thithi) — birthdays and most anniversaries.
 * - aparahna: thithi prevailing in the afternoon (4th fifth of daytime) — Shraddha / death anniversaries.
 * - madhyahna: midday (3rd fifth) — e.g. Vinayaka Chavithi, Sri Rama Navami.
 * - pradosha: first fifth of the night after sunset — Pradosham, Deepavali Lakshmi Puja.
 * - nishita: 8th of 15 night muhurtas (around midnight) — Shivaratri, Janmashtami.
 * - moonrise: thithi at moonrise — Sankashti Chaturthi.
 */
export type ObservanceRule = 'sunrise' | 'aparahna' | 'madhyahna' | 'pradosha' | 'nishita' | 'moonrise';

/** In years with an Adhika month of the same name: observe in the Nija month only, or in both. */
export type AdhikaPolicy = 'nija' | 'both';

export interface Observance {
  date: CivilDate;
  tithi: Span & { index: number };
  month: LunarMonth;
  rule: ObservanceRule;
  /** Human-readable reason this civil date was chosen. */
  reason: string;
  /** Set when the rule could not be satisfied cleanly and a fallback was used. */
  caution?: string;
}

const RULE_LABEL: Record<ObservanceRule, string> = {
  sunrise: 'at sunrise (Udaya thithi)',
  aparahna: 'during Aparahna (afternoon)',
  madhyahna: 'at midday (Madhyahna)',
  pradosha: 'during Pradosha (after sunset)',
  nishita: 'at Nishita (around midnight)',
  moonrise: 'at moonrise',
};

export function ruleLabel(r: ObservanceRule): string {
  return RULE_LABEL[r];
}

export function windowFor(rule: ObservanceRule, date: CivilDate, place: Place): Span | Date | null {
  const { sunrise, sunset } = sunTimes(date, place);
  const next = sunTimes(addDays(date, 1), place).sunrise;
  const day = sunset.getTime() - sunrise.getTime();
  const night = next.getTime() - sunset.getTime();
  const at = (base: Date, ms: number) => new Date(base.getTime() + ms);
  switch (rule) {
    case 'sunrise': return sunrise;
    case 'aparahna': return { start: at(sunrise, (day * 3) / 5), end: at(sunrise, (day * 4) / 5) };
    case 'madhyahna': return { start: at(sunrise, (day * 2) / 5), end: at(sunrise, (day * 3) / 5) };
    case 'pradosha': return { start: sunset, end: at(sunset, night / 5) };
    case 'nishita': return { start: at(sunset, (night * 7) / 15), end: at(sunset, (night * 8) / 15) };
    case 'moonrise': {
      const mr = moonriseAfter(place, startOfCivilDay(date, place.tz), 1);
      return mr && civilDateOf(mr, place.tz) === date ? mr : null;
    }
  }
}

function overlap(a: Span, b: Span): number {
  return Math.max(0, Math.min(a.end.getTime(), b.end.getTime()) - Math.max(a.start.getTime(), b.start.getTime()));
}

/** Choose the civil date of observance for a thithi span under a rule. */
export function selectDay(tithi: Span & { index: number }, month: LunarMonth, place: Place, rule: ObservanceRule): Observance {
  const tz = place.tz;
  const first = addDays(civilDateOf(tithi.start, tz), -1);
  const last = addDays(civilDateOf(tithi.end, tz), 1);
  const candidates: CivilDate[] = [];
  for (let d = first; d <= last; d = addDays(d, 1)) candidates.push(d);
  const name = tithiFullName(tithi.index);
  const base = { tithi, month, rule };

  // Day on which the thithi begins, counted sunrise-to-sunrise; used for kshaya fallbacks.
  const occursIn = candidates.find((d) => {
    const sr = sunTimes(d, place).sunrise.getTime();
    const nsr = sunTimes(addDays(d, 1), place).sunrise.getTime();
    return sr <= tithi.start.getTime() && tithi.start.getTime() < nsr;
  })!;

  let best: { date: CivilDate; score: number } | null = null;
  for (const d of candidates) {
    const w = windowFor(rule, d, place);
    if (!w) continue;
    let score: number;
    if (w instanceof Date) {
      score = w >= tithi.start && w < tithi.end ? 1 : 0;
    } else {
      const len = w.end.getTime() - w.start.getTime();
      score = len > 0 ? overlap(w, tithi) / len : 0;
    }
    // Strictly greater: on a tie (e.g. full coverage on two days) the earlier day wins.
    if (score > 0 && (!best || score > best.score + 1e-9)) best = { date: d, score };
  }

  if (best) {
    const partial = best.score < 0.95 && rule !== 'sunrise' && rule !== 'moonrise';
    return {
      ...base,
      date: best.date,
      reason: `${name} prevails ${RULE_LABEL[rule]} on ${formatCivil(best.date)}` +
        (partial ? ` (covers ${Math.round(best.score * 100)}% of that period — the larger share).` : '.'),
    };
  }
  if (rule === 'sunrise') {
    return {
      ...base,
      date: occursIn,
      reason: `${name} does not prevail at any sunrise this year (a kshaya thithi: it begins after sunrise on ${formatCivil(occursIn)} and ends before the next sunrise), so it is observed on that day.`,
    };
  }
  return {
    ...base,
    date: occursIn,
    reason: `${name} does not touch the ${RULE_LABEL[rule].replace(/^during |^at /, '')} period on any day this year; using the day on which it begins.`,
    caution: 'Traditions differ for this case — please confirm with your family priest.',
  };
}

/** Exact astronomical span of `tithiIndex` within a lunar month. */
export function tithiSpanInMonth(tithiIndex: number, month: LunarMonth): Span & { index: number } {
  const start = tithiIndex === 0 ? month.start : nextElongation(tithiIndex * 12, month.start, 31)!;
  const end = tithiIndex === 29 ? month.end : nextElongation((tithiIndex + 1) * 12, start, 3)!;
  return { index: tithiIndex, start, end };
}

function monthMatches(m: LunarMonth, target: LunarDate, policy: AdhikaPolicy): boolean {
  const named = m.index === target.monthIndex || m.kshayaAlso === target.monthIndex;
  if (!named) return false;
  if (target.adhika) return m.adhika;
  return policy === 'both' || !m.adhika;
}

/** All observances of a lunar date whose civil date falls within [from, to]. */
export function observancesBetween(
  target: LunarDate, from: CivilDate, to: CivilDate, place: Place,
  rule: ObservanceRule = 'sunrise', policy: AdhikaPolicy = 'nija',
): Observance[] {
  const fromT = startOfCivilDay(addDays(from, -3), place.tz);
  const toT = startOfCivilDay(addDays(to, 3), place.tz);
  const out: Observance[] = [];
  for (const m of lunarMonthsBetween(fromT, toT)) {
    if (!monthMatches(m, target, policy)) continue;
    const obs = selectDay(tithiSpanInMonth(target.tithiIndex, m), m, place, rule);
    if (obs.date >= from && obs.date <= to) out.push(obs);
  }
  return out;
}

/**
 * Next observance on or after `from`. An Adhika-month original only recurs in Adhika years
 * (roughly every 2.7 years, not always the same month), so for those we fall back to the Nija
 * month when no Adhika month arrives within the next year.
 */
export function nextObservance(
  target: LunarDate, from: CivilDate, place: Place,
  rule: ObservanceRule = 'sunrise', policy: AdhikaPolicy = 'nija',
): Observance {
  const horizon = addDays(from, 400);
  const found = observancesBetween(target, from, horizon, place, rule, policy);
  if (found.length) return found[0];
  const nija = observancesBetween({ ...target, adhika: false }, from, horizon, place, rule, policy);
  return {
    ...nija[0],
    caution: `The original date was in Adhika ${monthName(target.monthIndex)}, which does not occur this year; shown in the regular (Nija) month instead.`,
  };
}

export function observancesInYear(
  target: LunarDate, year: number, place: Place, rule?: ObservanceRule, policy?: AdhikaPolicy,
): Observance[] {
  return observancesBetween(target, civil(year, 1, 1), civil(year, 12, 31), place, rule, policy);
}

// ---------- Resolving the original event ----------

export interface LunarResolution {
  /** Best determination; when `options` has several entries the user must confirm one. */
  lunar: LunarDate;
  options: Array<{ lunar: LunarDate; from: Date; to: Date; label: string }>;
  basis: 'time' | 'sunrise';
  note: string;
}

function lunarOf(d: Date): LunarDate {
  const m = lunarMonthAt(d);
  return { monthIndex: m.index, adhika: m.adhika, tithiIndex: tithiSpanAt(d).index };
}

export function describeLunar(l: LunarDate, lang: Lang = 'en'): string {
  return `${monthName(l.monthIndex, lang, l.adhika)} ${tithiFullName(l.tithiIndex, lang)}`;
}

/**
 * Determine the lunar date of an original event. With a known time, the thithi at that instant
 * is used. Without a time, if more than one thithi touched that civil day the result lists every
 * option so the UI can ask the user rather than guess.
 */
export function resolveLunarDate(date: CivilDate, time: string | undefined, place: Place): LunarResolution {
  const { y, m, d } = parseCivil(date);
  if (time) {
    const [h, mi] = time.split(':').map(Number);
    const at = zonedToUtc(y, m, d, h, mi, place.tz);
    const lunar = lunarOf(at);
    const span = tithiSpanAt(at);
    return {
      lunar, basis: 'time',
      options: [{ lunar, from: span.start, to: span.end, label: describeLunar(lunar) }],
      note: `At ${formatTime(at, place.tz)} on ${formatCivil(date)} in ${place.name}, the thithi was ${describeLunar(lunar)}.`,
    };
  }
  const dayStart = startOfCivilDay(date, place.tz);
  const dayEnd = startOfCivilDay(addDays(date, 1), place.tz);
  const options: LunarResolution['options'] = [];
  let cursor = dayStart;
  while (cursor < dayEnd) {
    const span = tithiSpanAt(cursor);
    const lunar = lunarOf(cursor);
    const from = span.start < dayStart ? dayStart : span.start;
    const to = span.end > dayEnd ? dayEnd : span.end;
    options.push({
      lunar, from, to,
      label: `${describeLunar(lunar)} — ${formatTime(from, place.tz)} to ${to.getTime() === dayEnd.getTime() ? 'midnight' : formatTime(to, place.tz)}`,
    });
    cursor = new Date(span.end.getTime() + 1000);
  }
  const sunrise = sunTimes(date, place).sunrise;
  const lunar = lunarOf(sunrise);
  const note = options.length > 1
    ? `The thithi changed during ${formatCivil(date)}. Without the time of the event we cannot know which applies — please choose, or add the time.`
    : `The whole of ${formatCivil(date)} fell in ${describeLunar(lunar)}.`;
  return { lunar, options, basis: 'sunrise', note };
}

// ---------- Gregorian recurrence ----------

/** Next anniversary on or after `from`. Feb 29 falls back to Feb 28 in common years. */
export function nextGregorian(original: CivilDate, from: CivilDate): { date: CivilDate; note?: string } {
  const o = parseCivil(original);
  const f = parseCivil(from);
  for (let y = f.y; y <= f.y + 1; y++) {
    const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    const feb29 = o.m === 2 && o.d === 29;
    const date = civil(y, o.m, feb29 && !leap ? 28 : o.d);
    if (date >= from) return { date, note: feb29 && !leap ? 'Feb 29 observed on Feb 28 in a non-leap year.' : undefined };
  }
  throw new Error('unreachable');
}

export function yearsSince(original: CivilDate, on: CivilDate): number {
  return Math.round(daysBetween(original, on) / 365.2425);
}
