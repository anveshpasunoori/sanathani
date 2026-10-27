import type { Lang } from '../engine/names';
import type { Place } from '../engine/panchang';
import type { AdhikaPolicy, LunarDate, ObservanceRule } from '../engine/recurrence';
import type { SolarAnchor } from '../engine/solarRecurrence';
import type { CivilDate } from '../engine/tz';

/** 'te' is the single Telugu Panchangam (Andhra Pradesh and Telangana). */
export type TraditionId = 'te' | 'kn' | 'ta' | 'ml' | 'mr' | 'north' | 'bn' | 'or' | 'gu';

export type EventCategory =
  | 'birthday' | 'marriage' | 'death' | 'shraddha' | 'engagement'
  | 'naming' | 'housewarming' | 'religious' | 'custom';

/** 'solar': a nakshatra or thithi in a solar month (Tamil Nadu, Kerala); see `solar`. */
export type Recurrence = 'thithi' | 'solar' | 'gregorian' | 'none';

export type Channel = 'push' | 'email' | 'sms';

export interface Reminder {
  id: string;
  daysBefore: number;
  /** Local wall-clock time 'HH:MM' in the user's current time zone. */
  time: string;
  channels: Channel[];
}

export interface FamilyEvent {
  id: string;
  personName: string;
  relationship: string;
  category: EventCategory;
  title?: string;
  originalDate: CivilDate;
  originalTime?: string;
  /** Where the original event happened; determines its thithi. Defaults to the user's place. */
  originalPlace?: Place;
  recurrence: Recurrence;
  /** Required when recurrence is 'thithi'. */
  lunar?: LunarDate;
  /** Required when recurrence is 'solar'. */
  solar?: SolarAnchor;
  /** 'computed' when derived from date+place, 'user' when the user chose/entered it. */
  lunarSource?: 'computed' | 'user';
  nakshatraIndex?: number;
  tradition: TraditionId;
  rule: ObservanceRule;
  adhikaPolicy: AdhikaPolicy;
  reminders: Reminder[];
  notes?: string;
  rituals?: string;
  photo?: string;
  privacy: 'private' | 'family';
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CachedOccurrence {
  date: CivilDate;
  reason: string;
  caution?: string;
  computedAt: string;
  engine: string;
  placeKey: string;
}

export interface Notice {
  id: string;
  eventId?: string;
  text: string;
  createdAt: string;
  read: boolean;
}

export interface Settings {
  onboarded: boolean;
  lang: Lang;
  tradition: TraditionId;
  place: Place;
  reminderTime: string;
  theme: 'system' | 'light' | 'dark';
  calendarMode: 'gregorian' | 'lunar';
  textSize: 'normal' | 'large';
  /** Festivals (observance ids, e.g. 'ugadi', 'ekadashi') and poojas ('pooja:lakshmi') to be reminded of the day before. */
  follows?: string[];
}

export interface BirthProfile {
  id: string;
  name: string;
  relation: string;
  date: CivilDate;
  /** Local 'HH:MM' at the birth place; absent when unknown (no Lagna then). */
  time?: string;
  place: Place;
  /** The birthday event this profile was made from; that event keeps its name and date in step. */
  eventId?: string;
  isSample?: boolean;
  updatedAt?: string;
}

export interface AppState {
  version: 1;
  settings: Settings;
  events: FamilyEvent[];
  occurrences: Record<string, CachedOccurrence>;
  delivered: Record<string, string>;
  notices: Notice[];
  profiles: BirthProfile[];
  activeProfile?: string;
  /** Deleted event/profile ids → deletion time, so cloud sync doesn't bring them back. */
  tombstones?: Record<string, string>;
  /** When settings last changed (for sync). */
  settingsUpdatedAt?: string;
}
