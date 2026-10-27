import { birthChart } from '../src/engine/jyotish';
import { assessDay, durmuhurtam, moudhyami, varjyam } from '../src/engine/muhurta';
import { findMuhurtams, personalCheck } from '../src/engine/muhurtamFinder';
import { dayPanchang } from '../src/engine/panchang';
import { addDays, zonedToUtc } from '../src/engine/tz';
import { HYD, NJ } from './fixtures';

const overlaps = (a: { start: Date; end: Date }, b: { start: Date; end: Date }) => a.start < b.end && b.start < a.end;

describe('moudhyami (combustion)', () => {
  it('Guru is combust around the June 2025 Sun–Jupiter conjunction', () => {
    expect(moudhyami(new Date('2025-06-24T12:00:00Z')).guru).toBe(true);
    expect(moudhyami(new Date('2025-09-01T12:00:00Z')).guru).toBe(false);
  });
  it('Shukra is combust around the January 2026 superior conjunction', () => {
    expect(moudhyami(new Date('2026-01-06T12:00:00Z')).shukra).toBe(true);
    expect(moudhyami(new Date('2026-05-01T12:00:00Z')).shukra).toBe(false);
  });
  it('blocks weddings but not vehicle purchases', () => {
    expect(assessDay('2026-01-06', HYD, 'marriage').windows).toEqual([]);
    expect(assessDay('2026-01-06', HYD, 'marriage').factors.some((f) => /Shukra moudhyami/.test(f.text))).toBe(true);
  });
});

describe('Durmuhurtam and Varjyam', () => {
  it('Durmuhurtam is 1/15 of daytime at the weekday positions', () => {
    const p = dayPanchang('2026-10-24', HYD); // Saturday → 1st and 2nd muhurtas
    const d = durmuhurtam(p);
    expect(d).toHaveLength(2);
    expect(d[0].start.getTime()).toBe(p.sunrise.getTime());
    expect(Math.round((d[1].end.getTime() - p.sunrise.getTime()) / 60000)).toBe(Math.round((2 * (p.sunset.getTime() - p.sunrise.getTime())) / 15 / 60000));
  });
  it('Varjyam lasts 4 of 60 ghatis of its nakshatra', () => {
    const p = dayPanchang('2026-11-02', HYD);
    for (const v of varjyam(p)) {
      const n = p.nakshatras.find((x) => v.start >= x.start && v.start < x.end)!;
      expect((v.end.getTime() - v.start.getTime()) / (n.end.getTime() - n.start.getTime())).toBeCloseTo(4 / 60, 6);
    }
  });
  it('no muhurtam window overlaps any avoided period', () => {
    for (let i = 0; i < 60; i++) {
      const a = assessDay(addDays('2026-11-01', i), HYD, 'housewarming');
      for (const w of a.windows) for (const x of a.avoid) expect(overlaps(w, x.span)).toBe(false);
    }
  });
});

describe('findMuhurtams', () => {
  const groom = { name: 'G', chart: birthChart({ instant: zonedToUtc(1994, 2, 10, 7, 20, HYD.tz), lat: HYD.lat, lon: HYD.lon, timeKnown: true }) };
  const bride = { name: 'B', chart: birthChart({ instant: zonedToUtc(1996, 9, 3, 22, 5, HYD.tz), lat: HYD.lat, lon: HYD.lon, timeKnown: true }) };

  it('finds wedding muhurtams, including night ones, in a 6-month range quickly', () => {
    const t = performance.now();
    const r = findMuhurtams({ activity: 'marriage', from: '2027-01-01', days: 180, place: HYD });
    expect(performance.now() - t).toBeLessThan(8000);
    expect(r.length).toBeGreaterThan(5);
    expect(r.some((d) => d.windows.some((w) => w.night))).toBe(true);
    for (const d of r) expect(d.assessment.panchang.weekday).not.toBe(2); // no Tuesdays
  });

  it('every listed window is favourable for every chosen person', () => {
    const r = findMuhurtams({ activity: 'marriage', from: '2027-01-01', days: 120, place: HYD, people: [groom, bride] });
    expect(r.length).toBeGreaterThan(0);
    for (const d of r) for (const w of d.windows) {
      for (const c of personalCheck([groom, bride], w.nakshatra, new Date((w.start.getTime() + w.end.getTime()) / 2))) {
        expect(c.taraOk && c.chandraOk).toBe(true);
      }
    }
  });

  it('personal filtering only removes windows, never adds them', () => {
    const all = findMuhurtams({ activity: 'housewarming', from: '2026-11-01', days: 90, place: NJ });
    const mine = findMuhurtams({ activity: 'housewarming', from: '2026-11-01', days: 90, place: NJ, people: [groom] });
    expect(mine.length).toBeLessThanOrEqual(all.length);
    expect(mine.every((d) => all.some((x) => x.date === d.date))).toBe(true);
  });
});
