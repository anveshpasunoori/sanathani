import { dayPanchang, tithiSpanAt } from '../src/engine/panchang';
import { SAMVATSARA } from '../src/engine/names';
import { lunarMonthAt } from '../src/engine/lunar';
import { HYD, NJ } from './fixtures';

describe('daily panchangam (Hyderabad)', () => {
  // Reference values are well-known public calendar facts.
  it.each([
    ['2025-04-06', 8, 'Sri Rama Navami: Shukla Navami'],
    ['2025-08-27', 3, 'Vinayaka Chavithi: Shukla Chaturthi'],
    ['2025-10-02', 9, 'Vijayadashami: Shukla Dashami'],
    ['2025-03-30', 0, 'Ugadi 2025: Shukla Pratipada'],
  ])('%s has thithi %i at sunrise (%s)', (date, tithi) => {
    expect(dayPanchang(date, HYD).tithis[0].index).toBe(tithi);
  });

  it('names the Samvatsara around Ugadi', () => {
    expect(SAMVATSARA[dayPanchang('2025-03-29', HYD).samvatsara]).toBe('Krodhi');
    expect(SAMVATSARA[dayPanchang('2025-03-30', HYD).samvatsara]).toBe('Vishvavasu');
    expect(SAMVATSARA[dayPanchang('2026-06-01', HYD).samvatsara]).toBe('Parabhava');
  });

  it('detects Adhika Jyeshtha 2026 and Adhika Shravana 2023', () => {
    const m26 = dayPanchang('2026-06-01', HYD).month;
    expect([m26.index, m26.adhika]).toEqual([2, true]);
    const nija = dayPanchang('2026-06-20', HYD).month;
    expect([nija.index, nija.adhika]).toEqual([2, false]);
    const m23 = lunarMonthAt(new Date('2023-07-25T06:00:00Z'));
    expect([m23.index, m23.adhika]).toEqual([4, true]);
  });

  it('thithi spans are 19–27 hours and contiguous', () => {
    let t = new Date('2026-01-01T00:00:00Z');
    for (let i = 0; i < 60; i++) {
      const s = tithiSpanAt(t);
      const hours = (s.end.getTime() - s.start.getTime()) / 3600000;
      expect(hours).toBeGreaterThan(19);
      expect(hours).toBeLessThan(27);
      const next = tithiSpanAt(new Date(s.end.getTime() + 1000));
      expect(Math.abs(next.start.getTime() - s.end.getTime())).toBeLessThan(5000);
      expect(next.index).toBe((s.index + 1) % 30);
      t = new Date(s.end.getTime() + 1000);
    }
  });

  it('lists every thithi touching the Hindu day', () => {
    const p = dayPanchang('2026-03-19', HYD);
    expect(p.tithis[0].index).toBe(29); // Amavasya at sunrise
    expect(p.tithis.map((t) => t.index)).toContain(0);
  });

  it('places Rahu Kalam in the correct eighth of the day', () => {
    const p = dayPanchang('2026-10-25', HYD); // Sunday: 8th part
    expect(p.rahuKalam.end.getTime()).toBe(p.sunset.getTime());
    const mon = dayPanchang('2026-10-26', HYD); // Monday: 2nd part
    const eighth = (mon.sunset.getTime() - mon.sunrise.getTime()) / 8;
    expect(mon.rahuKalam.start.getTime() - mon.sunrise.getTime()).toBeCloseTo(eighth, -2);
  });

  it('uses local sunrise abroad (US Eastern)', () => {
    const p = dayPanchang('2026-07-01', NJ);
    const h = +new Intl.DateTimeFormat('en-US', { timeZone: NJ.tz, hour: 'numeric', hour12: false }).format(p.sunrise);
    expect(h).toBe(5);
  });
});
