// Deekshas and sacred months: when each runs, how far along the reader is, and the practices for each
// day. The Ayyappa Mandala begins whenever the reader wears the mala; the sacred months follow the
// calendar of the reader's place and tradition.
import { findCrossing, sunSidereal } from '../engine/astro';
import { lunarMonthsBetween } from '../engine/lunar';
import { observancesInRange } from '../engine/observances';
import type { Place } from '../engine/panchang';
import { solarMonthsBetween } from '../engine/solar';
import { addDays, civilDateOf, type CivilDate } from '../engine/tz';
import type { SadhanaKind } from './types';

export const SADHANA_KINDS: SadhanaKind[] = ['mandala', 'karthika', 'dhanurmasam', 'navaratri'];
/** How many practices each kind's daily checklist has (their words are in locales/daily.ts). */
export const PRACTICES: Record<SadhanaKind, number> = { mandala: 6, karthika: 4, dhanurmasam: 4, navaratri: 4 };
export const MANDALA_DAYS = 41;

const days = (a: CivilDate, b: CivilDate) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

/** The next (or current) run of a sacred month or festival period, from `from`. */
export function nextPeriod(kind: Exclude<SadhanaKind, 'mandala'>, from: CivilDate, place: Place, tradition: string): { start: CivilDate; end: CivilDate } | null {
  const to = addDays(from, 400);
  if (kind === 'karthika') {
    // Amanta Kartika: from the day after Deepavali's new moon to the next new moon.
    const m = lunarMonthsBetween(new Date(Date.parse(addDays(from, -31))), new Date(Date.parse(to)))
      .find((x) => x.index === 7 && !x.adhika && civilDateOf(x.end, place.tz) >= from);
    return m ? { start: addDays(civilDateOf(m.start, place.tz), 1), end: civilDateOf(m.end, place.tz) } : null;
  }
  if (kind === 'dhanurmasam') {
    const m = solarMonthsBetween(addDays(from, -31), to, place, tradition === 'ml' ? 'malayalam' : 'tamil').find((x) => x.month === 8 && x.end >= from);
    return m ? { start: m.start, end: m.end } : null;
  }
  const obs = observancesInRange(addDays(from, -10), to, place, tradition);
  const begin = obs.find((o) => o.id === 'navaratri' && addDays(o.date, 9) >= from);
  return begin ? { start: begin.date, end: addDays(begin.date, 8) } : null;
}

/** Makara Jyothi (Makara Sankranti) on or after `from`. */
export function makaraJyothi(from: CivilDate, place: Place): CivilDate | null {
  for (const y of [+from.slice(0, 4), +from.slice(0, 4) + 1]) {
    const at = findCrossing(sunSidereal, 270, new Date(Date.UTC(y, 0, 5)), 20, 12);
    if (at && civilDateOf(at, place.tz) >= from) return civilDateOf(at, place.tz);
  }
  return null;
}

export interface Progress { day: number; total: number; start: CivilDate; end: CivilDate; done: boolean }

/** Where the reader is in a deeksha begun on `start` (day 1 = the start day). */
export function progress(kind: SadhanaKind, start: CivilDate, today: CivilDate, place: Place, tradition: string): Progress {
  if (kind === 'mandala') {
    const end = addDays(start, MANDALA_DAYS - 1);
    return { day: days(start, today) + 1, total: MANDALA_DAYS, start, end, done: today > end };
  }
  const p = nextPeriod(kind, start, place, tradition) ?? { start, end: addDays(start, 29) };
  const total = days(p.start, p.end) + 1;
  return { day: days(p.start, today) + 1, total, start: p.start, end: p.end, done: today > p.end };
}

/** The Thiruppavai pasuram for a day of Dhanurmasam (one a day, 1–30). */
export const pasuramOfDay = (day: number) => Math.min(30, Math.max(1, day));

/** The nine forms of Durga worshipped on the nine nights (Navadurga), in Telugu script. */
export const NAVADURGA = ['శైలపుత్రి', 'బ్రహ్మచారిణి', 'చంద్రఘంట', 'కూష్మాండ', 'స్కందమాత', 'కాత్యాయని', 'కాళరాత్రి', 'మహాగౌరి', 'సిద్ధిదాత్రి'];
export const NAVADURGA_EN = ['Shailaputri', 'Brahmacharini', 'Chandraghanta', 'Kushmanda', 'Skandamata', 'Katyayani', 'Kalaratri', 'Mahagauri', 'Siddhidatri'];

/** Common mantras for the japa counter, in Telugu script (shown in each reader's script) with English. */
export const MANTRAS: Array<{ id: string; te: string; en: string }> = [
  { id: 'shiva', te: 'ఓం నమః శివాయ', en: 'Om Namah Shivaya' },
  { id: 'narayana', te: 'ఓం నమో నారాయణాయ', en: 'Om Namo Narayanaya' },
  { id: 'vasudeva', te: 'ఓం నమో భగవతే వాసుదేవాయ', en: 'Om Namo Bhagavate Vasudevaya' },
  { id: 'rama', te: 'శ్రీ రామ జయ రామ జయ జయ రామ', en: 'Sri Rama Jaya Rama Jaya Jaya Rama' },
  { id: 'krishna', te: 'హరే కృష్ణ హరే కృష్ణ కృష్ణ కృష్ణ హరే హరే', en: 'Hare Krishna Hare Krishna Krishna Krishna Hare Hare' },
  { id: 'ganesha', te: 'ఓం గం గణపతయే నమః', en: 'Om Gam Ganapataye Namah' },
  { id: 'ayyappa', te: 'స్వామియే శరణం అయ్యప్ప', en: 'Swamiye Saranam Ayyappa' },
  { id: 'devi', te: 'ఓం శ్రీ మాత్రే నమః', en: 'Om Sri Matre Namah' },
  { id: 'hanuman', te: 'ఓం శ్రీ హనుమతే నమః', en: 'Om Sri Hanumate Namah' },
  { id: 'subrahmanya', te: 'ఓం శరవణభవ', en: 'Om Saravanabhava' },
];
