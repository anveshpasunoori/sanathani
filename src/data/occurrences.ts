// Computes the next observance for each saved event and detects verified date changes.
import { ENGINE_VERSION } from '../engine/astro';
import {
  describeLunar, nextGregorian, nextObservance, observancesBetween,
} from '../engine/recurrence';
import { describeSolar, nextSolarObservance, solarObservancesBetween } from '../engine/solarRecurrence';
import type { Place } from '../engine/panchang';
import { addDays, formatCivil, parseCivil, civil, type CivilDate } from '../engine/tz';
import { placeKey } from './places';
import type { CachedOccurrence, FamilyEvent, Settings } from './types';

export interface Occurrence {
  event: FamilyEvent;
  date: CivilDate;
  reason: string;
  caution?: string;
}

export function observationPlace(_e: FamilyEvent, s: Settings): Place {
  return s.place;
}

export function originPlace(e: FamilyEvent, s: Settings): Place {
  return e.originalPlace ?? s.place;
}

export function nextOccurrence(e: FamilyEvent, s: Settings, from: CivilDate): Occurrence | null {
  if (e.recurrence === 'none') return e.originalDate >= from ? { event: e, date: e.originalDate, reason: 'One-time event.' } : null;
  if (e.recurrence === 'gregorian') {
    const g = nextGregorian(e.originalDate, from);
    return { event: e, date: g.date, reason: g.note ?? `Same Gregorian date every year (${formatCivil(e.originalDate, 'en-IN', { day: 'numeric', month: 'long' })}).` };
  }
  if (e.recurrence === 'solar') {
    if (!e.solar) return null;
    const place = observationPlace(e, s);
    const o = nextSolarObservance(e.solar, from, place, e.rule);
    return o && { event: e, date: o.date, caution: o.caution, reason: `Follows ${describeSolar(e.solar)}. ${o.reason} Calculated for ${place.name}.` };
  }
  if (!e.lunar) return null;
  const place = observationPlace(e, s);
  const o = nextObservance(e.lunar, from, place, e.rule, e.adhikaPolicy);
  return {
    event: e, date: o.date, caution: o.caution,
    reason: `Follows ${describeLunar(e.lunar)}. ${o.reason} Calculated for ${place.name}.`,
  };
}

/** All occurrences of an event within [from, to]. */
export function occurrencesBetween(e: FamilyEvent, s: Settings, from: CivilDate, to: CivilDate): Occurrence[] {
  if (e.recurrence === 'none') return e.originalDate >= from && e.originalDate <= to ? [{ event: e, date: e.originalDate, reason: 'One-time event.' }] : [];
  if (e.recurrence === 'gregorian') {
    const out: Occurrence[] = [];
    let cursor = from;
    while (cursor <= to) {
      const g = nextGregorian(e.originalDate, cursor);
      if (g.date > to) break;
      out.push({ event: e, date: g.date, reason: g.note ?? 'Same Gregorian date every year.' });
      cursor = addDays(g.date, 1);
    }
    return out;
  }
  if (e.recurrence === 'solar') {
    if (!e.solar) return [];
    return solarObservancesBetween(e.solar, from, to, observationPlace(e, s), e.rule)
      .filter((o) => o.date >= e.originalDate)
      .map((o) => ({ event: e, date: o.date, reason: o.reason, caution: o.caution }));
  }
  if (!e.lunar) return [];
  return observancesBetween(e.lunar, from, to, observationPlace(e, s), e.rule, e.adhikaPolicy)
    .filter((o) => o.date >= e.originalDate)
    .map((o) => ({ event: e, date: o.date, reason: o.reason, caution: o.caution }));
}

export function upcoming(events: FamilyEvent[], s: Settings, from: CivilDate, days: number): Occurrence[] {
  const to = addDays(from, days);
  return events
    .flatMap((e) => occurrencesBetween(e, s, from, to))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Recompute next occurrences. Returns the new cache plus change notices for any event whose
 * previously computed date moved (e.g. after a location, tradition, or engine change).
 */
export function refreshOccurrences(
  events: FamilyEvent[], s: Settings, cache: Record<string, CachedOccurrence>, today: CivilDate,
): { cache: Record<string, CachedOccurrence>; changes: Array<{ event: FamilyEvent; from: CivilDate; to: CivilDate; why: string }> } {
  const next: Record<string, CachedOccurrence> = {};
  const changes: Array<{ event: FamilyEvent; from: CivilDate; to: CivilDate; why: string }> = [];
  const pk = placeKey(s.place);
  for (const e of events) {
    const occ = nextOccurrence(e, s, today);
    if (!occ) continue;
    const prev = cache[e.id];
    // Only compare like-for-like: the same upcoming instance (a passed date naturally rolls forward).
    if (prev && prev.date >= today && prev.date !== occ.date && prev.computedAt >= e.updatedAt) {
      const why = prev.placeKey !== pk ? `your location changed to ${s.place.name}` :
        prev.engine !== ENGINE_VERSION ? 'the calendar engine was updated' : 'the calculation was refreshed';
      changes.push({ event: e, from: prev.date, to: occ.date, why });
    }
    next[e.id] = { date: occ.date, reason: occ.reason, caution: occ.caution, computedAt: new Date().toISOString(), engine: ENGINE_VERSION, placeKey: pk };
  }
  return { cache: next, changes };
}

export function yearOf(cd: CivilDate): number {
  return parseCivil(cd).y;
}

export function startOfYear(y: number): CivilDate {
  return civil(y, 1, 1);
}
