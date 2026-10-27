// Clearly labeled demonstration events. Their dates are computed by the engine like any other
// event, but the people and original dates are fictional.
import { resolveLunarDate } from '../engine/recurrence';
import { findPlace } from './places';
import type { FamilyEvent, Settings } from './types';
import { uid } from './store';

export function sampleEvents(s: Settings): FamilyEvent[] {
  const now = new Date().toISOString();
  const hyd = findPlace('Hyderabad')!;
  const vij = findPlace('Vijayawada')!;
  const shraddhaLunar = resolveLunarDate('2012-11-21', '15:40', vij).lunar;
  const birthLunar = resolveLunarDate('1958-07-14', '05:30', hyd).lunar;
  const base = { tradition: s.tradition, privacy: 'private' as const, isSample: true, createdAt: now, updatedAt: now, adhikaPolicy: 'nija' as const };
  return [
    {
      ...base, id: uid(), personName: 'Sample: Grandfather Venkata Rao', relationship: 'Grandfather', category: 'death',
      title: 'Annual Shraddha', originalDate: '2012-11-21', originalTime: '15:40', originalPlace: vij,
      recurrence: 'thithi', lunar: shraddhaLunar, lunarSource: 'computed', rule: 'aparahna',
      reminders: [{ id: uid(), daysBefore: 7, time: '20:00', channels: ['push'] }, { id: uid(), daysBefore: 0, time: '07:00', channels: ['push'] }],
      rituals: 'Tarpanam in the morning; invite the family purohit; prepare naivedyam.',
      notes: 'This is a SAMPLE event to show how Thithi-based Shraddha dates are calculated. Delete it any time.',
    },
    {
      ...base, id: uid(), personName: 'Sample: Amma', relationship: 'Mother', category: 'birthday',
      title: 'Janma Thithi', originalDate: '1958-07-14', originalTime: '05:30', originalPlace: hyd,
      recurrence: 'thithi', lunar: birthLunar, lunarSource: 'computed', rule: 'sunrise',
      reminders: [{ id: uid(), daysBefore: 3, time: s.reminderTime, channels: ['push'] }],
      notes: 'SAMPLE birthday that follows the Telugu lunar date.',
    },
    {
      ...base, id: uid(), personName: 'Sample: Ravi & Lakshmi', relationship: 'Self', category: 'marriage',
      title: 'Wedding anniversary', originalDate: '2015-02-20', recurrence: 'gregorian', rule: 'sunrise', privacy: 'family',
      reminders: [{ id: uid(), daysBefore: 1, time: s.reminderTime, channels: ['push'] }],
      notes: 'SAMPLE anniversary that follows the Gregorian date.',
    },
  ];
}
