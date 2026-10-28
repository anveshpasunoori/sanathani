import { DEFAULT_SETTINGS } from '../src/data/store';
import { shoppingText } from '../src/data/shopping';
import type { Settings } from '../src/data/types';
import { festivalText, planFestivals } from '../src/reminders/festivals';
import { planPoojas } from '../src/reminders/poojaFollows';
import { dueReminders } from '../src/reminders/schedule';
import { HYD } from './fixtures';

const base: Settings = { ...DEFAULT_SETTINGS, onboarded: true, place: HYD, tradition: 'te', reminderTime: '08:00' };

describe('festival reminders', () => {
  it('reminds of a followed festival the day before, at the reminder time', () => {
    const s = { ...base, follows: ['deepavali'] };
    const p = planFestivals(s, '2026-10-26')[0];
    expect(p.date).toBe('2026-11-08');
    expect(p.fireAt.toISOString()).toBe('2026-11-07T02:30:00.000Z'); // 08:00 in India
    expect(p.route).toEqual({ tab: 'calendar', date: '2026-11-08' });
    expect(festivalText(p, 0, s).body).toMatch(/^Tomorrow · /);
  });

  it('follows every occurrence of a recurring vrata, and nothing that is not followed', () => {
    const s = { ...base, follows: ['ekadashi'] };
    const plan = planFestivals(s, '2026-10-26', undefined, 60);
    expect(plan.length).toBeGreaterThanOrEqual(3);
    expect(plan.every((p) => p.follow === 'ekadashi')).toBe(true);
    expect(planFestivals({ ...base, follows: [] }, '2026-10-26')).toEqual([]);
  });

  it('reminds of a followed pooja with a nudge to get the samagri, opening the pooja', () => {
    const s = { ...base, follows: ['pooja:thiruppavai'] };
    const plan = planFestivals(s, '2026-10-26', planPoojas, 120);
    expect(plan.map((p) => p.date)).toEqual(expect.arrayContaining(['2026-12-16', '2027-01-11', '2027-01-14']));
    expect(plan[0].route).toEqual({ tab: 'pooja', id: 'thiruppavai' });
    expect(festivalText(plan[0], 0, s).body).toContain('samagri');
  });

  it('is delivered once, when due', () => {
    const s = { ...base, follows: ['deepavali'] };
    const plan = planFestivals(s, '2026-11-07', undefined, 3);
    const at = new Date('2026-11-07T03:00:00Z');
    expect(dueReminders(plan, {}, at).map((p) => p.date)).toEqual(['2026-11-08']);
    expect(dueReminders(plan, { [plan[0].key]: at.toISOString() }, at)).toEqual([]);
  });
});

describe('samagri shopping list', () => {
  it('lists what is still to get first, then what is ticked, then the naivedyam', () => {
    const text = shoppingText({
      heading: 'Shopping list — Lakshmi Pooja', when: '📅 Friday: Fri, 30 Oct',
      samagri: [{ en: 'Lotus flowers', te: 'తామర పూలు' }, { en: 'Kumkum', te: 'కుంకుమ' }, { en: 'Camphor', te: 'కర్పూరం' }],
      checked: { 1: true }, naivedyam: [{ en: 'Payasam', te: 'పాయసం' }], te: false,
      labels: { toGet: 'To get', alreadyHave: 'Already have', naivedyam: 'For naivedyam' },
    });
    expect(text).toBe([
      '🛒 Shopping list — Lakshmi Pooja', '📅 Friday: Fri, 30 Oct',
      '', 'To get:', '☐ Lotus flowers', '☐ Camphor',
      '', 'Already have:', '✓ Kumkum',
      '', 'For naivedyam:', '• Payasam',
      '', '— Nitya',
    ].join('\n'));
  });
});
