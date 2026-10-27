// On the phone apps, reminders are handed to the system ahead of time so they arrive while the
// app is closed. The schedule is rebuilt on launch, on return to the app, and whenever events or
// settings change; Android restores it after a restart. On the web the in-app runner does the work.
import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { getState, subscribe } from '../data/store';
import { todayIn } from '../engine/tz';
import { festivalText, loadPoojaPlanner, planFestivals } from '../reminders/festivals';
import { planAhead, reminderText } from '../reminders/schedule';
import { go, type Route } from './router';

export const nativeReminders = Capacitor.isNativePlatform();

export type ReminderPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';

let granted = false;
let started = false;
let queue: Promise<void> = Promise.resolve();

/** True when the phone delivers reminders itself, so the in-app runner should stay quiet. */
export const phoneDelivers = () => granted;

/** Notification ids are 32-bit integers; derive a stable one from the reminder key (FNV-1a). */
export function notificationId(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 0x01000193);
  return (h >>> 1) || 1;
}

const toPermission = (display: string): ReminderPermission =>
  display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt';

export async function reminderPermission(): Promise<ReminderPermission> {
  if (!nativeReminders) return 'unsupported';
  const p = toPermission((await LocalNotifications.checkPermissions()).display);
  granted = p === 'granted';
  return p;
}

/** Asks once (the system remembers the answer) and schedules straight away if allowed. */
export async function askReminderPermission(): Promise<ReminderPermission> {
  if (!nativeReminders) return 'unsupported';
  const p = toPermission((await LocalNotifications.requestPermissions()).display);
  granted = p === 'granted';
  if (granted) reschedule();
  return p;
}

async function rebuild() {
  if (!granted) return;
  const s = getState();
  const now = new Date();
  const today = todayIn(s.settings.place.tz);
  const family = planAhead(s.events, s.settings, today, now).map((p) => ({
    key: p.key, fireAt: p.fireAt, ...reminderText(p, 0, s.settings.lang), extra: { eventId: p.event.id },
  }));
  const festivals = planFestivals(s.settings, today, await loadPoojaPlanner(s.settings)).filter((p) => p.fireAt > now).map((p) => ({
    key: p.key, fireAt: p.fireAt, ...festivalText(p, 0, s.settings), extra: { route: p.route },
  }));
  // iOS keeps at most 64 pending notifications; the soonest go first and opening the app tops up.
  const planned = [...family, ...festivals].sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime()).slice(0, 60);
  const pending = (await LocalNotifications.getPending()).notifications;
  if (pending.length) await LocalNotifications.cancel({ notifications: pending.map((n) => ({ id: n.id })) });
  if (!planned.length) return;
  await LocalNotifications.schedule({
    notifications: planned.map((p) => ({
      id: notificationId(p.key),
      title: p.title,
      body: p.body,
      schedule: { at: p.fireAt, allowWhileIdle: true },
      extra: p.extra,
    })),
  });
}

/** Runs one rebuild at a time, in order, so quick successive edits cannot interleave. */
function reschedule() {
  queue = queue.then(rebuild).catch((err) => console.warn('Could not schedule reminders', err));
}

/** What the schedule depends on; a store change that leaves this alone needs no rebuild. */
function scheduleInputs(): string {
  const { events, settings } = getState();
  return JSON.stringify([
    events.map((e) => [e.id, e.updatedAt, e.isSample]),
    settings.place.lat, settings.place.lon, settings.place.tz, settings.tradition, settings.lang,
    settings.follows, settings.reminderTime,
  ]);
}

export function startNativeReminders() {
  if (!nativeReminders || started) return;
  started = true;
  reminderPermission().then(() => reschedule());

  let last = scheduleInputs();
  let timer: ReturnType<typeof setTimeout> | undefined;
  subscribe(() => {
    const next = scheduleInputs();
    if (next === last) return;
    last = next;
    clearTimeout(timer);
    timer = setTimeout(reschedule, 1000);
  });

  // Coming back to the app: a new day may have started, or permission changed in phone settings.
  NativeApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive) reminderPermission().then(() => reschedule());
  });

  LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
    const eventId = notification.extra?.eventId;
    const route = notification.extra?.route as Route | undefined;
    if (typeof eventId === 'string') go({ tab: 'events', id: eventId });
    else if (route?.tab) go(route);
  });
}
