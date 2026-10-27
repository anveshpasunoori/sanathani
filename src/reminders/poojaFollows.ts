// Dates and names of followed poojas, for festival reminders. Kept apart from festivals.ts because
// the pooja guides are large; the reminder code loads this only when a pooja is followed.
import { POOJAS } from '../data/poojas';
import { addDays } from '../engine/tz';
import { poojaName } from '../locales/poojaNames';
import type { PoojaPlanner } from './festivals';

export const planPoojas: PoojaPlanner = (id, from, to, s) => {
  const p = POOJAS.find((x) => x.id === id);
  if (!p) return null;
  // Each pooja lists its next one or two dates; looking again from just after the last one found
  // fills the rest of the window.
  const dates = new Set<string>();
  let cursor = from;
  for (let i = 0; i < 30 && cursor <= to; i++) {
    let next: string[];
    try { next = p.next(cursor, s.place, s.tradition).map((d) => d.date).filter((d) => d >= cursor && d <= to); } catch { break; }
    if (!next.length) break;
    next.forEach((d) => dates.add(d));
    const last = next.sort().at(-1)!;
    cursor = addDays(last, 1);
  }
  return { name: poojaName(p, s.lang, s.tradition).title, dates: [...dates].sort() };
};

/** A followed pooja's name in the reader's language (for the Settings list). */
export const poojaTitle = (id: string, s: { lang: import('../engine/names').Lang; tradition: import('../data/types').TraditionId }) => {
  const p = POOJAS.find((x) => x.id === id);
  return p ? poojaName(p, s.lang, s.tradition).title : id;
};
