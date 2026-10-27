// Religious observances computed by rule from the astronomical calendar.
// These are rule-based computations, not copies of a published Panchangam; regional almanacs
// may differ by a day where their own rules (e.g. Vaishnava Ekadashi, Telugu regional variants) apply.
import { findCrossing, sunSidereal } from './astro';
import { lunarMonthsBetween } from './lunar';
import { selectDay, tithiSpanInMonth, type ObservanceRule } from './recurrence';
import { nakshatraIndexAt, sunTimes, tithiIndexAt, type Place } from './panchang';
import { solarDate, solarMonthsBetween, type SolarSystem } from './solar';
import { addDays, civilDateOf, startOfCivilDay, type CivilDate } from './tz';

const SOUTH_ALL = ['te', 'kn', 'ta', 'ml'];
const NOT_SOLAR = ['te', 'kn', 'mr', 'north', 'gu'];
// Bengal and Odisha keep solar months but their festivals mostly by thithi, like the North.
const EAST = ['bn', 'or'];

export type ObservanceKind = 'festival' | 'vrata' | 'solar';

export interface CalendarObservance {
  date: CivilDate;
  id: string;
  name: string;
  nameTe: string;
  kind: ObservanceKind;
  rule: ObservanceRule | 'sankranti';
  reason: string;
}

interface AnnualDef { id: string; name: string; nameTe: string; month: number; tithi: number; rule: ObservanceRule; regions?: string[] }
interface MonthlyDef { id: string; name: string; nameTe: string; tithis: number[]; rule: ObservanceRule }

// Month 0 = Chaitra (Amanta). Thithi 0..29.
export const ANNUAL: AnnualDef[] = [
  // Chaitra Shukla Pratipada is New Year's day for the lunar calendars, but each region keeps it as its own festival.
  { id: 'ugadi', name: 'Ugadi (New Year)', nameTe: 'ఉగాది', month: 0, tithi: 0, rule: 'sunrise', regions: ['te', 'kn'] },
  { id: 'gudi-padwa', name: 'Gudi Padwa (New Year)', nameTe: 'గుడి పడ్వా', month: 0, tithi: 0, rule: 'sunrise', regions: ['mr'] },
  { id: 'nav-samvatsar', name: 'Chaitra Navratri begins · Hindu New Year', nameTe: 'చైత్ర నవరాత్రులు ప్రారంభం', month: 0, tithi: 0, rule: 'sunrise', regions: ['north'] },
  { id: 'rama-navami', name: 'Sri Rama Navami', nameTe: 'శ్రీరామ నవమి', month: 0, tithi: 8, rule: 'madhyahna' },
  { id: 'hanuman-jayanti', name: 'Hanuman Jayanti', nameTe: 'హనుమాన్ జయంతి', month: 0, tithi: 14, rule: 'sunrise', regions: ['mr', 'north'] },
  { id: 'hanuman-jayanti', name: 'Hanuman Jayanti', nameTe: 'హనుమాన్ జయంతి', month: 1, tithi: 24, rule: 'sunrise', regions: ['te'] },
  { id: 'narasimha-jayanti', name: 'Narasimha Jayanti', nameTe: 'నృసింహ జయంతి', month: 1, tithi: 13, rule: 'pradosha' },
  { id: 'akshaya-tritiya', name: 'Akshaya Tritiya', nameTe: 'అక్షయ తృతీయ', month: 1, tithi: 2, rule: 'sunrise' },
  { id: 'guru-purnima', name: 'Guru Purnima', nameTe: 'గురు పౌర్ణమి', month: 3, tithi: 14, rule: 'sunrise' },
  { id: 'raksha-bandhan', name: 'Raksha Bandhan', nameTe: 'రాఖీ పౌర్ణమి', month: 4, tithi: 14, rule: 'sunrise' },
  { id: 'janmashtami', name: 'Sri Krishna Janmashtami', nameTe: 'శ్రీ కృష్ణ జన్మాష్టమి', month: 4, tithi: 22, rule: 'nishita', regions: [...NOT_SOLAR, ...EAST, 'ta'] },
  { id: 'avani-avittam', name: 'Avani Avittam (Upakarma)', nameTe: 'ఆవణి అవిట్టం (ఉపాకర్మ)', month: 4, tithi: 14, rule: 'sunrise', regions: ['ta', 'ml'] },
  { id: 'vinayaka-chavithi', name: 'Vinayaka Chavithi', nameTe: 'వినాయక చవితి', month: 5, tithi: 3, rule: 'madhyahna' },
  { id: 'navaratri', name: 'Devi Navaratri begins', nameTe: 'శరన్నవరాత్రులు ప్రారంభం', month: 6, tithi: 0, rule: 'sunrise' },
  { id: 'vijayadashami', name: 'Vijayadashami (Dasara)', nameTe: 'విజయదశమి', month: 6, tithi: 9, rule: 'aparahna' },
  { id: 'pitru-paksha', name: 'Mahalaya (Pitru) Paksha begins', nameTe: 'మహాలయ పక్షం ప్రారంభం', month: 5, tithi: 15, rule: 'sunrise' },
  { id: 'mahalaya-amavasya', name: 'Mahalaya Amavasya', nameTe: 'మహాలయ అమావాస్య', month: 5, tithi: 29, rule: 'aparahna' },
  { id: 'naraka-chaturdashi', name: 'Naraka Chaturdashi', nameTe: 'నరక చతుర్దశి', month: 6, tithi: 28, rule: 'sunrise' },
  { id: 'dhanteras', name: 'Dhana Trayodashi (Dhanteras)', nameTe: 'ధన త్రయోదశి', month: 6, tithi: 27, rule: 'pradosha', regions: [...NOT_SOLAR, ...EAST] },
  { id: 'deepavali', name: 'Deepavali (Lakshmi Puja)', nameTe: 'దీపావళి', month: 6, tithi: 29, rule: 'pradosha' },
  { id: 'kartika-purnima', name: 'Kartika Purnima', nameTe: 'కార్తీక పౌర్ణమి', month: 7, tithi: 14, rule: 'sunrise', regions: [...NOT_SOLAR, ...EAST] },
  { id: 'skanda-sashti', name: 'Skanda Sashti (Soorasamharam)', nameTe: 'స్కంద షష్ఠి (శూరసంహారం)', month: 7, tithi: 5, rule: 'madhyahna', regions: ['ta', 'ml'] },
  { id: 'subrahmanya-shashthi', name: 'Subrahmanya Shashthi', nameTe: 'సుబ్రహ్మణ్య షష్ఠి', month: 8, tithi: 5, rule: 'sunrise', regions: ['te', 'kn', 'mr'] },
  { id: 'datta-jayanti', name: 'Datta Jayanti', nameTe: 'దత్త జయంతి', month: 8, tithi: 14, rule: 'pradosha', regions: NOT_SOLAR },
  { id: 'vasant-panchami', name: 'Vasant Panchami (Sri Panchami)', nameTe: 'శ్రీ పంచమి', month: 10, tithi: 4, rule: 'sunrise' },
  { id: 'ratha-saptami', name: 'Ratha Saptami', nameTe: 'రథ సప్తమి', month: 10, tithi: 6, rule: 'sunrise' },
  { id: 'maha-shivaratri', name: 'Maha Shivaratri', nameTe: 'మహా శివరాత్రి', month: 10, tithi: 28, rule: 'nishita' },
  { id: 'bathukamma', name: 'Bathukamma begins (Engili Pula)', nameTe: 'ఎంగిలి పూల బతుకమ్మ', month: 5, tithi: 29, rule: 'sunrise', regions: ['te'] },
  { id: 'saddula-bathukamma', name: 'Saddula Bathukamma', nameTe: 'సద్దుల బతుకమ్మ', month: 6, tithi: 7, rule: 'sunrise', regions: ['te'] },
  { id: 'gowri-habba', name: 'Gowri Habba (Swarna Gowri Vrata)', nameTe: 'స్వర్ణ గౌరీ వ్రతం', month: 5, tithi: 2, rule: 'sunrise', regions: ['kn'] },
  { id: 'karva-chauth', name: 'Karva Chauth', nameTe: 'కర్వా చౌత్', month: 6, tithi: 18, rule: 'moonrise', regions: ['north'] },
  { id: 'govardhan-puja', name: 'Govardhan Puja', nameTe: 'గోవర్ధన పూజ', month: 7, tithi: 0, rule: 'sunrise', regions: ['north', 'gu'] },
  { id: 'bali-padyami', name: 'Bali Padyami', nameTe: 'బలి పాడ్యమి', month: 7, tithi: 0, rule: 'sunrise', regions: ['kn', 'mr'] },
  { id: 'bhai-dooj', name: 'Bhai Dooj (Bhau Beej)', nameTe: 'భగినీ హస్త భోజనం', month: 7, tithi: 1, rule: 'aparahna', regions: ['north', 'mr', 'te', 'gu', 'bn'] },
  { id: 'chhath', name: 'Chhath Puja', nameTe: 'ఛఠ్ పూజ', month: 7, tithi: 5, rule: 'sunrise', regions: ['north'] },
  { id: 'holi', name: 'Holi (Holika Dahan)', nameTe: 'హోళీ', month: 11, tithi: 14, rule: 'pradosha', regions: NOT_SOLAR },
  // Rajasthan, Punjab, Bihar and eastern Uttar Pradesh (the North India calendar).
  { id: 'gangaur', name: 'Gangaur', nameTe: 'గణగౌర్', month: 0, tithi: 2, rule: 'sunrise', regions: ['north'] },
  { id: 'hariyali-teej', name: 'Hariyali Teej', nameTe: 'హరియాలీ తీజ్', month: 4, tithi: 2, rule: 'sunrise', regions: ['north'] },
  { id: 'kajari-teej', name: 'Kajari Teej', nameTe: 'కజరీ తీజ్', month: 4, tithi: 17, rule: 'moonrise', regions: ['north'] },
  { id: 'hartalika-teej', name: 'Hartalika Teej', nameTe: 'హరితాళికా తీజ్', month: 5, tithi: 2, rule: 'sunrise', regions: ['north'] },
  { id: 'jitiya', name: 'Jivitputrika (Jitiya) Vrat', nameTe: 'జీవిత్ పుత్రికా వ్రతం', month: 5, tithi: 22, rule: 'sunrise', regions: ['north'] },
  // Gujarat: the Vikram Samvat new year is the day after Diwali.
  { id: 'bestu-varas', name: 'Bestu Varas (Gujarati New Year)', nameTe: 'బేస్తు వరస్ (గుజరాతీ నూతన సంవత్సరం)', month: 7, tithi: 0, rule: 'sunrise', regions: ['gu'] },
  { id: 'labh-pancham', name: 'Labh Pancham', nameTe: 'లాభ పంచమి', month: 7, tithi: 4, rule: 'sunrise', regions: ['gu'] },
  // Bengal and Odisha.
  { id: 'rath-yatra', name: 'Rath Yatra', nameTe: 'రథయాత్ర', month: 3, tithi: 1, rule: 'sunrise', regions: ['or', 'bn', 'gu', 'north'] },
  { id: 'snana-purnima', name: 'Snana Purnima (Debasnana)', nameTe: 'స్నాన పూర్ణిమ', month: 2, tithi: 14, rule: 'sunrise', regions: ['or'] },
  { id: 'jamai-shashthi', name: 'Jamai Shashthi', nameTe: 'జామై షష్ఠి', month: 2, tithi: 5, rule: 'sunrise', regions: ['bn'] },
  { id: 'durga-shashthi', name: 'Durga Puja begins (Maha Shashthi)', nameTe: 'దుర్గా పూజ ప్రారంభం (మహా షష్ఠి)', month: 6, tithi: 5, rule: 'sunrise', regions: EAST },
  { id: 'maha-ashtami', name: 'Maha Ashtami (Durga Puja)', nameTe: 'మహా అష్టమి (దుర్గా పూజ)', month: 6, tithi: 7, rule: 'sunrise', regions: EAST },
  { id: 'kojagari-lakshmi', name: 'Kojagari Lakshmi Puja', nameTe: 'కోజాగరీ లక్ష్మీ పూజ', month: 6, tithi: 14, rule: 'nishita', regions: ['bn'] },
  { id: 'kumar-purnima', name: 'Kumar Purnima', nameTe: 'కుమార పూర్ణిమ', month: 6, tithi: 14, rule: 'sunrise', regions: ['or'] },
  { id: 'kali-puja', name: 'Kali Puja', nameTe: 'కాళీ పూజ', month: 6, tithi: 29, rule: 'nishita', regions: ['bn', 'or'] },
  { id: 'jagaddhatri-puja', name: 'Jagaddhatri Puja', nameTe: 'జగద్ధాత్రి పూజ', month: 7, tithi: 8, rule: 'sunrise', regions: ['bn'] },
  { id: 'prathamastami', name: 'Prathamastami', nameTe: 'ప్రథమాష్టమి', month: 7, tithi: 22, rule: 'sunrise', regions: ['or'] },
  { id: 'dol-jatra', name: 'Dol Jatra (Dol Purnima)', nameTe: 'డోల్ యాత్ర (డోల్ పూర్ణిమ)', month: 11, tithi: 14, rule: 'sunrise', regions: EAST },
];

export const MONTHLY: MonthlyDef[] = [
  { id: 'ekadashi', name: 'Ekadashi', nameTe: 'ఏకాదశి', tithis: [10, 25], rule: 'sunrise' },
  { id: 'purnima', name: 'Purnima', nameTe: 'పౌర్ణమి', tithis: [14], rule: 'sunrise' },
  { id: 'amavasya', name: 'Amavasya', nameTe: 'అమావాస్య', tithis: [29], rule: 'sunrise' },
  { id: 'pradosham', name: 'Pradosham', nameTe: 'ప్రదోషం', tithis: [12, 27], rule: 'pradosha' },
  { id: 'sankashti', name: 'Sankashti Chaturthi', nameTe: 'సంకష్ట చతుర్థి', tithis: [18], rule: 'moonrise' },
  { id: 'masa-shivaratri', name: 'Masa Shivaratri', nameTe: 'మాస శివరాత్రి', tithis: [28], rule: 'nishita' },
];

// Festivals of the solar calendars (Tamil Nadu, Kerala): a fixed day of a solar month, or the day
// a nakshatra prevails in it. Months are numbered by sign, 0 = Mesha (Chithirai / Medam).
interface SolarDef { id: string; name: string; nameTe: string; system: SolarSystem; month: number; day?: number; nakshatra?: number; at?: 'sunset' }
const SOLAR_FESTIVALS: SolarDef[] = [
  { id: 'puthandu', name: 'Puthandu (Tamil New Year)', nameTe: 'పుత్తాండు (తమిళ ఉగాది)', system: 'tamil', month: 0, day: 1 },
  { id: 'vaikasi-visakam', name: 'Vaikasi Visakam', nameTe: 'వైకాసి విశాఖం', system: 'tamil', month: 1, nakshatra: 15 },
  { id: 'aadi-perukku', name: 'Aadi Perukku', nameTe: 'ఆడి పెరుక్కు', system: 'tamil', month: 3, day: 18 },
  { id: 'karthigai-deepam', name: 'Karthigai Deepam', nameTe: 'కార్తిగై దీపం', system: 'tamil', month: 7, nakshatra: 2, at: 'sunset' },
  { id: 'mandala-begins', name: 'Mandala season begins (Sabarimala)', nameTe: 'మండల కాలం ప్రారంభం (శబరిమల)', system: 'tamil', month: 7, day: 1 },
  { id: 'arudra-darisanam', name: 'Arudra Darisanam', nameTe: 'ఆరుద్ర దర్శనం', system: 'tamil', month: 8, nakshatra: 5 },
  { id: 'thaipusam', name: 'Thaipusam', nameTe: 'తైపూసం', system: 'tamil', month: 9, nakshatra: 7 },
  { id: 'maasi-magam', name: 'Maasi Magam', nameTe: 'మాసి మకం', system: 'tamil', month: 10, nakshatra: 9 },
  { id: 'panguni-uttiram', name: 'Panguni Uttiram', nameTe: 'పంగుని ఉత్తిరం', system: 'tamil', month: 11, nakshatra: 11 },
  { id: 'vishu', name: 'Vishu', nameTe: 'విషు', system: 'malayalam', month: 0, day: 1 },
  { id: 'ramayana-masam', name: 'Karkidakam begins (Ramayana Masam)', nameTe: 'కర్కిడకం ప్రారంభం (రామాయణ మాసం)', system: 'malayalam', month: 3, day: 1 },
  { id: 'chingam-1', name: 'Chingam 1 (Malayalam New Year)', nameTe: 'చింగం 1 (మలయాళ నూతన సంవత్సరం)', system: 'malayalam', month: 4, day: 1 },
  { id: 'onam', name: 'Thiruvonam (Onam)', nameTe: 'తిరువోణం (ఓణం)', system: 'malayalam', month: 4, nakshatra: 21 },
  { id: 'ashtami-rohini', name: 'Ashtami Rohini (Sri Krishna Jayanthi)', nameTe: 'అష్టమి రోహిణి', system: 'malayalam', month: 4, nakshatra: 3 },
  { id: 'mandala-begins', name: 'Mandala season begins (Sabarimala)', nameTe: 'మండల కాలం ప్రారంభం (శబరిమల)', system: 'malayalam', month: 7, day: 1 },
  { id: 'thrikarthika', name: 'Thrikarthika', nameTe: 'తృక్కార్తిక', system: 'malayalam', month: 7, nakshatra: 2, at: 'sunset' },
  { id: 'thiruvathira', name: 'Thiruvathira', nameTe: 'తిరువాతిర', system: 'malayalam', month: 8, nakshatra: 5 },
  { id: 'poila-boishakh', name: 'Poila Boishakh (Bengali New Year)', nameTe: 'పొయిలా బోయిశాఖ్ (బెంగాలీ నూతన సంవత్సరం)', system: 'bengali', month: 0, day: 1 },
  { id: 'pana-sankranti', name: 'Pana Sankranti (Odia New Year)', nameTe: 'పణ సంక్రాంతి (ఒడియా నూతన సంవత్సరం)', system: 'odia', month: 0, day: 1 },
  { id: 'raja-sankranti', name: 'Raja Sankranti (Raja Parba)', nameTe: 'రజ సంక్రాంతి (రజ పర్వం)', system: 'odia', month: 2, day: 1 },
];

// Tithi observances that belong to a particular solar month.
const SOLAR_TITHI: Array<{ id: string; name: string; nameTe: string; system: SolarSystem; month: number; of: 'amavasya' | 'shukla-ekadashi' }> = [
  { id: 'aadi-amavasai', name: 'Aadi Amavasai', nameTe: 'ఆడి అమావాస్య', system: 'tamil', month: 3, of: 'amavasya' },
  { id: 'hanuman-jayanti', name: 'Hanumath Jayanthi', nameTe: 'హనుమజ్జయంతి', system: 'tamil', month: 8, of: 'amavasya' },
  { id: 'thai-amavasai', name: 'Thai Amavasai', nameTe: 'తై అమావాస్య', system: 'tamil', month: 9, of: 'amavasya' },
  { id: 'karkidaka-vavu', name: 'Karkidaka Vavu', nameTe: 'కర్కిడక వావు', system: 'malayalam', month: 3, of: 'amavasya' },
];

const SOLAR_OF: Record<string, SolarSystem> = { ta: 'tamil', ml: 'malayalam', bn: 'bengali', or: 'odia' };

const NAZHIKA_6 = 2.4 * 3600000;

/**
 * Days a nakshatra is observed in a solar month: days it prevails at sunrise — in Kerala, for at
 * least 6 nazhika (2 h 24 min) after sunrise — or, for the lamp festivals, during the first
 * 6 nazhika after sunset. A month can hold the same nakshatra twice.
 */
function starDays(m: { start: CivilDate; end: CivilDate }, nak: number, place: Place, system: SolarSystem, at?: 'sunset'): CivilDate[] {
  const out: CivilDate[] = [];
  for (let d = m.start; d <= m.end; d = addDays(d, 1)) {
    const { sunrise, sunset } = sunTimes(d, place);
    const hit = at === 'sunset'
      ? nakshatraIndexAt(sunset) === nak || nakshatraIndexAt(new Date(sunset.getTime() + NAZHIKA_6)) === nak
      : nakshatraIndexAt(system === 'malayalam' ? new Date(sunrise.getTime() + NAZHIKA_6) : sunrise) === nak;
    if (hit && out[out.length - 1] !== addDays(d, -1)) out.push(d);
  }
  return out;
}

/** Ashtami Rohini is the Rohini of Chingam that falls with (or nearest) Krishna Ashtami. */
function nearestAshtami(days: CivilDate[], place: Place): CivilDate | null {
  const gap = (d: CivilDate) => Math.abs(tithiIndexAt(sunTimes(d, place).sunrise) - 22);
  return days.length ? days.reduce((a, b) => (gap(b) < gap(a) ? b : a)) : null;
}

function solarObservances(from: CivilDate, to: CivilDate, place: Place, system: SolarSystem): CalendarObservance[] {
  const out: CalendarObservance[] = [];
  const months = solarMonthsBetween(addDays(from, -1), addDays(to, 1), place, system);
  for (const m of months) {
    for (const def of SOLAR_FESTIVALS) {
      if (def.system !== system || def.month !== m.month) continue;
      const stars = def.day ? [] : starDays(m, def.nakshatra!, place, system, def.at);
      const date = def.day ? addDays(m.start, def.day - 1) : def.id === 'ashtami-rohini' ? nearestAshtami(stars, place) : stars[0] ?? null;
      if (date && date >= from && date <= to) {
        const reason = def.day ? `Day ${def.day} of the solar month.` : 'The day this nakshatra prevails in the solar month.';
        out.push({ date, id: def.id, name: def.name, nameTe: def.nameTe, kind: 'festival', rule: 'sankranti', reason });
      }
    }
    // Thai Pongal is the first day of Thai; Bhogi is the day before and Mattu Pongal the day after.
    if (system === 'tamil' && m.month === 9) {
      const days: Array<[number, string, string, string]> = [
        [-1, 'bhogi', 'Bhogi', 'భోగి'], [0, 'thai-pongal', 'Thai Pongal (Makara Sankranti)', 'పొంగల్ (మకర సంక్రాంతి)'], [1, 'mattu-pongal', 'Mattu Pongal', 'మాట్టు పొంగల్ (కనుమ)'],
      ];
      for (const [k, id, name, nameTe] of days) {
        const date = addDays(m.start, k);
        if (date >= from && date <= to) out.push({ date, id, name, nameTe, kind: 'solar', rule: 'sankranti', reason: 'Thai Pongal is the first day of the Tamil month Thai.' });
      }
    }
  }
  return out;
}

// A year's scan takes a few hundred milliseconds and the same range is asked for many times in a
// row (every pooja tile, Home, Calendar), so the last few results are kept.
const recent = new Map<string, CalendarObservance[]>();

export function observancesInRange(from: CivilDate, to: CivilDate, place: Place, tradition?: string): CalendarObservance[] {
  const key = [from, to, place.lat, place.lon, place.tz, tradition ?? ''].join('|');
  let hit = recent.get(key);
  if (!hit) {
    hit = scanObservances(from, to, place, tradition);
    recent.set(key, hit);
    if (recent.size > 12) recent.delete(recent.keys().next().value!);
  }
  return hit.slice();
}

function scanObservances(from: CivilDate, to: CivilDate, place: Place, tradition?: string): CalendarObservance[] {
  const out: CalendarObservance[] = [];
  const fromT = startOfCivilDay(addDays(from, -3), place.tz);
  const toT = startOfCivilDay(addDays(to, 3), place.tz);
  for (const m of lunarMonthsBetween(fromT, toT)) {
    const push = (id: string, name: string, nameTe: string, kind: ObservanceKind, tithi: number, rule: ObservanceRule) => {
      const o = selectDay(tithiSpanInMonth(tithi, m), m, place, rule);
      if (o.date >= from && o.date <= to) out.push({ date: o.date, id, name, nameTe, kind, rule, reason: o.reason });
      return o;
    };
    for (const def of MONTHLY) {
      for (const t of def.tithis) push(def.id, def.name, def.nameTe, 'vrata', t, def.rule);
    }
    if (m.adhika) continue; // festivals are not celebrated in an Adhika month
    for (const def of ANNUAL) {
      if (def.regions && (!tradition || !def.regions.includes(tradition))) continue;
      if (def.month !== m.index && def.month !== m.kshayaAlso) continue;
      const o = push(def.id, def.name, def.nameTe, 'festival', def.tithi, def.rule);
      // Maha Navami (Ayudha Pooja) closes Navaratri on the day before Vijayadashami — Navami joined
      // with Ashtami is preferred, so it is not simply "Navami at sunrise".
      const nav = addDays(o.date, -1);
      if (def.id === 'vijayadashami' && nav >= from && nav <= to) {
        out.push({ date: nav, id: 'maha-navami', name: 'Maha Navami (Ayudha Pooja)', nameTe: 'మహర్నవమి (ఆయుధ పూజ)', kind: 'festival', rule: 'sunrise', reason: 'Last day of Navaratri, the day before Vijayadashami.' });
      }
    }
  }
  const system = tradition ? SOLAR_OF[tradition] : undefined;
  if (system) out.push(...solarObservances(from, to, place, system));
  // Tithi observances tied to a solar month. Vaikunta (Mukkoti) Ekadashi — the Shukla Ekadashi of
  // Dhanur masam — is kept across the South.
  for (const o of out.filter((x) => x.id === 'amavasya' || x.id === 'ekadashi')) {
    if (o.id === 'ekadashi' && (!tradition || !SOUTH_ALL.includes(tradition))) continue;
    const sd = solarDate(o.date, place, system ?? 'tamil');
    if (o.id === 'ekadashi') {
      if (sd.month === 8 && tithiIndexAt(sunTimes(o.date, place).sunrise) < 15) {
        out.push({ ...o, id: 'vaikunta-ekadashi', name: 'Vaikunta Ekadashi', nameTe: 'ముక్కోటి (వైకుంఠ) ఏకాదశి', kind: 'festival' });
      }
      continue;
    }
    const def = SOLAR_TITHI.find((d) => d.system === system && d.month === sd.month);
    if (def) out.push({ ...o, id: def.id, name: def.name, nameTe: def.nameTe, kind: 'festival' });
  }
  // Makara Sankranti: the Sun's sidereal entry into Makara (270°). Observed on the civil date of entry,
  // or the next day if entry is after sunset — a common convention; regional rules vary. Tamil Nadu
  // keeps Thai Pongal by its own month rule (above); Kerala keeps Makaravilakku on the sankranti day.
  for (let y = system === 'tamil' ? Infinity : +from.slice(0, 4); y <= +to.slice(0, 4); y++) {
    const entry = findCrossing(sunSidereal, 270, new Date(Date.UTC(y, 0, 5)), 20, 12);
    if (!entry) continue;
    const d = civilDateOf(entry, place.tz);
    if (d >= addDays(from, -1) && d <= to) {
      if (system === 'malayalam') {
        if (d >= from) out.push({ date: d, id: 'makaravilakku', name: 'Makaravilakku (Makara Sankranti)', nameTe: 'మకరవిళక్కు (మకర సంక్రాంతి)', kind: 'solar', rule: 'sankranti', reason: 'The Sun enters Makara (sidereal) on this day.' });
        continue;
      }
      // The eve is Bhogi in the South and Maharashtra, Lohri in Punjab; Gujarat, Bengal and Odisha keep the day itself.
      const eve = tradition === 'north' ? { id: 'lohri', name: 'Lohri', nameTe: 'లోహ్రీ' } : !tradition || NOT_SOLAR.includes(tradition) && tradition !== 'gu' ? { id: 'bhogi', name: 'Bhogi', nameTe: 'భోగి' } : null;
      if (eve && addDays(d, -1) >= from) {
        out.push({ date: addDays(d, -1), ...eve, kind: 'solar', rule: 'sankranti', reason: 'Day before Makara Sankranti.' });
      }
      if (d >= from) {
        out.push({ date: d, id: 'makara-sankranti', name: 'Makara Sankranti', nameTe: 'మకర సంక్రాంతి', kind: 'solar', rule: 'sankranti', reason: `The Sun enters Makara (sidereal) on this day.` });
      }
    }
  }
  // Vaisakhi (Punjab): the day of the Sun's entry into Mesha, counting the day from sunrise.
  if (tradition === 'north') {
    for (let y = +from.slice(0, 4); y <= +to.slice(0, 4); y++) {
      const entry = findCrossing(sunSidereal, 0, new Date(Date.UTC(y, 3, 5)), 20, 12);
      if (!entry) continue;
      const d0 = civilDateOf(entry, place.tz);
      const d = entry.getTime() < sunTimes(d0, place).sunrise.getTime() ? addDays(d0, -1) : d0;
      if (d >= from && d <= to) out.push({ date: d, id: 'vaisakhi', name: 'Vaisakhi', nameTe: 'వైశాఖి', kind: 'solar', rule: 'sankranti', reason: 'The Sun enters Mesha (sidereal) on this day, counted from sunrise.' });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
