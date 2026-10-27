// Details for the shareable Jathaka card: the classical birth-star attributes (as printed in a
// Telugu jathakam's Avakahada chakram) plus the traditional "lucky" associations of the Moon-sign
// lord. Lucky day/number/colour are folk associations, labelled as such on the card.
import { grahaName } from './horoscope';
import { nakshatraLord, SIGN_LORD, type BirthChart, type Graha } from './jyotish';
import { GANA, NAK_YONI, nadiOf } from './matching';
import { nakshatraName, rashiName, weekdayName, type Lang } from './names';
import { matchText } from '../locales/match';
import { readingText } from '../locales/reading';

/** Nama aksharalu: the naming syllable for each pada of each nakshatra (Avakahada chakram). */
const SYLLABLE_EN = [
  'Chu Che Cho La', 'Li Lu Le Lo', 'A I U E', 'O Va Vi Vu', 'Ve Vo Ka Ki', 'Ku Gha Na Chha', 'Ke Ko Ha Hi', 'Hu He Ho Da', 'Di Du De Do',
  'Ma Mi Mu Me', 'Mo Ta Ti Tu', 'Te To Pa Pi', 'Pu Sha Na Tha', 'Pe Po Ra Ri', 'Ru Re Ro Ta', 'Ti Tu Te To', 'Na Ni Nu Ne', 'No Ya Yi Yu',
  'Ye Yo Bha Bhi', 'Bhu Dha Pha Dha', 'Bhe Bho Ja Ji', 'Khi Khu Khe Kho', 'Ga Gi Gu Ge', 'Go Sa Si Su', 'Se So Da Di', 'Du Tha Jha Na', 'De Do Cha Chi',
].map((s) => s.split(' '));
const SYLLABLE_TE = [
  'చు చె చొ ల', 'లి లు లె లొ', 'అ ఇ ఉ ఎ', 'ఒ వ వి వు', 'వె వొ క కి', 'కు ఘ ఙ ఛ', 'కె కొ హ హి', 'హు హె హొ డ', 'డి డు డె డొ',
  'మ మి ము మె', 'మొ ట టి టు', 'టె టొ ప పి', 'పు ష ణ ఠ', 'పె పొ ర రి', 'రు రె రొ త', 'తి తు తె తొ', 'న ని ను నె', 'నొ య యి యు',
  'యె యొ భ భి', 'భు ధ ఫ ఢ', 'భె భొ జ జి', 'ఖి ఖు ఖె ఖొ', 'గ గి గు గె', 'గొ స సి సు', 'సె సొ ద ది', 'దు థ ఝ ఞ', 'దె దొ చ చి',
].map((s) => s.split(' '));

/** Presiding deity of each nakshatra. */
const NAK_DEITY = [
  'Ashwini Kumaras', 'Yama', 'Agni', 'Brahma', 'Soma (Chandra)', 'Rudra', 'Aditi', 'Brihaspati', 'Nagas', 'Pitrus', 'Bhaga', 'Aryaman',
  'Savitr (Surya)', 'Vishwakarma', 'Vayu', 'Indra-Agni', 'Mitra', 'Indra', 'Nirriti', 'Apas (Waters)', 'Vishwadevas', 'Vishnu', 'Ashta Vasus',
  'Varuna', 'Aja Ekapada', 'Ahirbudhnya', 'Pushan',
];

/** Planet → number (Vedic numerology), weekday, and colour. */
const PLANET_NUMBER: Record<Graha, number> = { sun: 1, moon: 2, jupiter: 3, rahu: 4, mercury: 5, venus: 6, ketu: 7, saturn: 8, mars: 9 };
const PLANET_DAY: Partial<Record<Graha, number>> = { sun: 0, moon: 1, mars: 2, mercury: 3, jupiter: 4, venus: 5, saturn: 6 };
const PLANET_COLOUR: Partial<Record<Graha, { en: string; te: string; hex: string }>> = {
  sun: { en: 'Saffron', te: 'కాషాయం', hex: '#f08a24' }, moon: { en: 'White / silver', te: 'తెలుపు', hex: '#f4f1ea' },
  mars: { en: 'Red', te: 'ఎరుపు', hex: '#c62828' }, mercury: { en: 'Green', te: 'ఆకుపచ్చ', hex: '#2e7d32' },
  jupiter: { en: 'Yellow', te: 'పసుపు', hex: '#f2c230' }, venus: { en: 'Pastel / white', te: 'లేత రంగులు', hex: '#f6c7d6' },
  saturn: { en: 'Dark blue', te: 'ముదురు నీలం', hex: '#22346b' },
};

export interface CardDetails {
  rashi: { en: string; te: string };
  nakshatra: { en: string; te: string; pada: number };
  lagna?: { en: string; te: string };
  rashiLord: string;
  nakshatraLord: string;
  deity: string;
  syllables: { en: string[]; te: string[]; mine: number };
  gana: string;
  nadi: string;
  yoni: string;
  lucky: { day: { en: string; te: string }; numbers: number[]; colour: { en: string; te: string; hex: string } };
}

export function cardDetails(chart: BirthChart): CardDetails {
  const m = chart.moon;
  const lord = SIGN_LORD[m.rashi];
  const nLord = nakshatraLord(m.nakshatra);
  return {
    rashi: { en: rashiName(m.rashi, 'en'), te: rashiName(m.rashi, 'te') },
    nakshatra: { en: nakshatraName(m.nakshatra, 'en'), te: nakshatraName(m.nakshatra, 'te'), pada: m.pada },
    lagna: chart.lagna && { en: rashiName(chart.lagna.rashi, 'en'), te: rashiName(chart.lagna.rashi, 'te') },
    rashiLord: grahaName(lord, 'en'),
    nakshatraLord: grahaName(nLord, 'en'),
    deity: NAK_DEITY[m.nakshatra],
    syllables: { en: SYLLABLE_EN[m.nakshatra], te: SYLLABLE_TE[m.nakshatra], mine: m.pada - 1 },
    // The card is drawn in English (with Telugu), whatever the app language.
    gana: matchText('en').gana[GANA[m.nakshatra]],
    nadi: matchText('en').nadi[nadiOf(m.nakshatra)].replace(/ \(.*\)/, ''),
    yoni: matchText('en').yoni[NAK_YONI[m.nakshatra]],
    lucky: {
      day: { en: weekdayName(PLANET_DAY[lord]!, 'en'), te: weekdayName(PLANET_DAY[lord]!, 'te') },
      numbers: [...new Set([PLANET_NUMBER[lord], PLANET_NUMBER[nLord]])],
      colour: PLANET_COLOUR[lord]!,
    },
  };
}

export const cardNote = (lang: Lang) => readingText(lang).cardNote;
