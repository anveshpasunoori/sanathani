import {
  nextGregorian, nextObservance, observancesInYear, resolveLunarDate, selectDay, tithiSpanInMonth,
} from '../src/engine/recurrence';
import { observancesInRange } from '../src/engine/observances';
import { lunarMonthsBetween } from '../src/engine/lunar';
import { dayPanchang, sunTimes } from '../src/engine/panchang';
import { addDays } from '../src/engine/tz';
import { HYD, NJ, SJ, VIJ } from './fixtures';

const festival = (id: string, year: number) =>
  observancesInRange(`${year}-01-01`, `${year}-12-31`, HYD, 'te').filter((o) => o.id === id).map((o) => o.date);

describe('festival dates by rule (Hyderabad)', () => {
  it.each([
    ['ugadi', 2025, '2025-03-30'], ['ugadi', 2026, '2026-03-19'], ['ugadi', 2027, '2027-04-07'],
    ['maha-shivaratri', 2025, '2025-02-26'], ['maha-shivaratri', 2026, '2026-02-15'],
    ['deepavali', 2025, '2025-10-20'], ['deepavali', 2026, '2026-11-08'],
    ['vijayadashami', 2025, '2025-10-02'], ['vijayadashami', 2026, '2026-10-20'],
    ['vinayaka-chavithi', 2025, '2025-08-27'], ['rama-navami', 2025, '2025-04-06'],
  ])('%s %i is %s', (id, year, date) => {
    expect(festival(id, year)).toEqual([date]);
  });

  it('includes Makara Sankranti in mid-January', () => {
    const d = festival('makara-sankranti', 2026)[0];
    expect(d >= '2026-01-14' && d <= '2026-01-15').toBe(true);
  });

  it('shows Bathukamma in the Telugu calendar only', () => {
    expect(observancesInRange('2026-09-01', '2026-10-31', HYD, 'te').some((o) => o.id === 'bathukamma')).toBe(true);
    expect(observancesInRange('2026-09-01', '2026-10-31', HYD, 'kn').some((o) => o.id === 'bathukamma')).toBe(false);
  });

  it('does not place festivals in an Adhika month', () => {
    const inAdhika = observancesInRange('2026-05-17', '2026-06-14', HYD).filter((o) => o.kind === 'festival');
    expect(inAdhika).toEqual([]);
  });
});

describe('original event → lunar date', () => {
  it('uses the exact thithi when the time is known', () => {
    const r = resolveLunarDate('2012-11-21', '15:40', VIJ);
    expect(r.basis).toBe('time');
    expect(r.options).toHaveLength(1);
    expect(r.lunar.monthIndex).toBe(7); // Kartika
  });
  it('asks instead of guessing when the thithi changed that day and no time was given', () => {
    const r = resolveLunarDate('1998-11-12', undefined, HYD);
    expect(r.options.length).toBeGreaterThan(1);
    expect(r.note).toMatch(/please choose/);
  });
  it('reports a single option when one thithi covers the whole day', () => {
    // A long thithi spanning the full civil day exists in most months; find one.
    let found = false;
    for (let d = '2026-01-01'; d < '2026-03-01' && !found; d = addDays(d, 1)) {
      found = resolveLunarDate(d, undefined, HYD).options.length === 1;
    }
    expect(found).toBe(true);
  });
});

describe('annual thithi recurrence', () => {
  it('chosen day always has the thithi at sunrise, or it is a kshaya thithi', () => {
    for (const m of lunarMonthsBetween(new Date('2026-01-01'), new Date('2027-12-31'))) {
      for (const t of [0, 7, 14, 22, 29]) {
        const span = tithiSpanInMonth(t, m);
        const o = selectDay(span, m, HYD, 'sunrise');
        const sr = sunTimes(o.date, HYD).sunrise;
        const atSunrise = sr >= span.start && sr < span.end;
        if (!atSunrise) {
          expect(o.reason).toMatch(/kshaya/);
          expect(sr < span.start).toBe(true);
          expect(sunTimes(addDays(o.date, 1), HYD).sunrise > span.end).toBe(true);
        }
      }
    }
  });

  it('Shraddha (aparahna) day has the thithi during the afternoon', () => {
    const lunar = resolveLunarDate('2012-11-21', '15:40', VIJ).lunar;
    for (const y of [2026, 2027, 2028, 2029, 2030]) {
      const [o] = observancesInYear(lunar, y, HYD, 'aparahna');
      const { sunrise, sunset } = sunTimes(o.date, HYD);
      const day = sunset.getTime() - sunrise.getTime();
      const a = new Date(sunrise.getTime() + (day * 3) / 5), b = new Date(sunrise.getTime() + (day * 4) / 5);
      expect(o.tithi.start < b && o.tithi.end > a).toBe(true);
      expect(o.tithi.index).toBe(lunar.tithiIndex);
      expect(o.month.index).toBe(lunar.monthIndex);
    }
  });

  it('occurs once per year normally, twice in an Adhika year with policy "both"', () => {
    const jyeshthaS5 = { monthIndex: 2, adhika: false, tithiIndex: 4 };
    expect(observancesInYear(jyeshthaS5, 2026, HYD, 'sunrise', 'nija')).toHaveLength(1);
    expect(observancesInYear(jyeshthaS5, 2026, HYD, 'sunrise', 'nija')[0].month.adhika).toBe(false);
    const both = observancesInYear(jyeshthaS5, 2026, HYD, 'sunrise', 'both');
    expect(both).toHaveLength(2);
    expect(both[0].month.adhika).toBe(true);
    expect(observancesInYear(jyeshthaS5, 2027, HYD, 'sunrise', 'both')).toHaveLength(1);
  });

  it('falls back to the Nija month for an Adhika-month original in a non-Adhika year', () => {
    const o = nextObservance({ monthIndex: 2, adhika: true, tithiIndex: 4 }, '2026-07-01', HYD);
    expect(o.caution).toMatch(/Adhika/);
    expect(o.month.adhika).toBe(false);
  });

  it('calculates with local sunrise in each country (dates may legitimately differ)', () => {
    const lunar = { monthIndex: 7, adhika: false, tithiIndex: 23 };
    for (const place of [HYD, NJ, SJ]) {
      const o = nextObservance(lunar, '2026-10-24', place, 'sunrise');
      const p = dayPanchang(o.date, place);
      const atSunrise = p.tithis[0].index === 23;
      expect(atSunrise || /kshaya/.test(o.reason)).toBe(true);
    }
  });

  it('moves about 11 days earlier per year, or ~19 days later after an Adhika month', () => {
    const lunar = { monthIndex: 6, adhika: false, tithiIndex: 9 };
    const dates = [2025, 2026, 2027, 2028, 2029].map((y) => observancesInYear(lunar, y, HYD)[0].date);
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]); prev.setUTCFullYear(prev.getUTCFullYear() + 1);
      const shift = (new Date(dates[i]).getTime() - prev.getTime()) / 86400000;
      expect(shift > -13 && shift < -9 || shift > 16 && shift < 21).toBe(true);
    }
  });
});

describe('Gregorian recurrence', () => {
  it('handles Feb 29 in common years', () => {
    expect(nextGregorian('2000-02-29', '2027-01-01')).toEqual({ date: '2027-02-28', note: expect.stringMatching(/Feb 28/) });
    expect(nextGregorian('2000-02-29', '2028-01-01').date).toBe('2028-02-29');
  });
  it('returns today when the anniversary is today', () => {
    expect(nextGregorian('2015-10-24', '2026-10-24').date).toBe('2026-10-24');
  });
});

describe('regional festivals', () => {
  const festivalsFor = (t: string) => observancesInRange('2026-10-20', '2027-04-30', HYD, t).map((o) => o.id);
  it("shows each region's own new year, not Ugadi everywhere", () => {
    expect(festivalsFor('te')).toContain('ugadi');
    expect(festivalsFor('kn')).toContain('ugadi');
    expect(festivalsFor('mr')).toContain('gudi-padwa');
    expect(festivalsFor('mr')).not.toContain('ugadi');
    expect(festivalsFor('north')).toContain('nav-samvatsar');
    expect(festivalsFor('north')).not.toContain('ugadi');
  });
  it('keeps North Indian festivals to the North Indian calendar', () => {
    const north = observancesInRange('2026-10-20', '2026-11-30', HYD, 'north');
    expect(north.find((o) => o.id === 'karva-chauth')?.date).toBe('2026-10-29');
    expect(north.find((o) => o.id === 'chhath')?.date).toBe('2026-11-15');
    expect(festivalsFor('te')).not.toContain('karva-chauth');
  });
});
