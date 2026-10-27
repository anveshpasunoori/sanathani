import { monthName, type Lang } from '../engine/names';
import type { LunarMonth } from '../engine/lunar';
import { solarDate, solarMonthName, solarYear, type SolarSystem } from '../engine/solar';
import type { Place } from '../engine/panchang';
import type { CivilDate } from '../engine/tz';
import type { FamilyEvent, Settings, TraditionId } from './types';

export interface Tradition {
  id: TraditionId;
  name: string;
  nameTe: string;
  monthSystem: 'amanta' | 'purnimanta';
  /** Tamil Nadu and Kerala name their months by the Sun's sign; thithis are still lunar. */
  solar?: SolarSystem;
  note: string;
}

export const TRADITIONS: Tradition[] = [
  { id: 'te', name: 'Telugu Panchangam', nameTe: 'తెలుగు పంచాంగం', monthSystem: 'amanta',
    note: 'Amanta lunar months (month ends at Amavasya), Drik (astronomical) calculation with Lahiri ayanamsa.' },
  { id: 'kn', name: 'Karnataka — Kannada Panchanga', nameTe: 'కన్నడ పంచాంగం', monthSystem: 'amanta',
    note: 'Amanta lunar months, Drik calculation with Lahiri ayanamsa.' },
  { id: 'ta', name: 'Tamil Nadu — Tamil Panchangam (solar months)', nameTe: 'తమిళ పంచాంగం (సౌర మాసాలు)', monthSystem: 'amanta', solar: 'tamil',
    note: 'Solar months from Chithirai to Panguni; a month begins on the day of the sankranti if it is before sunset. Thithi and nakshatra by Drik calculation with Lahiri ayanamsa.' },
  { id: 'ml', name: 'Kerala — Malayalam calendar (Kollam Era)', nameTe: 'మలయాళ పంచాంగం (కొల్లం శకం)', monthSystem: 'amanta', solar: 'malayalam',
    note: 'Solar months from Chingam; a month begins on the sankranti day if it falls in the first three-fifths of daytime. Years in the Kollam Era.' },
  { id: 'mr', name: 'Maharashtra — Marathi Panchang', nameTe: 'మరాఠీ పంచాంగం', monthSystem: 'amanta',
    note: 'Amanta lunar months, Drik calculation with Lahiri ayanamsa.' },
  { id: 'gu', name: 'Gujarat — Gujarati Panchang (Vikram Samvat)', nameTe: 'గుజరాతీ పంచాంగం (విక్రమ శకం)', monthSystem: 'amanta',
    note: 'Amanta lunar months; the Vikram Samvat year begins the day after Diwali (Kartika Shukla Pratipada). Drik calculation with Lahiri ayanamsa.' },
  { id: 'bn', name: 'Bengal — Bengali Panjika (solar months)', nameTe: 'బెంగాలీ పంజిక (సౌర మాసాలు)', monthSystem: 'amanta', solar: 'bengali',
    note: 'Solar months from Boishakh; a month begins the day after the sankranti (two days after if it falls after midnight). Years in the Bangabda. Thithis are lunar, with amanta months.' },
  { id: 'or', name: 'Odisha — Odia Panjika (solar months)', nameTe: 'ఒడియా పంజిక (సౌర మాసాలు)', monthSystem: 'purnimanta', solar: 'odia',
    note: 'Solar months from Baisakha, which begins on Pana (Mesha) Sankranti; a month begins on the sankranti day if it falls before midnight. Thithis are lunar, with purnimanta months.' },
  { id: 'north', name: 'North India — Purnimanta Panchang', nameTe: 'ఉత్తర భారత పూర్ణిమాంత పంచాంగం', monthSystem: 'purnimanta',
    note: 'Purnimanta months (month ends at Purnima): Krishna Paksha carries the next month\'s name. Thithi dates are identical; only month names differ.' },
];

export const PLANNED_TRADITIONS = ['Vakya Panchangam (traditional calculation)'];

export function tradition(id: TraditionId): Tradition {
  return TRADITIONS.find((t) => t.id === id) ?? TRADITIONS[0];
}

/**
 * The solar calendar family events can follow (a star or thithi in a solar month): only Tamil Nadu
 * and Kerala keep birthdays and death anniversaries that way; Bengal and Odisha keep them by thithi.
 */
export function eventSolarSystem(id: TraditionId): 'tamil' | 'malayalam' | undefined {
  const s = tradition(id).solar;
  return s === 'tamil' || s === 'malayalam' ? s : undefined;
}

/** Month name for a thithi as displayed in the chosen tradition. */
export function displayMonth(month: Pick<LunarMonth, 'index' | 'adhika'>, tithiIndex: number, t: TraditionId, lang: Lang): string {
  const shift = tradition(t).monthSystem === 'purnimanta' && tithiIndex >= 15 && !month.adhika ? 1 : 0;
  return monthName(month.index + shift, lang, month.adhika);
}

/** The solar date as Tamil Nadu, Kerala, Bengal and Odisha name it ("Aippasi 9"), or null for the lunar traditions. */
export function solarLabel(date: CivilDate, place: Place, t: TraditionId, lang: Lang): string | null {
  const system = tradition(t).solar;
  if (!system) return null;
  const sd = solarDate(date, place, system);
  return `${solarMonthName(system, sd.month, lang)} ${sd.day}`;
}

export type TraditionYear = { samvatsara: number } | { era: 'kollam' | 'bangabda' | 'vikram'; n: number };

/**
 * The year as the tradition counts it: the 60-year cycle (Telugu, Kannada and Marathi turn it at
 * Ugadi, Tamil Nadu at Chithirai 1), the Kollam Era in Kerala, the Bangabda in Bengal, or the
 * Vikram Samvat in Gujarat (turning at Kartika, so it runs one behind Shaka + 135 until Diwali).
 */
export function traditionYear(date: CivilDate, place: Place, t: TraditionId, p: { samvatsara: number; shakaYear: number; month: { index: number } }): TraditionYear {
  if (t === 'gu') return { era: 'vikram', n: p.shakaYear + 135 - (p.month.index <= 6 ? 1 : 0) };
  const system = tradition(t).solar;
  if (!system || system === 'odia') return { samvatsara: p.samvatsara };
  const y = solarYear(solarDate(date, place, system), system);
  if (system === 'tamil') return { samvatsara: y };
  return { era: system === 'bengali' ? 'bangabda' : 'kollam', n: y };
}

/**
 * The calendar most speakers of a language follow: Telugu → the Telugu Panchangam, Kannada → Karnataka, Tamil → Tamil Nadu, Malayalam → Kerala, Marathi →
 * Maharashtra, Gujarati → Gujarat, Bengali → Bengal, Odia → Odisha, and Hindi, Punjabi, Rajasthani and
 * Bhojpuri → North India. English says nothing about region, so the choice stays.
 * Choosing a language sets this; the calendar can still be changed afterwards. Family events keep
 * their own thithi or star, so switching never moves their dates.
 */
export function traditionForLang(lang: Lang, current: TraditionId): TraditionId {
  switch (lang) {
    case 'te': return 'te';
    case 'kn': return 'kn';
    case 'ta': return 'ta';
    case 'ml': return 'ml';
    case 'mr': return 'mr';
    case 'hi': case 'pa': case 'raj': case 'bho': return 'north';
    case 'bn': return 'bn';
    case 'or': return 'or';
    case 'gu': return 'gu';
    default: return current;
  }
}

/**
 * Older saves used separate Andhra Pradesh ('te-ap') and Telangana ('te-ts') calendars; both are
 * now the one Telugu Panchangam. Unknown ids fall back to it too.
 */
export function upgradeTradition(t: string | undefined): TraditionId {
  return TRADITIONS.some((x) => x.id === t) ? (t as TraditionId) : 'te';
}

/** Brings saved data up to date (e.g. the Andhra Pradesh and Telangana calendars became one Telugu calendar). */
export function upgrade<T extends { settings: Settings; events: FamilyEvent[] }>(s: T): T {
  return {
    ...s,
    settings: { ...s.settings, tradition: upgradeTradition(s.settings.tradition) },
    events: s.events.map((e) => (e.tradition === upgradeTradition(e.tradition) ? e : { ...e, tradition: upgradeTradition(e.tradition) })),
  };
}
