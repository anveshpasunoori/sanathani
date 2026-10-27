// While the app is open, checks every 30 seconds for due reminders and delivers each exactly
// once (system notification when permitted, in-app toast otherwise). Reminders missed while the
// app was closed are delivered on next open if less than 36 hours late, marked as late.
// In the phone apps the system delivers them instead (see nativeReminders), so this stays quiet
// there unless notifications are turned off. On the web, the calendar export (ICS) covers closed-app delivery.
import { useEffect, useState } from 'react';
import { getState, setState } from '../data/store';
import { dueReminders, planReminders, reminderText } from '../reminders/schedule';
import { todayIn, addDays } from '../engine/tz';
import { phoneDelivers } from './nativeReminders';
import { festivalText, loadPoojaPlanner, planFestivals } from '../reminders/festivals';
import type { Route } from './router';

export interface Toast { id: string; title: string; body: string; eventId?: string; route?: Route }

async function show(title: string, body: string, tag: string): Promise<boolean> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: '/icon.svg', tag, data: { eventId: tag } });
    else new Notification(title, { body, icon: '/icon.svg', tag });
    return true;
  } catch {
    return false;
  }
}

export function useReminderRunner(): [Toast | null, () => void] {
  const [toast, setToast] = useState<Toast | null>(null);
  useEffect(() => {
    const tick = async () => {
      const s = getState();
      if ((!s.events.length && !s.settings.follows?.length) || phoneDelivers()) return;
      const today = todayIn(s.settings.place.tz);
      const now = new Date();
      // Festivals and poojas the user follows: tomorrow's (and a just-missed one from yesterday).
      const festivals = dueReminders(planFestivals(s.settings, addDays(today, -1), await loadPoojaPlanner(s.settings), 3), s.delivered, now);
      if (festivals.length) {
        setState((st) => ({ ...st, delivered: { ...st.delivered, ...Object.fromEntries(festivals.map((d) => [d.key, now.toISOString()])) } }));
        for (const d of festivals) {
          const { title, body } = festivalText(d, (now.getTime() - d.fireAt.getTime()) / 60000, s.settings);
          if (!(await show(title, body, d.key))) setToast({ id: d.key, title, body, route: d.route });
        }
      }
      // Include yesterday so a reminder for an observance that was "today" before midnight is not lost.
      const planned = [...planReminders(s.events, s.settings, addDays(today, -1)), ...planReminders(s.events, s.settings, today)];
      const unique = [...new Map(planned.map((p) => [p.key, p])).values()];
      const due = dueReminders(unique, s.delivered, now);
      if (!due.length) return;
      setState((st) => ({ ...st, delivered: { ...st.delivered, ...Object.fromEntries(due.map((d) => [d.key, now.toISOString()])) } }));
      for (const d of due) {
        const late = (now.getTime() - d.fireAt.getTime()) / 60000;
        const { title, body } = reminderText(d, late, s.settings.lang);
        const shown = await show(title, body, d.event.id);
        if (!shown) setToast({ id: d.key, title, body, eventId: d.event.id });
      }
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);
  return [toast, () => setToast(null)];
}
