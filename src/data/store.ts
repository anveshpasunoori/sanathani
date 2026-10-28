// Local-first persisted store. In this stage all data lives on the device (localStorage);
// docs/schema.sql describes the server tables that the sync stage will mirror.
import { useSyncExternalStore } from 'react';
import { PLACES } from './places';
import { refreshOccurrences } from './occurrences';
import { upgrade } from './traditions';
import type { AppState, BirthProfile, FamilyEvent, MyPooja, MySong, Notice, Settings } from './types';
import { formatCivil, todayIn } from '../engine/tz';
import type { Place } from '../engine/panchang';

const KEY = 'thithi-reminder:v1';

function defaultPlace() {
  let tz = 'Asia/Kolkata';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch { /* keep default */ }
  return PLACES.find((p) => p.tz === tz) ?? PLACES[0];
}

export const DEFAULT_SETTINGS: Settings = {
  // The app opens straight into the full app in English; setup stays available from Settings.
  onboarded: true,
  lang: 'en',
  tradition: 'te',
  place: defaultPlace(),
  reminderTime: '07:00',
  theme: 'system',
  calendarMode: 'gregorian',
  textSize: 'normal',
};

function initial(): AppState {
  return { version: 1, settings: DEFAULT_SETTINGS, events: [], occurrences: {}, delivered: {}, notices: [], profiles: [], tombstones: {} };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initial();
    const parsed = JSON.parse(raw) as AppState;
    return withBirthdayProfiles(upgrade({ ...initial(), ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } }));
  } catch {
    return initial();
  }
}

let state: AppState = typeof localStorage === 'undefined' ? initial() : load();
const listeners = new Set<() => void>();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable: keep in memory */ }
}

export function getState(): AppState {
  return state;
}

export function setState(update: (s: AppState) => AppState) {
  state = update(state);
  persist();
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useStore<T>(select: (s: AppState) => T): T {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => select(state),
  );
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** Recompute cached occurrences and raise notices for verified date changes. */
export function recompute() {
  setState((s) => {
    const { cache, changes } = refreshOccurrences(s.events, s.settings, s.occurrences, todayIn(s.settings.place.tz));
    const notices: Notice[] = changes.map((c) => ({
      id: uid(), eventId: c.event.id, read: false, createdAt: new Date().toISOString(),
      text: `${c.event.personName} — ${c.event.title ?? c.event.category}: the next observance moved from ${formatCivil(c.from)} to ${formatCivil(c.to)} because ${c.why}.`,
    }));
    return { ...s, occurrences: cache, notices: [...notices, ...s.notices].slice(0, 50) };
  });
}

const samePlace = (a: Place, b: Place) => a.lat === b.lat && a.lon === b.lon;

/**
 * A birthday gives the person a horoscope profile: the date alone is enough for Rashi and Nakshatra.
 * Birth time and place are optional; details added later in the Horoscope tab are kept unless the
 * event itself now gives them.
 */
export function profileFromBirthday(e: FamilyEvent, home: Place, existing?: BirthProfile): BirthProfile {
  const place = e.originalPlace ?? home;
  return {
    ...existing,
    id: existing?.id ?? `bday-${e.id}`,
    eventId: e.id,
    name: e.personName,
    relation: e.relationship,
    date: e.originalDate,
    time: e.originalTime ?? existing?.time,
    // The event form starts at the home place, so only a different place is taken as the birthplace.
    place: existing && samePlace(place, home) ? existing.place : place,
  };
}

/** Adds or refreshes the profiles of birthday events (not samples, and not ones the user deleted). */
export function withBirthdayProfiles(s: AppState): AppState {
  let profiles = s.profiles;
  for (const e of s.events) {
    if (e.category !== 'birthday' || e.isSample) continue;
    const existing = profiles.find((p) => p.eventId === e.id)
      ?? profiles.find((p) => !p.eventId && !p.isSample && p.date === e.originalDate && p.name.trim().toLowerCase() === e.personName.trim().toLowerCase());
    if (!existing && s.tombstones?.[`bday-${e.id}`]) continue;
    const next = profileFromBirthday(e, s.settings.place, existing);
    if (existing && (['eventId', 'name', 'relation', 'date', 'time'] as const).every((k) => next[k] === existing[k]) && samePlace(next.place, existing.place)) continue;
    const q = { ...next, updatedAt: new Date().toISOString() };
    profiles = existing ? profiles.map((p) => (p === existing ? q : p)) : [...profiles, q];
  }
  return profiles === s.profiles ? s : { ...s, profiles };
}

export function saveEvent(e: FamilyEvent) {
  setState((s) => {
    const exists = s.events.some((x) => x.id === e.id);
    return withBirthdayProfiles({ ...s, events: exists ? s.events.map((x) => (x.id === e.id ? e : x)) : [...s.events, e] });
  });
  recompute();
}

export function deleteEvent(id: string) {
  setState((s) => {
    const occurrences = { ...s.occurrences };
    delete occurrences[id];
    return { ...s, events: s.events.filter((e) => e.id !== id), occurrences, tombstones: { ...s.tombstones, [id]: new Date().toISOString() } };
  });
}

export function saveProfile(p: BirthProfile) {
  setState((s) => {
    const exists = s.profiles.some((x) => x.id === p.id);
    const q = { ...p, updatedAt: new Date().toISOString() };
    return { ...s, profiles: exists ? s.profiles.map((x) => (x.id === p.id ? q : x)) : [...s.profiles, q], activeProfile: p.id };
  });
}

export function deleteProfile(id: string) {
  setState((s) => {
    const profiles = s.profiles.filter((p) => p.id !== id);
    const gone = s.profiles.find((p) => p.id === id);
    const now = new Date().toISOString();
    // Also remember the birthday it came from, so the profile isn't made again from that event.
    const extra = gone?.eventId ? { [`bday-${gone.eventId}`]: now } : {};
    return { ...s, profiles, activeProfile: profiles[0]?.id, tombstones: { ...s.tombstones, [id]: now, ...extra } };
  });
}

/** Adds or updates one of the user's own songs or poojas. */
export function saveMine(kind: 'mySongs', item: MySong): void;
export function saveMine(kind: 'myPoojas', item: MyPooja): void;
export function saveMine(kind: 'mySongs' | 'myPoojas', item: MySong | MyPooja) {
  setState((s) => {
    const list = (s[kind] ?? []) as Array<MySong | MyPooja>;
    const q = { ...item, updatedAt: new Date().toISOString() };
    return { ...s, [kind]: list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? q : x)) : [...list, q] };
  });
}

export function deleteMine(kind: 'mySongs' | 'myPoojas', id: string) {
  setState((s) => ({ ...s, [kind]: ((s[kind] ?? []) as Array<{ id: string }>).filter((x) => x.id !== id), tombstones: { ...s.tombstones, [id]: new Date().toISOString() } }));
}

export function updateSettings(patch: Partial<Settings>) {
  setState((s) => ({ ...s, settings: { ...s.settings, ...patch }, settingsUpdatedAt: new Date().toISOString() }));
  if (patch.place || patch.tradition) recompute();
}

export function exportBackup(): string {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
}

export function importBackup(json: string) {
  const parsed = JSON.parse(json) as AppState;
  if (parsed.version !== 1 || !Array.isArray(parsed.events)) throw new Error('This file is not a Sanathani backup.');
  setState(() => upgrade({ ...initial(), ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } }));
  recompute();
}

export function deleteAllData() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  setState(() => initial());
}
