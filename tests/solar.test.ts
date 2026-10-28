import { describe, expect, it } from 'vitest';
import { occurrencesBetween } from '../src/data/occurrences';
import { POOJAS } from '../src/data/poojas';
import { DEFAULT_SETTINGS } from '../src/data/store';
import { describeSolar, solarObservancesBetween } from '../src/engine/solarRecurrence';
import { observancesInRange } from '../src/engine/observances';
import { solarDate, solarMonthName, solarYear } from '../src/engine/solar';
import type { Place } from '../src/engine/panchang';

const CHENNAI: Place = { name: 'Chennai', lat: 13.0827, lon: 80.2707, tz: 'Asia/Kolkata' };
const KOCHI: Place = { name: 'Kochi', lat: 9.9312, lon: 76.2673, tz: 'Asia/Kolkata' };

describe('Tamil and Malayalam solar months', () => {
  it('starts Tamil months by the sunset rule', () => {
    // Karka sankranti on 16 July 2025 was before sunset, so Aadi 1 was that day (Aadi Perukku, Aadi 18, on 2 August).
    expect(solarDate('2025-07-16', CHENNAI, 'tamil')).toMatchObject({ month: 3, day: 1 });
    expect(solarDate('2025-08-02', CHENNAI, 'tamil')).toMatchObject({ month: 3, day: 18 });
    expect(solarDate('2025-04-14', CHENNAI, 'tamil')).toMatchObject({ month: 0, day: 1 });
    expect(solarMonthName('tamil', 3, 'ta')).toBe('ஆடி');
  });
  it('starts Malayalam months by the three-fifths-of-daytime rule', () => {
    expect(solarDate('2025-07-17', KOCHI, 'malayalam')).toMatchObject({ month: 3, day: 1 }); // Karkidakam 1
    expect(solarDate('2025-08-17', KOCHI, 'malayalam')).toMatchObject({ month: 4, day: 1 }); // Chingam 1
    expect(solarDate('2025-11-17', KOCHI, 'malayalam')).toMatchObject({ month: 7, day: 1 }); // Vrischikam 1
    expect(solarMonthName('malayalam', 4, 'ml')).toBe('ചിങ്ങം');
  });
  it('counts the years each region uses', () => {
    expect(solarYear(solarDate('2026-08-20', KOCHI, 'malayalam'), 'malayalam')).toBe(1202);
    expect(solarYear(solarDate('2026-08-10', KOCHI, 'malayalam'), 'malayalam')).toBe(1201);
    expect(solarYear(solarDate('2026-10-26', CHENNAI, 'tamil'), 'tamil')).toBe(39); // Parabhava
    expect(solarYear(solarDate('2026-03-01', CHENNAI, 'tamil'), 'tamil')).toBe(38);
  });
});

describe('Tamil Nadu and Kerala festivals', () => {
  const on = (t: string, place: Place, id: string) => observancesInRange('2025-04-01', '2026-03-31', place, t).filter((o) => o.id === id).map((o) => o.date);
  it('matches published Tamil dates', () => {
    expect(on('ta', CHENNAI, 'puthandu')).toEqual(['2025-04-14']);
    expect(on('ta', CHENNAI, 'aadi-perukku')).toEqual(['2025-08-02']);
    expect(on('ta', CHENNAI, 'skanda-sashti')).toEqual(['2025-10-27']);
    expect(on('ta', CHENNAI, 'karthigai-deepam')).toEqual(['2025-12-03']);
    expect(on('ta', CHENNAI, 'vaikunta-ekadashi')).toEqual(['2025-12-30']);
    expect(on('ta', CHENNAI, 'arudra-darisanam')).toEqual(['2026-01-03']);
    expect(on('ta', CHENNAI, 'thai-pongal')).toEqual(['2026-01-14']);
    expect(on('ta', CHENNAI, 'thaipusam')).toEqual(['2026-02-01']);
  });
  it('matches published Kerala dates', () => {
    expect(on('ml', KOCHI, 'vishu')).toEqual(['2025-04-14']);
    expect(on('ml', KOCHI, 'onam')).toEqual(['2025-09-05']);
    expect(on('ml', KOCHI, 'ashtami-rohini')).toEqual(['2025-09-14']);
    expect(on('ml', KOCHI, 'mandala-begins')).toEqual(['2025-11-17']);
    expect(on('ml', KOCHI, 'thrikarthika')).toEqual(['2025-12-03']);
    expect(on('ml', KOCHI, 'makaravilakku')).toEqual(['2026-01-14']);
  });
  it("keeps other regions' festivals out", () => {
    for (const t of ['ta', 'ml']) {
      const ids = observancesInRange('2025-04-01', '2026-03-31', CHENNAI, t).map((o) => o.id);
      for (const id of ['ugadi', 'holi', 'dhanteras', 'karva-chauth']) expect(ids, `${t} ${id}`).not.toContain(id);
    }
    expect(on('te', CHENNAI, 'puthandu')).toEqual([]);
    expect(on('te', CHENNAI, 'vaikunta-ekadashi')).toEqual(['2025-12-30']);
  });
  it('gives every pooja upcoming dates in Tamil Nadu and Kerala', () => {
    for (const [t, place] of [['ta', CHENNAI], ['ml', KOCHI]] as const) {
      // Birthday and anniversary poojas follow the family's own dates, not the calendar.
      for (const p of POOJAS.filter((x) => !['birthday', 'anniversary'].includes(x.id))) expect(p.next('2026-10-26', place, t).length, `${t} ${p.id}`).toBeGreaterThan(0);
    }
  });
});

describe('family events by the solar calendar', () => {
  const base = {
    personName: 'Amma', relationship: 'Mother', category: 'birthday' as const, tradition: 'ml' as const, rule: 'sunrise' as const,
    adhikaPolicy: 'nija' as const, reminders: [], privacy: 'private' as const, createdAt: '', updatedAt: '',
  };
  it('keeps a Kerala birthday on the same star in the same Malayalam month', () => {
    const anchor = { system: 'malayalam' as const, month: 4, by: 'star' as const, nakshatra: 21 }; // Chingam Thiruvonam
    expect(describeSolar(anchor, 'ml')).toBe('ചിങ്ങം തിരുവോണം');
    expect(solarObservancesBetween(anchor, '2025-01-01', '2027-12-31', KOCHI).map((o) => o.date)).toEqual(['2025-09-05', '2026-08-26', '2027-09-12']);
    const e = { ...base, id: 'k', originalDate: '1960-08-28', recurrence: 'solar' as const, solar: anchor };
    const s = { ...DEFAULT_SETTINGS, place: KOCHI, tradition: 'ml' as const };
    expect(occurrencesBetween(e, s, '2026-01-01', '2026-12-31').map((o) => o.date)).toEqual(['2026-08-26']);
  });
  it('keeps a Tamil Shraddham on the same thithi in the same Tamil month', () => {
    const anchor = { system: 'tamil' as const, month: 6, by: 'thithi' as const, tithiIndex: 24 }; // Aippasi Krishna Dashami
    const days = solarObservancesBetween(anchor, '2025-01-01', '2027-12-31', CHENNAI, 'aparahna');
    expect(days.map((o) => o.date)).toEqual(['2025-11-14', '2026-11-03', '2027-10-24']);
    for (const o of days) {
      const sd = solarDate(o.date, CHENNAI, 'tamil');
      expect(sd.month).toBe(6);
    }
  });
  it('lets the family keep the second when the star comes twice in the month', () => {
    const anchor = { system: 'malayalam' as const, month: 0, by: 'star' as const, nakshatra: 0 }; // Medam Ashwini
    const first = solarObservancesBetween(anchor, '2029-01-01', '2029-12-31', KOCHI)[0];
    const second = solarObservancesBetween({ ...anchor, repeat: 'second' }, '2029-01-01', '2029-12-31', KOCHI)[0];
    expect(first.reason).toContain('twice');
    expect(second.date > first.date).toBe(true);
    expect(solarDate(second.date, KOCHI, 'malayalam').month).toBe(0);
  });
});
