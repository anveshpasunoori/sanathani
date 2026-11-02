// The morning message: one short note a day at the reader's chosen time — the day's thithi, any festival,
// family days today or tomorrow, and Rahu Kalam. Planned a week ahead for the phone apps (iOS keeps only a
// limited number of pending notifications, and opening the app tops them up).
import { upcoming } from '../data/occurrences';
import type { AppState } from '../data/types';
import { tithiFullName, weekdayName } from '../engine/names';
import { observancesInRange } from '../engine/observances';
import { dayPanchang } from '../engine/panchang';
import { addDays, formatTime, parseCivil, zonedToUtc, type CivilDate } from '../engine/tz';
import { fill, LOCALE } from '../i18n';
import { CATEGORY } from '../locales/common';
import { DAILY_TEXT } from '../locales/daily';
import { festivalName } from '../locales/festivals';
import { REMINDER_TEXT } from '../locales/reminders';

export interface MorningMessage { key: string; fireAt: Date; title: string; body: string }

export function planMorning(state: Pick<AppState, 'settings' | 'events'>, today: CivilDate, now: Date, days = 7): MorningMessage[] {
  const { settings, events } = state;
  if (!settings.morning?.on) return [];
  const { place, tradition, lang } = settings;
  const x = DAILY_TEXT[lang];
  const r = REMINDER_TEXT[lang];
  const loc = LOCALE[lang];
  const [h, mi] = (settings.morning.time || '06:30').split(':').map(Number);
  const family = upcoming(events.filter((e) => !e.isSample), settings, today, days + 1);
  const out: MorningMessage[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    const { y, m, d } = parseCivil(date);
    const fireAt = zonedToUtc(y, m, d, h, mi, place.tz);
    if (fireAt <= now) continue;
    const p = dayPanchang(date, place);
    const parts: string[] = [];
    const fest = observancesInRange(date, date, place, tradition);
    if (fest.length) parts.push(fill(x.mToday, { list: fest.slice(0, 2).map((o) => festivalName(o, lang)).join(', ') }));
    for (const o of family.filter((f) => f.date === date || f.date === addDays(date, 1)).slice(0, 2)) {
      parts.push(fill(x.mFamily, { name: o.event.personName, what: o.event.title ?? CATEGORY[lang][o.event.category], when: o.date === date ? r.today : r.tomorrow }));
    }
    parts.push(fill(x.mRahu, { from: formatTime(p.rahuKalam.start, place.tz, loc), to: formatTime(p.rahuKalam.end, place.tz, loc) }));
    out.push({ key: `morning|${date}`, fireAt, title: `${weekdayName(p.weekday, lang)} · ${tithiFullName(p.tithis[0].index, lang)}`, body: parts.join(' · ') });
  }
  return out;
}
