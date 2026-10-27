// Solar (sidereal) months as kept in Tamil Nadu and Kerala. A month begins with the Sun's entry
// into a sign (sankranti); the civil day it starts on follows each region's rule:
//  - Tamil: the sankranti day itself if the entry is before sunset, otherwise the next day.
//  - Malayalam (Kollam): the sankranti day if the entry is within the first 3/5 of daytime
//    (before the end of Madhyahna), otherwise the next day.
//  - Odia: the (sunrise-to-sunrise) day of the sankranti if the entry is before midnight,
//    otherwise the next day.
//  - Bengali: the day after the sankranti if the entry is before midnight, otherwise the day
//    after that.
// Midnight is the middle of the night, between sunset and the next sunrise.
// Months are numbered by sign, 0 = Mesha (Chithirai / Medam).
import { findCrossing, sunSidereal } from './astro';
import { SCRIPT_OF, monthName, type Lang } from './names';
import { sunTimes, type Place } from './panchang';
import { fromTelugu } from './script';
import { addDays, civilDateOf, parseCivil, type CivilDate } from './tz';

export type SolarSystem = 'tamil' | 'malayalam' | 'bengali' | 'odia';

export interface SolarMonth { month: number; start: CivilDate; sankranti: Date }
export interface SolarDate { month: number; day: number; start: CivilDate }

// Sankranti instants are the same everywhere, so they are cached by Gregorian year.
const sankrantiCache = new Map<number, Array<{ sign: number; at: Date }>>();

function sankrantisAround(year: number): Array<{ sign: number; at: Date }> {
  const hit = sankrantiCache.get(year);
  if (hit) return hit;
  const out: Array<{ sign: number; at: Date }> = [];
  let t = new Date(Date.UTC(year - 1, 10, 20));
  let sign = (Math.floor(sunSidereal(t) / 30) + 1) % 12;
  while (t.getTime() < Date.UTC(year + 1, 1, 10)) {
    const at = findCrossing(sunSidereal, sign * 30, t, 40, 12);
    if (!at) break;
    out.push({ sign, at });
    t = new Date(at.getTime() + 86400000);
    sign = (sign + 1) % 12;
  }
  sankrantiCache.set(year, out);
  return out;
}

/** The civil date a solar month begins on, by the region's rule. */
export function monthStartDate(sankranti: Date, place: Place, system: SolarSystem): CivilDate {
  const d = civilDateOf(sankranti, place.tz);
  const { sunrise, sunset } = sunTimes(d, place);
  if (system === 'bengali' || system === 'odia') {
    // The day runs from sunrise to sunrise, so an entry before sunrise belongs to the day before.
    const day = sankranti.getTime() < sunrise.getTime() ? addDays(d, -1) : d;
    const night = sunTimes(day, place).sunset.getTime(), dawn = sunTimes(addDays(day, 1), place).sunrise.getTime();
    const beforeMidnight = sankranti.getTime() < (night + dawn) / 2;
    return addDays(day, (system === 'bengali' ? 1 : 0) + (beforeMidnight ? 0 : 1));
  }
  const cutoff = system === 'tamil' ? sunset.getTime() : sunrise.getTime() + 0.6 * (sunset.getTime() - sunrise.getTime());
  return sankranti.getTime() <= cutoff ? d : addDays(d, 1);
}

/** Solar months overlapping [from, to], in order. */
export function solarMonthsBetween(from: CivilDate, to: CivilDate, place: Place, system: SolarSystem): Array<SolarMonth & { end: CivilDate }> {
  const y0 = parseCivil(from).y, y1 = parseCivil(to).y;
  const seen = new Map<number, { sign: number; at: Date }>();
  for (let y = y0; y <= y1; y++) for (const s of sankrantisAround(y)) seen.set(Math.round(s.at.getTime() / 3.6e6), s);
  const all = [...seen.values()].sort((a, b) => a.at.getTime() - b.at.getTime())
    .map((s) => ({ month: s.sign, sankranti: s.at, start: monthStartDate(s.at, place, system) }));
  const out: Array<SolarMonth & { end: CivilDate }> = [];
  for (let i = 0; i + 1 < all.length; i++) {
    const end = addDays(all[i + 1].start, -1);
    if (end >= from && all[i].start <= to) out.push({ ...all[i], end });
  }
  return out;
}

/** The solar month and day of a civil date. */
export function solarDate(date: CivilDate, place: Place, system: SolarSystem): SolarDate {
  const m = solarMonthsBetween(addDays(date, -40), date, place, system).filter((x) => x.start <= date).pop()!;
  const { y, m: mo, d } = parseCivil(date), s = parseCivil(m.start);
  return { month: m.month, start: m.start, day: Math.round((Date.UTC(y, mo - 1, d) - Date.UTC(s.y, s.m - 1, s.d)) / 86400000) + 1 };
}

/**
 * The year as each region counts it. Tamil: the 60-year cycle (0 = Prabhava), turning at
 * Chithirai 1. Malayalam: the Kollam Era, turning at Chingam 1 (Simha).
 */
export function solarYear(sd: SolarDate, system: SolarSystem): number {
  // Months are dated by the Gregorian year they start in; Dhanu always starts in December.
  const { y } = parseCivil(sd.start);
  if (system === 'tamil') return ((sd.month >= 9 ? y - 1 : y) - 67 + 6000) % 60;
  // Bengali: the Bangabda, turning at Boishakh 1 (Mesha).
  if (system === 'bengali' || system === 'odia') return (sd.month >= 9 ? y - 1 : y) - 593;
  return (sd.month >= 4 && sd.month <= 8 ? y : y - 1) - 824;
}

const TAMIL_EN = ['Chithirai', 'Vaikasi', 'Aani', 'Aadi', 'Avani', 'Purattasi', 'Aippasi', 'Karthigai', 'Margazhi', 'Thai', 'Maasi', 'Panguni'];
const TAMIL_TA = ['சித்திரை', 'வைகாசி', 'ஆனி', 'ஆடி', 'ஆவணி', 'புரட்டாசி', 'ஐப்பசி', 'கார்த்திகை', 'மார்கழி', 'தை', 'மாசி', 'பங்குனி'];
const TAMIL_TE = ['చిత్తిరై', 'వైకాసి', 'ఆని', 'ఆడి', 'ఆవణి', 'పురట్టాసి', 'ఐప్పసి', 'కార్తిగై', 'మార్గళి', 'తై', 'మాసి', 'పంగుని'];
const MAL_EN = ['Medam', 'Edavam', 'Mithunam', 'Karkidakam', 'Chingam', 'Kanni', 'Thulam', 'Vrischikam', 'Dhanu', 'Makaram', 'Kumbham', 'Meenam'];
const MAL_ML = ['മേടം', 'ഇടവം', 'മിഥുനം', 'കർക്കടകം', 'ചിങ്ങം', 'കന്നി', 'തുലാം', 'വൃശ്ചികം', 'ധനു', 'മകരം', 'കുംഭം', 'മീനം'];
const MAL_TA = ['மேடம்', 'இடவம்', 'மிதுனம்', 'கர்க்கடகம்', 'சிங்ஙம்', 'கன்னி', 'துலாம்', 'விருச்சிகம்', 'தனு', 'மகரம்', 'கும்பம்', 'மீனம்'];
const MAL_TE = ['మేడం', 'ఇడవం', 'మిథునం', 'కర్కిడకం', 'చింగం', 'కన్ని', 'తులాం', 'వృశ్చికం', 'ధను', 'మకరం', 'కుంభం', 'మీనం'];

const BENGALI_EN = ['Boishakh', 'Joishtho', 'Asharh', 'Shrabon', 'Bhadro', 'Ashwin', 'Kartik', 'Ogrohayon', 'Poush', 'Magh', 'Falgun', 'Choitro'];
const ODIA_EN = ['Baisakha', 'Jyeshtha', 'Ashadha', 'Shrabana', 'Bhadraba', 'Ashwina', 'Kartika', 'Margashira', 'Pausha', 'Magha', 'Phalguna', 'Chaitra'];

export function solarMonthName(system: SolarSystem, month: number, lang: Lang): string {
  // Bengal and Odisha give the solar months the lunar names, Mesha being Vaishakha.
  if (system === 'bengali' || system === 'odia') return lang === 'en' ? (system === 'bengali' ? BENGALI_EN : ODIA_EN)[month] : monthName(month + 1, lang);
  if (lang === 'en') return (system === 'tamil' ? TAMIL_EN : MAL_EN)[month];
  if (system === 'tamil') return lang === 'ta' ? TAMIL_TA[month] : fromTelugu(TAMIL_TE[month], SCRIPT_OF[lang]);
  if (lang === 'ml') return MAL_ML[month];
  if (lang === 'ta') return MAL_TA[month];
  return fromTelugu(MAL_TE[month], SCRIPT_OF[lang]);
}
