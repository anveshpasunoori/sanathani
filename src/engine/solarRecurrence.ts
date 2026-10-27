// Family events kept by the solar calendar, as in Kerala and Tamil Nadu: the same nakshatra
// (Kerala birthdays — Pirannal — and Shraddham) or the same thithi (Tamil annual Shraddham) in the
// same solar month every year. A solar month (29–32 days) is longer than a nakshatra cycle and
// close to a thithi cycle, so the day can come twice; families choose the first or the second.
import { findCrossing, moonSidereal, nextElongation } from './astro';
import { nakshatraName, tithiFullName, type Lang } from './names';
import { sunTimes, type Place, type Span } from './panchang';
import { ruleLabel, windowFor, type ObservanceRule } from './recurrence';
import { solarMonthName, solarMonthsBetween, type SolarSystem } from './solar';
import { addDays, civilDateOf, formatCivil, startOfCivilDay, type CivilDate } from './tz';

export interface SolarAnchor {
  system: SolarSystem;
  /** Solar month by sign, 0 = Mesha (Chithirai / Medam). */
  month: number;
  by: 'star' | 'thithi';
  nakshatra?: number;
  tithiIndex?: number;
  /** When the day comes twice in the month. Defaults to the first. */
  repeat?: 'first' | 'second';
}

export interface SolarObservance { date: CivilDate; reason: string; caution?: string }

const NAK = 360 / 27;
const NAZHIKA_6 = 2.4 * 3600000;

export function describeSolar(a: SolarAnchor, lang: Lang = 'en'): string {
  const what = a.by === 'star' ? nakshatraName(a.nakshatra ?? 0, lang) : tithiFullName(a.tithiIndex ?? 0, lang);
  return `${solarMonthName(a.system, a.month, lang)} ${what}`;
}

/** Every span of the nakshatra or thithi between two instants. */
function spans(a: SolarAnchor, from: Date, to: Date): Span[] {
  const out: Span[] = [];
  let t = from;
  while (t < to) {
    const start = a.by === 'star'
      ? findCrossing(moonSidereal, (a.nakshatra ?? 0) * NAK, t, 30, 6)
      : nextElongation((a.tithiIndex ?? 0) * 12, t, 32);
    if (!start || start > to) break;
    const end = a.by === 'star'
      ? findCrossing(moonSidereal, (((a.nakshatra ?? 0) + 1) % 27) * NAK, start, 2, 2)!
      : nextElongation((((a.tithiIndex ?? 0) + 1) % 30) * 12, start, 3)!;
    out.push({ start, end });
    t = new Date(end.getTime() + 60000);
  }
  return out;
}

/**
 * The civil day a span is kept on: the day it best covers the rule's period. In Kerala, a
 * sunrise star must also last 6 nazhika (2 h 24 min) after sunrise.
 */
function dayFor(span: Span, place: Place, rule: ObservanceRule, system: SolarSystem): CivilDate {
  const first = addDays(civilDateOf(span.start, place.tz), -1);
  const last = addDays(civilDateOf(span.end, place.tz), 1);
  let best: { date: CivilDate; score: number } | null = null;
  for (let d = first; d <= last; d = addDays(d, 1)) {
    const w = rule === 'sunrise' && system === 'malayalam'
      ? new Date(sunTimes(d, place).sunrise.getTime() + NAZHIKA_6)
      : windowFor(rule, d, place);
    if (!w) continue;
    const score = w instanceof Date
      ? (w >= span.start && w < span.end ? 1 : 0)
      : Math.max(0, Math.min(w.end.getTime(), span.end.getTime()) - Math.max(w.start.getTime(), span.start.getTime())) / (w.end.getTime() - w.start.getTime());
    if (score > 0 && (!best || score > best.score + 1e-9)) best = { date: d, score };
  }
  if (best) return best.date;
  // Never prevails in the period (a skipped star or thithi): keep the day it begins, sunrise to sunrise.
  const d = civilDateOf(span.start, place.tz);
  return span.start < sunTimes(d, place).sunrise ? addDays(d, -1) : d;
}

/** Observances of a solar anchor whose civil date falls within [from, to]. */
export function solarObservancesBetween(a: SolarAnchor, from: CivilDate, to: CivilDate, place: Place, rule: ObservanceRule = 'sunrise'): SolarObservance[] {
  const out: SolarObservance[] = [];
  const name = a.by === 'star' ? `${nakshatraName(a.nakshatra ?? 0)} nakshatra` : tithiFullName(a.tithiIndex ?? 0);
  const monthName = solarMonthName(a.system, a.month, 'en');
  const cal = a.system === 'tamil' ? 'Tamil' : 'Malayalam';
  const when = rule !== 'sunrise' ? ruleLabel(rule)
    : a.system === 'malayalam' ? 'prevailing for 6 nazhika after sunrise' : a.by === 'star' ? 'at sunrise' : ruleLabel(rule);
  for (const m of solarMonthsBetween(addDays(from, -40), addDays(to, 40), place, a.system)) {
    if (m.month !== a.month) continue;
    const found = spans(a, startOfCivilDay(addDays(m.start, -2), place.tz), startOfCivilDay(addDays(m.end, 3), place.tz))
      .map((s) => dayFor(s, place, rule, a.system));
    const days = [...new Set(found)].filter((d) => d >= m.start && d <= m.end);
    let date: CivilDate, caution: string | undefined;
    let reason = `${name} in the ${cal} month ${monthName}, ${when}: ${formatCivil(days[0] ?? m.start)}.`;
    if (days.length > 1) {
      date = a.repeat === 'second' ? days[1] : days[0];
      reason = `${name} comes twice in ${monthName} this year (${days.map((d) => formatCivil(d)).join(' and ')}); the ${a.repeat === 'second' ? 'second' : 'first'} is kept, as chosen for this event.`;
    } else if (days.length === 1) {
      date = days[0];
    } else {
      // A thithi can miss a short month entirely; keep the nearest day after the month.
      date = found.filter((d) => d > m.end).sort()[0] ?? m.end;
      reason = `${name} does not fall in ${monthName} this year, so the next day it occurs is used: ${formatCivil(date)}.`;
      caution = 'Traditions differ for this case — please confirm with your family priest.';
    }
    if (date >= from && date <= to) out.push({ date, reason, caution });
  }
  return out;
}

export function nextSolarObservance(a: SolarAnchor, from: CivilDate, place: Place, rule: ObservanceRule = 'sunrise'): SolarObservance | null {
  return solarObservancesBetween(a, from, addDays(from, 400), place, rule)[0] ?? null;
}
