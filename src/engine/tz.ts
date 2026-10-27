// Time-zone helpers built on Intl so DST transitions are handled by the platform's tz database.
// A "civil date" is an ISO 'YYYY-MM-DD' string interpreted in a specific IANA zone.

export type CivilDate = string;

const dtfCache = new Map<string, Intl.DateTimeFormat>();
function dtf(tz: string): Intl.DateTimeFormat {
  let f = dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short',
    });
    dtfCache.set(tz, f);
  }
  return f;
}

export interface LocalParts { y: number; m: number; d: number; h: number; mi: number; s: number; weekday: number }

const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function localParts(date: Date, tz: string): LocalParts {
  const p: Record<string, string> = {};
  for (const part of dtf(tz).formatToParts(date)) p[part.type] = part.value;
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second, weekday: WD[p.weekday] };
}

/** Offset of `tz` from UTC at `date`, in minutes (e.g. +330 for Asia/Kolkata). */
export function tzOffsetMinutes(date: Date, tz: string): number {
  const t = Math.floor(date.getTime() / 1000) * 1000;
  const p = localParts(new Date(t), tz);
  return Math.round((Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - t) / 60000);
}

/** The UTC instant of a wall-clock time in `tz`. Non-existent DST times roll forward. */
export function zonedToUtc(y: number, m: number, d: number, h: number, mi: number, tz: string): Date {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const off1 = tzOffsetMinutes(new Date(guess), tz);
  let t = guess - off1 * 60000;
  const off2 = tzOffsetMinutes(new Date(t), tz);
  if (off2 !== off1) t = guess - off2 * 60000;
  return new Date(t);
}

export function parseCivil(cd: CivilDate): { y: number; m: number; d: number } {
  const [y, m, d] = cd.split('-').map(Number);
  return { y, m, d };
}

export function civil(y: number, m: number, d: number): CivilDate {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toISOString().slice(0, 10);
}

export function addDays(cd: CivilDate, n: number): CivilDate {
  const { y, m, d } = parseCivil(cd);
  return civil(y, m, d + n);
}

export function daysBetween(a: CivilDate, b: CivilDate): number {
  const pa = parseCivil(a), pb = parseCivil(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86400000);
}

export function weekdayOf(cd: CivilDate): number {
  const { y, m, d } = parseCivil(cd);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function civilDateOf(date: Date, tz: string): CivilDate {
  const p = localParts(date, tz);
  return civil(p.y, p.m, p.d);
}

export function startOfCivilDay(cd: CivilDate, tz: string): Date {
  const { y, m, d } = parseCivil(cd);
  return zonedToUtc(y, m, d, 0, 0, tz);
}

export function formatTime(date: Date | null | undefined, tz: string, locale = 'en-IN'): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat(locale, { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
}

/** Time with a day marker when it falls on a different civil date than `ref`. */
export function formatTimeRel(date: Date | null | undefined, ref: CivilDate, tz: string, locale = 'en-IN'): string {
  if (!date) return '—';
  const t = formatTime(date, tz, locale);
  const diff = daysBetween(ref, civilDateOf(date, tz));
  if (diff === 0) return t;
  const label = new Intl.DateTimeFormat(locale, { timeZone: tz, day: 'numeric', month: 'short' }).format(date);
  return `${t}, ${label}`;
}

export function formatCivil(cd: CivilDate, locale = 'en-IN', opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }): string {
  const { y, m, d } = parseCivil(cd);
  return new Intl.DateTimeFormat(locale, { ...opts, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

export function todayIn(tz: string): CivilDate {
  return civilDateOf(new Date(), tz);
}
