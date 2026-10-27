// Reminders for festivals and poojas the user follows (Settings.follows), the day before at the
// user's reminder time. They go through the same delivery as family reminders: scheduled on the
// phone ahead of time, shown by the in-app runner on the web.
import type { Settings } from '../data/types';
import { observancesInRange } from '../engine/observances';
import { addDays, formatCivil, type CivilDate } from '../engine/tz';
import { LOCALE } from '../i18n';
import { festivalName } from '../locales/festivals';
import { REMINDER_TEXT } from '../locales/reminders';
import type { Route } from '../ui/router';
import { fireTime } from './schedule';

export interface PlannedFestival {
  key: string;
  follow: string;
  name: string;
  date: CivilDate;
  fireAt: Date;
  pooja: boolean;
  route: Route;
}

/** Dates and the shown name of a followed pooja; loaded only when a pooja is followed (see poojaFollows). */
export type PoojaPlanner = (id: string, from: CivilDate, to: CivilDate, s: Settings) => { name: string; dates: CivilDate[] } | null;

export const POOJA_PREFIX = 'pooja:';
export const followsPooja = (s: Settings) => (s.follows ?? []).some((f) => f.startsWith(POOJA_PREFIX));

/** The pooja planner, loaded only when a pooja is followed. */
export const loadPoojaPlanner = async (s: Settings): Promise<PoojaPlanner | undefined> =>
  followsPooja(s) ? (await import('./poojaFollows')).planPoojas : undefined;

/** Followed festivals and poojas from `today` on, soonest reminder first (callers pick the ones to fire). */
export function planFestivals(s: Settings, today: CivilDate, poojas?: PoojaPlanner, days = 400): PlannedFestival[] {
  const follows = s.follows ?? [];
  if (!follows.length) return [];
  const to = addDays(today, days);
  const at = (date: CivilDate) => fireTime(date, { id: 'festival', daysBefore: 1, time: s.reminderTime, channels: [] }, s.place.tz);
  const out: PlannedFestival[] = [];
  const festivals = new Set(follows.filter((f) => !f.startsWith(POOJA_PREFIX)));
  if (festivals.size) {
    for (const o of observancesInRange(today, to, s.place, s.tradition)) {
      if (!festivals.has(o.id)) continue;
      out.push({ key: `festival|${o.id}|${o.date}`, follow: o.id, name: festivalName(o, s.lang), date: o.date, fireAt: at(o.date), pooja: false, route: { tab: 'calendar', date: o.date } });
    }
  }
  for (const f of follows) {
    if (!f.startsWith(POOJA_PREFIX) || !poojas) continue;
    const id = f.slice(POOJA_PREFIX.length);
    const plan = poojas(id, today, to, s);
    for (const date of plan?.dates ?? []) {
      out.push({ key: `festival|${f}|${date}`, follow: f, name: plan!.name, date, fireAt: at(date), pooja: true, route: { tab: 'pooja', id } });
    }
  }
  return out.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}

export function festivalText(p: PlannedFestival, lateMinutes: number, s: Settings): { title: string; body: string } {
  const x = REMINDER_TEXT[s.lang];
  const date = formatCivil(p.date, LOCALE[s.lang], { weekday: 'short', day: 'numeric', month: 'short' });
  return {
    title: `🪔 ${p.name}`,
    body: `${x.tomorrow} · ${date}` + (p.pooja ? ` · ${x.samagri}` : '') + (lateMinutes > 10 ? ` ${x.late}` : ''),
  };
}

