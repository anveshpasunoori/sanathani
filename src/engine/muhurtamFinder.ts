// Muhurtam finder: scans a date range for an activity and returns the windows that pass the
// general Panchangam screen (muhurta.ts) and, when people are chosen, their personal Tarabala
// and Chandrabala (no Vipat/Pratyak/Naidhana tara, no Chandrashtama).
import { moonSidereal } from './astro';
import { houseFrom, taraOf } from './horoscope';
import { rashiOf, type BirthChart } from './jyotish';
import { assessDay, type Activity, type DayAssessment, type Window } from './muhurta';
import type { Place } from './panchang';
import { addDays, type CivilDate } from './tz';

export interface Person { name: string; chart: BirthChart }

export interface MuhurtamWindow extends Window {
  night: boolean;
  /** Personal notes for each chosen person (all favourable when the window is listed). */
  personal: Array<{ name: string; tara: string; taraNo: number; chandra: number }>;
  abhijit: boolean;
}

export interface MuhurtamDay {
  date: CivilDate;
  quality: 'excellent' | 'good';
  windows: MuhurtamWindow[];
  assessment: DayAssessment;
  /** People for whom some windows were removed (Chandrashtama or weak Tarabala). */
  dropped: string[];
}

// Classical Tarabala: Vipat, Pratyak and Naidhana are avoided. Janma tara is accepted by many
// traditions and is shown as a note so families can decide.
const BAD_TARA = [3, 5, 7];

export function personalCheck(people: Person[], nak: number, at: Date) {
  const moonRashi = rashiOf(moonSidereal(at));
  return people.map((p) => {
    const tara = taraOf(p.chart.moon.nakshatra, nak);
    const chandra = houseFrom(p.chart.moon.rashi, moonRashi);
    return { name: p.name, tara: tara.name.en, taraNo: tara.number, taraOk: !BAD_TARA.includes(tara.number), chandra, chandraOk: chandra !== 8 };
  });
}

/** Split a window wherever the Moon changes sign, so Chandrabala is exact for each piece. */
function splitAtMoonSign(w: Window): Window[] {
  const out: Window[] = [];
  let s = w.start.getTime();
  const e = w.end.getTime();
  while (s < e) {
    const r = rashiOf(moonSidereal(new Date(s)));
    let lo = s, hi = e;
    if (rashiOf(moonSidereal(new Date(e))) === r) { out.push({ ...w, start: new Date(s), end: new Date(e) }); break; }
    while (hi - lo > 60000) { const mid = (lo + hi) / 2; if (rashiOf(moonSidereal(new Date(mid))) === r) lo = mid; else hi = mid; }
    out.push({ ...w, start: new Date(s), end: new Date(hi) });
    s = hi;
  }
  return out;
}

export function findMuhurtams(opts: { activity: Activity; from: CivilDate; days: number; place: Place; people?: Person[] }): MuhurtamDay[] {
  const { activity, from, days, place, people = [] } = opts;
  const out: MuhurtamDay[] = [];
  for (let i = 0; i < days; i++) {
    const a = assessDay(addDays(from, i), place, activity);
    if (!a.windows.length) continue;
    const p = a.panchang;
    const dropped = new Set<string>();
    const windows: MuhurtamWindow[] = [];
    for (const w of a.windows.flatMap(splitAtMoonSign)) {
      if (w.end.getTime() - w.start.getTime() < 20 * 60000) continue;
      const checks = personalCheck(people, w.nakshatra, new Date((w.start.getTime() + w.end.getTime()) / 2));
      const bad = checks.filter((c) => !c.taraOk || !c.chandraOk);
      if (bad.length) { bad.forEach((c) => dropped.add(c.name)); continue; }
      windows.push({
        ...w,
        night: w.start >= p.sunset,
        personal: checks.map((c) => ({ name: c.name, tara: c.tara, taraNo: c.taraNo, chandra: c.chandra })),
        abhijit: !!p.abhijit && w.start <= p.abhijit.start && w.end >= p.abhijit.end,
      });
    }
    // Join back-to-back windows with the same thithi and nakshatra (split only by sunset, karana or Moon sign).
    const merged = windows.reduce<MuhurtamWindow[]>((acc, w) => {
      const last = acc[acc.length - 1];
      if (last && last.end.getTime() === w.start.getTime() && last.tithi === w.tithi && last.nakshatra === w.nakshatra) last.end = w.end;
      else acc.push({ ...w });
      return acc;
    }, []);
    for (const w of merged) w.abhijit = !!p.abhijit && w.start <= p.abhijit.start && w.end >= p.abhijit.end;
    windows.splice(0, windows.length, ...merged);
    if (!windows.length) continue;
    const longest = Math.max(...windows.map((w) => w.end.getTime() - w.start.getTime()));
    const quality = a.verdict === 'favorable' && longest >= 60 * 60000 ? 'excellent' : 'good';
    out.push({ date: a.date, quality, windows, assessment: a, dropped: [...dropped] });
  }
  return out;
}
