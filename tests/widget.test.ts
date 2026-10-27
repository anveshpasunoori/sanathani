import { DEFAULT_SETTINGS } from '../src/data/store';
import type { AppState } from '../src/data/types';
import { widgetData } from '../src/data/widget';
import { HYD } from './fixtures';

const state = (lang: AppState['settings']['lang'] = 'en'): AppState => ({
  version: 1, settings: { ...DEFAULT_SETTINGS, onboarded: true, lang, place: HYD, tradition: 'te' },
  events: [{
    id: 'e1', personName: 'Venkata Rao', relationship: 'Grandfather', category: 'death', originalDate: '2012-11-21', originalTime: '15:40',
    recurrence: 'gregorian', rule: 'aparahna', adhikaPolicy: 'nija', tradition: 'te', privacy: 'private', reminders: [],
    createdAt: '2020-01-01T00:00:00Z', updatedAt: '2020-01-01T00:00:00Z',
  }],
  occurrences: {}, delivered: {}, notices: [], profiles: [], tombstones: {},
});

describe('home-screen widget data', () => {
  it('covers two weeks with the thithi and nakshatra spans, Rahu Kalam and festivals', () => {
    const w = widgetData(state(), '2026-11-01');
    expect(w.days).toHaveLength(14);
    expect(w.days[0].date).toBe('2026-11-01');
    expect(w.days[0].tithis.length).toBeGreaterThan(0);
    expect(new Date(w.days[0].tithis[0].ends).getTime()).toBeGreaterThan(Date.parse('2026-11-01T00:00:00Z'));
    expect(w.days[0].rahu.text).toMatch(/–/);
    expect(w.days.flatMap((d) => d.festivals)).toContain('Deepavali (Lakshmi Puja)');
    expect(w.place).toBe('Hyderabad');
  });

  it('shows the family event on its day and as the next one', () => {
    const w = widgetData(state(), '2026-11-15');
    expect(w.days.find((d) => d.date === '2026-11-21')!.family).toEqual(['Venkata Rao — Death anniversary']);
    expect(w.nextFamily).toMatch(/^Venkata Rao — Death anniversary · /);
  });

  it('is in the reader\'s language', () => {
    const w = widgetData(state('te'), '2026-11-01');
    expect(w.labels.thithi).toBe('తిథి');
    expect(w.days[0].tithis[0].name).toMatch(/[ఀ-౿]/);
    expect(w.days[0].heading).toMatch(/[ఀ-౿]/);
  });
});
