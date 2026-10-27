import { DEFAULT_SETTINGS } from '../src/data/store';
import type { BirthProfile, FamilyEvent } from '../src/data/types';
import { mergeStates, sameSynced, type SyncedState } from '../src/sync/merge';
import { upgrade, upgradeTradition } from '../src/data/traditions';
import { HYD } from './fixtures';

const ev = (id: string, updatedAt: string, personName = id): FamilyEvent => ({
  id, personName, relationship: 'Father', category: 'birthday', originalDate: '1960-01-01', recurrence: 'gregorian',
  tradition: 'te', rule: 'sunrise', adhikaPolicy: 'nija', reminders: [], privacy: 'private', createdAt: updatedAt, updatedAt,
});
const prof = (id: string, updatedAt: string): BirthProfile => ({ id, name: id, relation: 'Self', date: '1990-01-01', place: HYD, updatedAt });
const state = (p: Partial<SyncedState>): SyncedState => ({ v: 1, events: [], profiles: [], settings: { ...DEFAULT_SETTINGS, onboarded: true }, tombstones: {}, ...p });

describe('cloud merge', () => {
  it('with no cloud copy yet, uploads the local data unchanged', () => {
    const local = state({ events: [ev('a', '2026-01-01T00:00:00Z')] });
    expect(mergeStates(local, null)).toBe(local);
  });

  it('keeps items from both devices and the newest edit of each', () => {
    const phone = state({ events: [ev('a', '2026-01-02T00:00:00Z', 'Amma (edited on phone)'), ev('b', '2026-01-01T00:00:00Z')] });
    const tablet = state({ events: [ev('a', '2026-01-01T00:00:00Z', 'Amma'), ev('c', '2026-01-03T00:00:00Z')], profiles: [prof('p1', '2026-01-01T00:00:00Z')] });
    const m = mergeStates(phone, tablet);
    expect(m.events.map((e) => e.id).sort()).toEqual(['a', 'b', 'c']);
    expect(m.events.find((e) => e.id === 'a')!.personName).toBe('Amma (edited on phone)');
    expect(m.profiles).toHaveLength(1);
  });

  it('a deletion on one device removes the item everywhere (unless edited again later)', () => {
    const phone = state({ tombstones: { a: '2026-02-01T00:00:00Z', b: '2026-02-01T00:00:00Z' } });
    const cloud = state({ events: [ev('a', '2026-01-01T00:00:00Z'), ev('b', '2026-03-01T00:00:00Z')] });
    const m = mergeStates(phone, cloud);
    expect(m.events.map((e) => e.id)).toEqual(['b']);
    expect(m.tombstones.a).toBeDefined();
  });

  it('settings follow whichever device changed them last, and never re-run onboarding', () => {
    const phone = state({ settings: { ...DEFAULT_SETTINGS, onboarded: false, lang: 'en' }, settingsUpdatedAt: '2026-01-01T00:00:00Z' });
    const cloud = state({ settings: { ...DEFAULT_SETTINGS, onboarded: true, lang: 'te' }, settingsUpdatedAt: '2026-02-01T00:00:00Z' });
    const m = mergeStates(phone, cloud);
    expect(m.settings.lang).toBe('te');
    expect(m.settings.onboarded).toBe(true);
    expect(mergeStates(cloud, phone).settings.onboarded).toBe(true);
  });

  it('merging is stable: merging the result again changes nothing', () => {
    const a = state({ events: [ev('a', '2026-01-02T00:00:00Z')], tombstones: { x: '2026-01-01T00:00:00Z' } });
    const b = state({ events: [ev('b', '2026-01-03T00:00:00Z')], profiles: [prof('p', '2026-01-01T00:00:00Z')] });
    const m = mergeStates(a, b);
    expect(sameSynced(mergeStates(m, m), m)).toBe(true);
    expect(sameSynced(mergeStates(m, b), m)).toBe(true);
  });
});

describe('older Andhra Pradesh / Telangana calendars', () => {
  it('become the single Telugu Panchangam, on this device and from the cloud', () => {
    const old = { settings: { ...DEFAULT_SETTINGS, tradition: 'te-ts' as never }, events: [{ ...ev('a', '2026-01-01T00:00:00Z'), tradition: 'te-ap' as never }] };
    const up = upgrade(old);
    expect(up.settings.tradition).toBe('te');
    expect(up.events[0].tradition).toBe('te');
    expect(upgradeTradition('ml')).toBe('ml');
  });
});
