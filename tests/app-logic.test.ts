import { parse } from '../src/assistant/parse';
import { answer } from '../src/assistant/answer';
import { refreshOccurrences } from '../src/data/occurrences';
import { DEFAULT_SETTINGS, withBirthdayProfiles } from '../src/data/store';
import type { AppState, FamilyEvent, Settings } from '../src/data/types';
import { dueReminders, fireTime, planAhead, planReminders, reminderText } from '../src/reminders/schedule';
import { notificationId } from '../src/ui/nativeReminders';
import { buildIcs } from '../src/reminders/ics';
import { traditionForLang } from '../src/data/traditions';
import { HYD, NJ } from './fixtures';

const settings: Settings = { ...DEFAULT_SETTINGS, onboarded: true, place: HYD };

const event = (patch: Partial<FamilyEvent> = {}): FamilyEvent => ({
  id: 'e1', personName: 'Father', relationship: 'Father', category: 'death', title: 'Annual Shraddha',
  originalDate: '2012-11-21', originalTime: '15:40', recurrence: 'thithi',
  lunar: { monthIndex: 7, adhika: false, tithiIndex: 22 }, rule: 'aparahna', adhikaPolicy: 'nija',
  tradition: 'te', privacy: 'private', createdAt: '2020-01-01T00:00:00Z', updatedAt: '2020-01-01T00:00:00Z',
  reminders: [{ id: 'r7', daysBefore: 7, time: '20:00', channels: ['push'] }, { id: 'r0', daysBefore: 0, time: '07:00', channels: ['push'] }],
  ...patch,
});

describe('reminders', () => {
  it('computes fire times in the user time zone across DST', () => {
    const r = { id: 'x', daysBefore: 7, time: '20:00', channels: ['push' as const] };
    // Observance Nov 5 2026 in New York; 7 days before is Oct 29 (EDT, UTC-4).
    expect(fireTime('2026-11-05', r, NJ.tz).toISOString()).toBe('2026-10-30T00:00:00.000Z');
    // Observance Nov 10; 7 days before is Nov 3 (EST, UTC-5).
    expect(fireTime('2026-11-10', r, NJ.tz).toISOString()).toBe('2026-11-04T01:00:00.000Z');
  });

  it('never delivers the same reminder twice and skips very stale ones', () => {
    const planned = planReminders([event()], settings, '2026-10-24');
    expect(planned).toHaveLength(2);
    const [r7, r0] = planned;
    const at7 = new Date(r7.fireAt.getTime() + 60000);
    expect(dueReminders(planned, {}, at7).map((d) => d.reminder.id)).toEqual(['r7']);
    const delivered = { [r7.key]: 'x' };
    expect(dueReminders(planned, delivered, at7)).toEqual([]);
    // A week later only the on-the-day reminder is due; the 7-day one is delivered (or too stale).
    const at0 = new Date(r0.fireAt.getTime() + 60000);
    expect(dueReminders(planned, {}, at0).map((d) => d.reminder.id)).toEqual(['r0']);
    expect(dueReminders(planned, {}, new Date(r0.fireAt.getTime() + 72 * 3600000))).toEqual([]);
  });

  it('plans the phone schedule ahead: future reminders only, soonest first, samples skipped, capped', () => {
    const now = new Date('2026-10-24T00:00:00Z');
    const yearly = event({ id: 'g', recurrence: 'gregorian', category: 'birthday', title: undefined, originalDate: '1990-11-01', lunar: undefined });
    const planned = planAhead([event(), yearly, event({ id: 's', isSample: true })], settings, '2026-10-24', now, 400);
    expect(planned.length).toBeGreaterThanOrEqual(4);
    expect(planned.every((p) => p.fireAt > now && p.event.id !== 's')).toBe(true);
    expect(planned.map((p) => p.fireAt.getTime())).toEqual(planned.map((p) => p.fireAt.getTime()).sort((a, b) => a - b));
    // Next year's occurrences are included, so reminders keep coming if the app isn't opened for months.
    expect(planned.some((p) => p.occurrence >= '2027-10-01')).toBe(true);
    expect(planAhead([event(), yearly], settings, '2026-10-24', now, 400, 3)).toHaveLength(3);
    // Notification ids are stable positive 32-bit integers, distinct per reminder.
    const ids = planned.map((p) => notificationId(p.key));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => Number.isInteger(id) && id > 0 && id <= 0x7fffffff)).toBe(true);
    expect(notificationId(planned[0].key)).toBe(ids[0]);
  });

  it('writes reminder notifications in the chosen language', () => {
    const [r7] = planReminders([event({ title: undefined })], settings, '2026-10-24');
    expect(reminderText(r7, 0).body).toMatch(/^In 7 days · /);
    const te = reminderText(r7, 0, 'te');
    expect(te.title).toBe('Father — వర్ధంతి');
    expect(te.body).toMatch(/^7 రోజుల్లో · /);
    expect(reminderText(r7, 60, 'hi').body).toContain('देर से');
  });

  it('exports an ICS with one event per computed occurrence and alarms', () => {
    const ics = buildIcs([event()], settings, 3);
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('TRIGGER;VALUE=DATE-TIME:');
  });
});

describe('verified date-change detection', () => {
  it('raises a notice when moving location changes the date', () => {
    const e = event();
    const first = refreshOccurrences([e], settings, {}, '2026-10-24');
    expect(first.changes).toEqual([]);
    // Fake a previous computation on a different date for the same upcoming instance.
    const stale = { ...first.cache, e1: { ...first.cache.e1, date: '2026-12-31', placeKey: 'elsewhere' } };
    const second = refreshOccurrences([e], { ...settings, place: NJ }, stale, '2026-10-24');
    expect(second.changes[0]?.why).toMatch(/location/);
  });
  it('does not raise a notice after the user edits the event', () => {
    const e = event();
    const { cache } = refreshOccurrences([e], settings, {}, '2026-10-24');
    const edited = { ...e, lunar: { ...e.lunar!, tithiIndex: 10 }, updatedAt: new Date(Date.now() + 1000).toISOString() };
    expect(refreshOccurrences([edited], settings, cache, '2026-10-24').changes).toEqual([]);
  });
});

describe('assistant', () => {
  const today = '2026-10-24';
  it.each([
    ["What are today's Thithi, Nakshatra, Yoga and Karana?", 'panchang'],
    ['Is today a good day to start a new business?', 'suitability'],
    ['Is tomorrow suitable for buying a house?', 'suitability'],
    ['What is the best available Muhurta next week for a housewarming?', 'best-muhurta'],
    ["When is my father's death anniversary according to Thithi this year?", 'family-event'],
    ['When should I perform my father\'s annual Shraddha?', 'family-event'],
    ['Which family events are coming up this month?', 'upcoming-events'],
    ["What rituals are traditionally performed on today's Thithi?", 'rituals'],
    ["Why is this year's Thithi anniversary on a different date?", 'why-different'],
    ['Remember my wedding anniversary on the Telugu calendar and remind me every year three days before', 'add-event'],
    ['ఈ రోజు తిథి ఏమిటి?', 'panchang'],
  ])('%s → %s', (q, kind) => {
    expect(parse(q, today).kind).toBe(kind);
  });

  it('extracts reminders and recurrence from a natural-language event', () => {
    const i = parse("Remember my father's death anniversary by thithi. Remind me seven days before at 8:00 PM and again on the day at 7:00 AM", today);
    expect(i.kind).toBe('add-event');
    if (i.kind !== 'add-event') return;
    expect(i.draft).toMatchObject({ category: 'death', relationship: 'Father', recurrence: 'thithi' });
    expect(i.draft.reminders).toEqual([{ daysBefore: 7, time: '20:00' }, { daysBefore: 0, time: '07:00' }]);
  });

  it('answers family-event questions from saved data with the reasoning', () => {
    const s: AppState = { version: 1, settings, events: [event()], occurrences: {}, delivered: {}, notices: [], profiles: [] };
    const a = answer("When is my father's death anniversary this year?", s);
    expect(a.sections?.[0].items[0]).toMatch(/Krishna Paksha Ashtami/);
    expect(a.source).toMatch(/Lahiri/);
  });

  it('never states certainty about outcomes for muhurta questions', () => {
    const s: AppState = { version: 1, settings, events: [], occurrences: {}, delivered: {}, notices: [], profiles: [] };
    const a = answer('Is tomorrow good for buying a house?', s);
    expect(a.caution).toMatch(/traditional beliefs/);
    expect(a.sections?.map((x) => x.heading)).toEqual(['Traditional considerations', 'Available windows', 'Periods to avoid']);
  });
});

describe('muhurta screening is robust across locations and days', () => {
  it('assesses 60 days in four cities without errors', async () => {
    const { assessDay } = await import('../src/engine/muhurta');
    const { SJ } = await import('./fixtures');
    const { addDays } = await import('../src/engine/tz');
    for (const place of [HYD, NJ, SJ, { name: 'London', lat: 51.5074, lon: -0.1278, tz: 'Europe/London' }]) {
      for (let i = 0; i < 60; i++) {
        const a = assessDay(addDays('2026-10-20', i), place, 'property');
        for (const w of a.windows) expect(w.end > w.start).toBe(true);
      }
    }
  });
});

describe('calendar suggested by language', () => {
  it('maps each language to its usual Panchangam, leaving English alone', () => {
    expect(traditionForLang('ta', 'te')).toBe('ta');
    expect(traditionForLang('ml', 'te')).toBe('ml');
    expect(traditionForLang('kn', 'north')).toBe('kn');
    expect(traditionForLang('mr', 'te')).toBe('mr');
    expect(traditionForLang('hi', 'te')).toBe('north');
    expect(traditionForLang('te', 'ml')).toBe('te');
    expect(traditionForLang('en', 'ml')).toBe('ml');
  });
});

describe('birthday events make horoscope profiles', () => {
  const base = (patch: Partial<AppState> = {}): AppState => ({ version: 1, settings: { ...settings, place: NJ }, events: [], occurrences: {}, delivered: {}, notices: [], profiles: [], tombstones: {}, ...patch });
  const bday = (patch: Partial<FamilyEvent> = {}) => event({ id: 'b1', personName: 'Anvesh', relationship: 'Self', category: 'birthday', title: 'Birthday', originalDate: '1990-03-14', originalTime: undefined, originalPlace: NJ, recurrence: 'gregorian', ...patch });

  it('creates a profile from the date alone, with the home place and no time', () => {
    const s = withBirthdayProfiles(base({ events: [bday(), event()] }));
    expect(s.profiles).toHaveLength(1);
    expect(s.profiles[0]).toMatchObject({ id: 'bday-b1', eventId: 'b1', name: 'Anvesh', relation: 'Self', date: '1990-03-14', place: NJ });
    expect(s.profiles[0].time).toBeUndefined();
  });

  it('uses the birth time and place when the event has them', () => {
    const s = withBirthdayProfiles(base({ events: [bday({ originalTime: '05:30', originalPlace: HYD })] }));
    expect(s.profiles[0]).toMatchObject({ time: '05:30', place: HYD });
  });

  it('keeps details added in the Horoscope tab when the event is edited without them', () => {
    const s1 = withBirthdayProfiles(base({ events: [bday()] }));
    const edited = { ...s1, profiles: [{ ...s1.profiles[0], time: '05:30', place: HYD }] };
    const s2 = withBirthdayProfiles({ ...edited, events: [bday({ personName: 'Anvesh P' })] });
    expect(s2.profiles).toHaveLength(1);
    expect(s2.profiles[0]).toMatchObject({ name: 'Anvesh P', time: '05:30', place: HYD });
  });

  it('links an existing profile with the same name and date instead of duplicating it', () => {
    const own = { id: 'p1', name: 'anvesh', relation: 'Self', date: '1990-03-14', time: '05:30', place: HYD };
    const s = withBirthdayProfiles(base({ events: [bday()], profiles: [own] }));
    expect(s.profiles).toHaveLength(1);
    expect(s.profiles[0]).toMatchObject({ id: 'p1', eventId: 'b1', time: '05:30', place: HYD });
  });

  it('is stable, skips samples, and does not bring back a deleted profile', () => {
    const s1 = withBirthdayProfiles(base({ events: [bday()] }));
    expect(withBirthdayProfiles(s1)).toBe(s1);
    expect(withBirthdayProfiles(base({ events: [bday({ isSample: true })] })).profiles).toHaveLength(0);
    expect(withBirthdayProfiles(base({ events: [bday()], tombstones: { 'bday-b1': '2026-10-26T00:00:00Z' } })).profiles).toHaveLength(0);
  });
});
