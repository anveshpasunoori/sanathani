// A copy of the reader's upcoming group events on the device, so each member's phone schedules its own
// reminders (and shows them on Home) even when offline. Refreshed on sign-in, when the app comes back to
// the front, and after changes in the groups screens.
import { setState } from '../data/store';
import { groupEvents, myGroups } from './api';

export async function refreshGroupEvents(): Promise<void> {
  try {
    const [groups, events] = await Promise.all([myGroups(), groupEvents()]);
    const names = new Map(groups.map((g) => [g.id, g.name]));
    setState((s) => ({
      ...s,
      groupEvents: events.map((e) => ({ id: e.id, groupId: e.group_id, groupName: names.get(e.group_id) ?? '', title: e.title, place: e.place_name ?? undefined, startsAt: e.starts_at, remindMinutes: e.remind_minutes })),
    }));
  } catch { /* offline or signed out: keep the last copy */ }
}

export function clearGroupEvents() {
  setState((s) => (s.groupEvents?.length ? { ...s, groupEvents: [] } : s));
}
