// Commonly observed practices associated with each thithi. Practices vary by family and region;
// the UI presents these as "traditionally observed", never as obligations. The texts, in every
// language, are in src/locales/rituals.ts.
import { RITUAL_TEXT, type RitualKey } from '../locales/rituals';
import type { Lang } from './names';

const BY_TITHI: Record<number, RitualKey> = {
  0: 'newFortnight', 3: 'chaturthi', 5: 'shashthi', 7: 'ashtami', 10: 'ekadashi', 11: 'dwadashi', 12: 'pradosham',
  14: 'purnima', 18: 'sankashti', 22: 'kalabhairava', 25: 'ekadashi', 26: 'dwadashi', 27: 'pradosham',
  28: 'shivaratri', 29: 'amavasya',
};

export function ritualsFor(tithiIndex: number, lang: Lang = 'en'): string[] {
  const key = BY_TITHI[tithiIndex];
  return key ? [RITUAL_TEXT[lang][key]] : [];
}

export const SHRADDHA_NOTE =
  'Annual Shraddha (Abdikam / Taddinam) is traditionally performed on the lunar thithi of passing, in the same lunar month, ' +
  'choosing the day on which that thithi prevails during Aparahna (afternoon). Families and gotra traditions differ, ' +
  'especially in Adhika Masa years — confirm with your family purohit.';
