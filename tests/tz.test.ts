import { addDays, civilDateOf, daysBetween, tzOffsetMinutes, zonedToUtc } from '../src/engine/tz';

describe('time zones', () => {
  it('converts IST wall time to UTC', () => {
    expect(zonedToUtc(2026, 1, 15, 5, 30, 'Asia/Kolkata').toISOString()).toBe('2026-01-15T00:00:00.000Z');
  });
  it('handles US daylight saving on both sides of the change', () => {
    expect(tzOffsetMinutes(new Date('2026-03-07T12:00:00Z'), 'America/New_York')).toBe(-300);
    expect(tzOffsetMinutes(new Date('2026-03-09T12:00:00Z'), 'America/New_York')).toBe(-240);
    expect(zonedToUtc(2026, 3, 9, 8, 0, 'America/New_York').toISOString()).toBe('2026-03-09T12:00:00.000Z');
    expect(zonedToUtc(2026, 3, 7, 8, 0, 'America/New_York').toISOString()).toBe('2026-03-07T13:00:00.000Z');
  });
  it('rolls a non-existent DST time forward instead of failing', () => {
    const t = zonedToUtc(2026, 3, 8, 2, 30, 'America/New_York');
    expect(civilDateOf(t, 'America/New_York')).toBe('2026-03-08');
  });
  it('does civil date arithmetic across leap days', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
  });
});
