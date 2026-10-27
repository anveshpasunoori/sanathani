// Lunar months (Amanta: new moon to new moon) and the 60-year Samvatsara cycle.
// A month is named after the solar sign the Sun enters during it (sankranti rule):
// month index = (sidereal sign of the Sun at the opening new moon + 1) mod 12, Chaitra = 0.
// A month with no sankranti is Adhika (named after the following month); a month with two
// sankrantis is Kshaya and carries both names.
import { nextElongation, sunSidereal } from './astro';

export interface LunarMonth {
  index: number;
  adhika: boolean;
  /** Present when the month is Kshaya: the second (skipped) month index it also stands for. */
  kshayaAlso?: number;
  start: Date;
  end: Date;
}

const DAY = 86400000;
const rashi = (d: Date) => Math.floor(sunSidereal(d) / 30);

/** Latest new moon at or before `d`. */
export function newMoonBefore(d: Date): Date {
  let nm = nextElongation(0, new Date(d.getTime() - 31 * DAY), 31)!;
  for (;;) {
    const next = nextElongation(0, new Date(nm.getTime() + DAY), 31)!;
    if (next.getTime() > d.getTime()) break;
    nm = next;
  }
  return nm;
}

export function newMoonAfter(d: Date): Date {
  return nextElongation(0, new Date(d.getTime() + 1000), 31)!;
}

export function monthFromNewMoons(start: Date, end: Date): LunarMonth {
  const r0 = rashi(start);
  const r1 = rashi(end);
  const steps = (r1 - r0 + 12) % 12;
  const month: LunarMonth = { index: (r0 + 1) % 12, adhika: steps === 0, start, end };
  if (steps === 2) month.kshayaAlso = (r0 + 2) % 12;
  return month;
}

export function lunarMonthAt(d: Date): LunarMonth {
  const start = newMoonBefore(d);
  return monthFromNewMoons(start, newMoonAfter(start));
}

/** All lunar months that overlap [from, to]. */
export function lunarMonthsBetween(from: Date, to: Date): LunarMonth[] {
  const out: LunarMonth[] = [];
  let start = newMoonBefore(from);
  while (start.getTime() <= to.getTime()) {
    const end = newMoonAfter(start);
    out.push(monthFromNewMoons(start, end));
    start = end;
  }
  return out;
}

/** Shaka year and Samvatsara index (0 = Prabhava). The year turns at Chaitra Shukla Pratipada. */
export function samvatsaraAt(d: Date, month: LunarMonth): { shakaYear: number; samvatsara: number } {
  const gy = d.getUTCFullYear();
  const gm = d.getUTCMonth() + 1;
  const beforeUgadi = (month.index >= 9 && gm <= 4) || (month.index === 0 && month.adhika);
  const shakaYear = beforeUgadi ? gy - 79 : gy - 78;
  return { shakaYear, samvatsara: (shakaYear + 11) % 60 };
}
