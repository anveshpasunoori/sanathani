// iCalendar export. Thithi dates do not follow an RRULE, so each computed occurrence is written
// as its own all-day event with absolute-time alarms. Importing into Google or Apple Calendar
// gives reliable reminders even when this app is closed.
import { occurrencesBetween } from '../data/occurrences';
import type { FamilyEvent, Settings } from '../data/types';
import { addDays, todayIn } from '../engine/tz';
import { fireTime } from './schedule';

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const ymd = (cd: string) => cd.replace(/-/g, '');
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function fold(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 74) { parts.push(rest.slice(0, 74)); rest = ' ' + rest.slice(74); }
  parts.push(rest);
  return parts.join('\r\n');
}

export function buildIcs(events: FamilyEvent[], s: Settings, years = 5): string {
  const today = todayIn(s.place.tz);
  const to = addDays(today, Math.round(365.25 * years));
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nitya//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  const now = stamp(new Date());
  for (const e of events) {
    for (const o of occurrencesBetween(e, s, today, to)) {
      lines.push('BEGIN:VEVENT',
        `UID:${e.id}-${o.date}@thithi-reminder`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${ymd(o.date)}`,
        `DTEND;VALUE=DATE:${ymd(addDays(o.date, 1))}`,
        `SUMMARY:${esc(`${e.personName} — ${e.title ?? e.category}`)}`,
        `DESCRIPTION:${esc(o.reason + (o.caution ? `\n${o.caution}` : ''))}`,
        'TRANSP:TRANSPARENT');
      for (const r of e.reminders) {
        lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.personName)}`,
          `TRIGGER;VALUE=DATE-TIME:${stamp(fireTime(o.date, r, s.place.tz))}`, 'END:VALARM');
      }
      lines.push('END:VEVENT');
    }
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
