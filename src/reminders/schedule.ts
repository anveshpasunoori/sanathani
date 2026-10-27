// Reminder scheduling. Fire times are computed from the observance date and the user's *current*
// time zone each time, so travel and DST changes are respected. Each fire is keyed by
// event + occurrence date + reminder id, which prevents duplicates and makes a changed
// observance date automatically supersede the old reminders.
import { nextOccurrence, occurrencesBetween } from '../data/occurrences';
import type { FamilyEvent, Reminder, Settings } from '../data/types';
import type { Lang } from '../engine/names';
import { addDays, formatCivil, parseCivil, zonedToUtc, type CivilDate } from '../engine/tz';
import { fill, LOCALE } from '../i18n';
import { CATEGORY } from '../locales/common';
import { REMINDER_TEXT } from '../locales/reminders';

export interface PlannedReminder {
  key: string;
  event: FamilyEvent;
  reminder: Reminder;
  occurrence: CivilDate;
  fireAt: Date;
}

export function fireTime(occurrence: CivilDate, r: Reminder, tz: string): Date {
  const { y, m, d } = parseCivil(addDays(occurrence, -r.daysBefore));
  const [h, mi] = r.time.split(':').map(Number);
  return zonedToUtc(y, m, d, h, mi, tz);
}

export function reminderKey(eventId: string, occurrence: CivilDate, reminderId: string): string {
  return `${eventId}|${occurrence}|${reminderId}`;
}

/**
 * Reminders for the next occurrence of each event. If the next occurrence's reminders have all
 * passed (e.g. the occurrence is today and the 7-day reminder fired), they are still listed so the
 * UI can show them as delivered.
 */
export function planReminders(events: FamilyEvent[], s: Settings, today: CivilDate): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  for (const e of events) {
    // Look a little back so a reminder whose occurrence is today is still found.
    const occ = nextOccurrence(e, s, today);
    if (!occ) continue;
    for (const r of e.reminders) {
      out.push({ key: reminderKey(e.id, occ.date, r.id), event: e, reminder: r, occurrence: occ.date, fireAt: fireTime(occ.date, r, s.place.tz) });
    }
  }
  return out.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}

/**
 * Every reminder still to fire in the next `days`, soonest first, for scheduling on the phone.
 * iOS keeps at most 64 pending notifications, so the list is capped; opening the app tops it up.
 * Sample events are skipped: they show how the app works and are not anyone's real dates.
 */
export function planAhead(events: FamilyEvent[], s: Settings, today: CivilDate, now: Date, days = 400, limit = 60): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  for (const e of events) {
    if (e.isSample || !e.reminders.length) continue;
    for (const occ of occurrencesBetween(e, s, today, addDays(today, days))) {
      for (const r of e.reminders) {
        const fireAt = fireTime(occ.date, r, s.place.tz);
        if (fireAt > now) out.push({ key: reminderKey(e.id, occ.date, r.id), event: e, reminder: r, occurrence: occ.date, fireAt });
      }
    }
  }
  return out.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime()).slice(0, limit);
}

/** Reminders due now: fire time passed, not yet delivered, and not more than `graceHours` late. */
export function dueReminders<T extends { key: string; fireAt: Date }>(planned: T[], delivered: Record<string, string>, now: Date, graceHours = 36): T[] {
  return planned.filter((p) => !delivered[p.key] && p.fireAt <= now && now.getTime() - p.fireAt.getTime() <= graceHours * 3600000);
}

export function reminderText(p: PlannedReminder, lateMinutes: number, lang: Lang = 'en'): { title: string; body: string } {
  const e = p.event;
  const x = REMINDER_TEXT[lang];
  const n = p.reminder.daysBefore;
  const when = n === 0 ? x.today : n === 1 ? x.tomorrow : fill(x.inDays, { n });
  const date = formatCivil(p.occurrence, LOCALE[lang], { weekday: 'short', day: 'numeric', month: 'short' });
  return {
    title: `${e.personName} — ${e.title ?? CATEGORY[lang][e.category]}`,
    body: `${when} · ${date}` + (lateMinutes > 10 ? ` ${x.late}` : ''),
  };
}
