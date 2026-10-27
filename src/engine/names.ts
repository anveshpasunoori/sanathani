// Canonical Sanskrit/Telugu names used across the engine and UI.
// Indexes: tithi 0..29 (0 = Shukla Pratipada, 14 = Purnima, 15 = Krishna Pratipada, 29 = Amavasya),
// nakshatra 0..26 (0 = Ashwini), month 0..11 (0 = Chaitra), weekday 0..6 (0 = Sunday).

import { fromTelugu, type Script } from './script';

export type Lang = 'en' | 'te' | 'kn' | 'ta' | 'ml' | 'hi' | 'mr' | 'bn' | 'gu' | 'pa' | 'raj' | 'or' | 'bho';

/** The script each language is written in (English shows Sanskrit texts in Telugu script). */
export const SCRIPT_OF: Record<Lang, Script> = {
  en: 'telugu', te: 'telugu', kn: 'kannada', ta: 'tamil', ml: 'malayalam', hi: 'devanagari', mr: 'devanagari',
  // Punjabi families read stotrams from Devanagari books; Gurmukhi can't write many Sanskrit sounds.
  bn: 'bengali', gu: 'gujarati', pa: 'devanagari', raj: 'devanagari', or: 'odia', bho: 'devanagari',
};
/** Script for Sanskrit names (yogas, samvatsaras) shown in running text: Punjabi uses Gurmukhi here. */
const NAME_SCRIPT: Record<Lang, Script> = { ...SCRIPT_OF, pa: 'gurmukhi' };

/**
 * A Sanskrit name kept in Telugu script, shown in the language's own script. Names in Tamil are
 * written plainly, as calendars print them, without the ²³⁴ marks used for chanting.
 */
export const sanskritName = (en: string, te: string, lang: Lang) => {
  if (lang === 'en') return en;
  const s = fromTelugu(te, NAME_SCRIPT[lang]);
  return lang === 'ta' ? s.replace(/[²³⁴]/g, '') : s;
};

/** For texts kept only in English and Telugu: other languages show the English. */
export const enOrTe = (lang: Lang): 'en' | 'te' => (lang === 'te' ? 'te' : 'en');

/** Native-language word lists; anything missing falls back to English. */
type Lists = Partial<Record<Exclude<Lang, 'en'>, string[]>>;
const pick = (lists: Lists, en: string[], lang: Lang) => (lang === 'en' ? en : lists[lang] ?? en);

const TITHI_BASE_EN = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami',
  'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi',
];
const TITHI_BASE: Lists = {
  te: ['పాడ్యమి', 'విదియ', 'తదియ', 'చవితి', 'పంచమి', 'షష్ఠి', 'సప్తమి', 'అష్టమి', 'నవమి', 'దశమి', 'ఏకాదశి', 'ద్వాదశి', 'త్రయోదశి', 'చతుర్దశి'],
  kn: ['ಪಾಡ್ಯ', 'ಬಿದಿಗೆ', 'ತದಿಗೆ', 'ಚೌತಿ', 'ಪಂಚಮಿ', 'ಷಷ್ಠಿ', 'ಸಪ್ತಮಿ', 'ಅಷ್ಟಮಿ', 'ನವಮಿ', 'ದಶಮಿ', 'ಏಕಾದಶಿ', 'ದ್ವಾದಶಿ', 'ತ್ರಯೋದಶಿ', 'ಚತುರ್ದಶಿ'],
  ta: ['பிரதமை', 'துவிதியை', 'திருதியை', 'சதுர்த்தி', 'பஞ்சமி', 'சஷ்டி', 'சப்தமி', 'அஷ்டமி', 'நவமி', 'தசமி', 'ஏகாதசி', 'துவாதசி', 'திரயோதசி', 'சதுர்த்தசி'],
  ml: ['പ്രഥമ', 'ദ്വിതീയ', 'തൃതീയ', 'ചതുർഥി', 'പഞ്ചമി', 'ഷഷ്ഠി', 'സപ്തമി', 'അഷ്ടമി', 'നവമി', 'ദശമി', 'ഏകാദശി', 'ദ്വാദശി', 'ത്രയോദശി', 'ചതുർദശി'],
  hi: ['प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पंचमी', 'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी', 'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी'],
  mr: ['प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पंचमी', 'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी', 'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी'],
  bn: ['প্রতিপদ', 'দ্বিতীয়া', 'তৃতীয়া', 'চতুর্থী', 'পঞ্চমী', 'ষষ্ঠী', 'সপ্তমী', 'অষ্টমী', 'নবমী', 'দশমী', 'একাদশী', 'দ্বাদশী', 'ত্রয়োদশী', 'চতুর্দশী'],
  gu: ['પડવો', 'બીજ', 'ત્રીજ', 'ચોથ', 'પાંચમ', 'છઠ', 'સાતમ', 'આઠમ', 'નોમ', 'દશમ', 'અગિયારસ', 'બારસ', 'તેરસ', 'ચૌદસ'],
  pa: ['ਏਕਮ', 'ਦੂਜ', 'ਤੀਜ', 'ਚੌਥ', 'ਪੰਚਮੀ', 'ਛਠ', 'ਸਪਤਮੀ', 'ਅਸ਼ਟਮੀ', 'ਨੌਮੀ', 'ਦਸਮੀ', 'ਏਕਾਦਸ਼ੀ', 'ਦੁਆਦਸ਼ੀ', 'ਤ੍ਰਯੋਦਸ਼ੀ', 'ਚਤੁਰਦਸ਼ੀ'],
  raj: ['पड़वा', 'बीज', 'तीज', 'चौथ', 'पांचम', 'छठ', 'सातम', 'आठम', 'नवमी', 'दसम', 'ग्यारस', 'बारस', 'तेरस', 'चौदस'],
  or: ['ପ୍ରତିପଦା', 'ଦ୍ୱିତୀୟା', 'ତୃତୀୟା', 'ଚତୁର୍ଥୀ', 'ପଞ୍ଚମୀ', 'ଷଷ୍ଠୀ', 'ସପ୍ତମୀ', 'ଅଷ୍ଟମୀ', 'ନବମୀ', 'ଦଶମୀ', 'ଏକାଦଶୀ', 'ଦ୍ୱାଦଶୀ', 'ତ୍ରୟୋଦଶୀ', 'ଚତୁର୍ଦ୍ଦଶୀ'],
  bho: ['परिवा', 'दूज', 'तीज', 'चउथ', 'पंचमी', 'छठ', 'सतमी', 'अष्टमी', 'नवमी', 'दसमी', 'एकादसी', 'दुआदसी', 'तेरस', 'चतुरदसी'],
};
// [Purnima, Amavasya]
const FULL_NEW: Lists = {
  te: ['పౌర్ణమి', 'అమావాస్య'], kn: ['ಹುಣ್ಣಿಮೆ', 'ಅಮಾವಾಸ್ಯೆ'], ta: ['பௌர்ணமி', 'அமாவாசை'],
  ml: ['പൗർണമി', 'അമാവാസി'], hi: ['पूर्णिमा', 'अमावस्या'], mr: ['पौर्णिमा', 'अमावस्या'],
  bn: ['পূর্ণিমা', 'অমাবস্যা'], gu: ['પૂનમ', 'અમાસ'], pa: ['ਪੂਰਨਮਾਸ਼ੀ', 'ਮੱਸਿਆ'], raj: ['पूनम', 'अमावस'], or: ['ପୂର୍ଣ୍ଣିମା', 'ଅମାବାସ୍ୟା'], bho: ['पूरनमासी', 'अमावस'],
};

export function tithiName(index: number, lang: Lang = 'en'): string {
  if (index === 14) return pick(FULL_NEW, ['Purnima', 'Amavasya'], lang)[0];
  if (index === 29) return pick(FULL_NEW, ['Purnima', 'Amavasya'], lang)[1];
  return pick(TITHI_BASE, TITHI_BASE_EN, lang)[index % 15];
}

export function pakshaOf(tithiIndex: number): 'shukla' | 'krishna' {
  return tithiIndex < 15 ? 'shukla' : 'krishna';
}

// [Shukla, Krishna]; Tamil and Malayalam homes say "waxing / waning".
const PAKSHA: Lists = {
  te: ['శుక్ల పక్షం', 'కృష్ణ పక్షం'], kn: ['ಶುಕ್ಲ ಪಕ್ಷ', 'ಕೃಷ್ಣ ಪಕ್ಷ'], ta: ['வளர்பிறை', 'தேய்பிறை'],
  ml: ['ശുക്ല പക്ഷം', 'കൃഷ്ണ പക്ഷം'], hi: ['शुक्ल पक्ष', 'कृष्ण पक्ष'], mr: ['शुक्ल पक्ष', 'कृष्ण पक्ष'],
  // Gujarat and Rajasthan say sud / vad (bad) before the thithi: "સુદ પાંચમ", "सुद तीज".
  bn: ['শুক্লপক্ষ', 'কৃষ্ণপক্ষ'], gu: ['સુદ', 'વદ'], pa: ['ਸ਼ੁਕਲ ਪੱਖ', 'ਕ੍ਰਿਸ਼ਨ ਪੱਖ'], raj: ['सुद', 'बद'], or: ['ଶୁକ୍ଳ ପକ୍ଷ', 'କୃଷ୍ଣ ପକ୍ଷ'], bho: ['सुदी', 'बदी'],
};
export function pakshaName(p: 'shukla' | 'krishna', lang: Lang = 'en'): string {
  return pick(PAKSHA, ['Shukla Paksha', 'Krishna Paksha'], lang)[p === 'shukla' ? 0 : 1];
}

/** "Krishna Paksha Ashtami" style full label. */
export function tithiFullName(index: number, lang: Lang = 'en'): string {
  return `${pakshaName(pakshaOf(index), lang)} ${tithiName(index, lang)}`;
}

export const NAKSHATRA_EN = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya',
  'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati',
  'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana',
  'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];
const NAKSHATRA: Lists = {
  te: ['అశ్విని', 'భరణి', 'కృత్తిక', 'రోహిణి', 'మృగశిర', 'ఆర్ద్ర', 'పునర్వసు', 'పుష్యమి', 'ఆశ్లేష', 'మఖ', 'పుబ్బ', 'ఉత్తర', 'హస్త', 'చిత్త', 'స్వాతి',
    'విశాఖ', 'అనూరాధ', 'జ్యేష్ఠ', 'మూల', 'పూర్వాషాఢ', 'ఉత్తరాషాఢ', 'శ్రవణం', 'ధనిష్ఠ', 'శతభిషం', 'పూర్వాభాద్ర', 'ఉత్తరాభాద్ర', 'రేవతి'],
  kn: ['ಅಶ್ವಿನಿ', 'ಭರಣಿ', 'ಕೃತ್ತಿಕಾ', 'ರೋಹಿಣಿ', 'ಮೃಗಶಿರ', 'ಆರ್ದ್ರಾ', 'ಪುನರ್ವಸು', 'ಪುಷ್ಯ', 'ಆಶ್ಲೇಷ', 'ಮಘ', 'ಪೂರ್ವ ಫಲ್ಗುಣಿ', 'ಉತ್ತರ ಫಲ್ಗುಣಿ', 'ಹಸ್ತ', 'ಚಿತ್ರಾ', 'ಸ್ವಾತಿ',
    'ವಿಶಾಖ', 'ಅನುರಾಧ', 'ಜ್ಯೇಷ್ಠ', 'ಮೂಲ', 'ಪೂರ್ವಾಷಾಢ', 'ಉತ್ತರಾಷಾಢ', 'ಶ್ರವಣ', 'ಧನಿಷ್ಠ', 'ಶತಭಿಷ', 'ಪೂರ್ವಾಭಾದ್ರ', 'ಉತ್ತರಾಭಾದ್ರ', 'ರೇವತಿ'],
  ta: ['அசுவினி', 'பரணி', 'கார்த்திகை', 'ரோகிணி', 'மிருகசீரிடம்', 'திருவாதிரை', 'புனர்பூசம்', 'பூசம்', 'ஆயில்யம்', 'மகம்', 'பூரம்', 'உத்திரம்', 'அஸ்தம்', 'சித்திரை', 'சுவாதி',
    'விசாகம்', 'அனுஷம்', 'கேட்டை', 'மூலம்', 'பூராடம்', 'உத்திராடம்', 'திருவோணம்', 'அவிட்டம்', 'சதயம்', 'பூரட்டாதி', 'உத்திரட்டாதி', 'ரேவதி'],
  ml: ['അശ്വതി', 'ഭരണി', 'കാർത്തിക', 'രോഹിണി', 'മകയിരം', 'തിരുവാതിര', 'പുണർതം', 'പൂയം', 'ആയില്യം', 'മകം', 'പൂരം', 'ഉത്രം', 'അത്തം', 'ചിത്തിര', 'ചോതി',
    'വിശാഖം', 'അനിഴം', 'തൃക്കേട്ട', 'മൂലം', 'പൂരാടം', 'ഉത്രാടം', 'തിരുവോണം', 'അവിട്ടം', 'ചതയം', 'പൂരുരുട്ടാതി', 'ഉത്രട്ടാതി', 'രേവതി'],
  hi: ['अश्विनी', 'भरणी', 'कृत्तिका', 'रोहिणी', 'मृगशिरा', 'आर्द्रा', 'पुनर्वसु', 'पुष्य', 'आश्लेषा', 'मघा', 'पूर्वा फाल्गुनी', 'उत्तरा फाल्गुनी', 'हस्त', 'चित्रा', 'स्वाति',
    'विशाखा', 'अनुराधा', 'ज्येष्ठा', 'मूल', 'पूर्वाषाढ़ा', 'उत्तराषाढ़ा', 'श्रवण', 'धनिष्ठा', 'शतभिषा', 'पूर्वा भाद्रपद', 'उत्तरा भाद्रपद', 'रेवती'],
  mr: ['अश्विनी', 'भरणी', 'कृत्तिका', 'रोहिणी', 'मृग', 'आर्द्रा', 'पुनर्वसू', 'पुष्य', 'आश्लेषा', 'मघा', 'पूर्वा', 'उत्तरा', 'हस्त', 'चित्रा', 'स्वाती',
    'विशाखा', 'अनुराधा', 'ज्येष्ठा', 'मूळ', 'पूर्वाषाढा', 'उत्तराषाढा', 'श्रवण', 'धनिष्ठा', 'शततारका', 'पूर्वाभाद्रपदा', 'उत्तराभाद्रपदा', 'रेवती'],
  bn: ['অশ্বিনী', 'ভরণী', 'কৃত্তিকা', 'রোহিণী', 'মৃগশিরা', 'আর্দ্রা', 'পুনর্বসু', 'পুষ্যা', 'অশ্লেষা', 'মঘা', 'পূর্বফাল্গুনী', 'উত্তরফাল্গুনী', 'হস্তা', 'চিত্রা', 'স্বাতী',
    'বিশাখা', 'অনুরাধা', 'জ্যেষ্ঠা', 'মূলা', 'পূর্বাষাঢ়া', 'উত্তরাষাঢ়া', 'শ্রবণা', 'ধনিষ্ঠা', 'শতভিষা', 'পূর্বভাদ্রপদ', 'উত্তরভাদ্রপদ', 'রেবতী'],
  gu: ['અશ્વિની', 'ભરણી', 'કૃત્તિકા', 'રોહિણી', 'મૃગશીર્ષ', 'આર્દ્રા', 'પુનર્વસુ', 'પુષ્ય', 'આશ્લેષા', 'મઘા', 'પૂર્વા ફાલ્ગુની', 'ઉત્તરા ફાલ્ગુની', 'હસ્ત', 'ચિત્રા', 'સ્વાતિ',
    'વિશાખા', 'અનુરાધા', 'જ્યેષ્ઠા', 'મૂળ', 'પૂર્વાષાઢા', 'ઉત્તરાષાઢા', 'શ્રવણ', 'ધનિષ્ઠા', 'શતભિષા', 'પૂર્વા ભાદ્રપદ', 'ઉત્તરા ભાદ્રપદ', 'રેવતી'],
  pa: ['ਅਸ਼ਵਿਨੀ', 'ਭਰਣੀ', 'ਕ੍ਰਿਤਿਕਾ', 'ਰੋਹਿਣੀ', 'ਮ੍ਰਿਗਸ਼ਿਰਾ', 'ਆਰਦਰਾ', 'ਪੁਨਰਵਸੁ', 'ਪੁਸ਼ਯ', 'ਆਸ਼ਲੇਸ਼ਾ', 'ਮਘਾ', 'ਪੂਰਵਾ ਫਾਲਗੁਨੀ', 'ਉੱਤਰਾ ਫਾਲਗੁਨੀ', 'ਹਸਤ', 'ਚਿੱਤਰਾ', 'ਸਵਾਤੀ',
    'ਵਿਸ਼ਾਖਾ', 'ਅਨੁਰਾਧਾ', 'ਜੇਸ਼ਠਾ', 'ਮੂਲ', 'ਪੂਰਵਾ ਆਸ਼ਾੜ੍ਹਾ', 'ਉੱਤਰਾ ਆਸ਼ਾੜ੍ਹਾ', 'ਸ਼੍ਰਵਣ', 'ਧਨਿਸ਼ਠਾ', 'ਸ਼ਤਭਿਸ਼ਾ', 'ਪੂਰਵਾ ਭਾਦਰਪਦ', 'ਉੱਤਰਾ ਭਾਦਰਪਦ', 'ਰੇਵਤੀ'],
  or: ['ଅଶ୍ୱିନୀ', 'ଭରଣୀ', 'କୃତ୍ତିକା', 'ରୋହିଣୀ', 'ମୃଗଶିରା', 'ଆର୍ଦ୍ରା', 'ପୁନର୍ବସୁ', 'ପୁଷ୍ୟା', 'ଅଶ୍ଳେଷା', 'ମଘା', 'ପୂର୍ବଫାଲ୍ଗୁନୀ', 'ଉତ୍ତରଫାଲ୍ଗୁନୀ', 'ହସ୍ତା', 'ଚିତ୍ରା', 'ସ୍ୱାତୀ',
    'ବିଶାଖା', 'ଅନୁରାଧା', 'ଜ୍ୟେଷ୍ଠା', 'ମୂଳା', 'ପୂର୍ବାଷାଢ଼ା', 'ଉତ୍ତରାଷାଢ଼ା', 'ଶ୍ରବଣା', 'ଧନିଷ୍ଠା', 'ଶତଭିଷା', 'ପୂର୍ବଭାଦ୍ରପଦ', 'ଉତ୍ତରଭାଦ୍ରପଦ', 'ରେବତୀ'],
};
NAKSHATRA.raj = NAKSHATRA.hi;
NAKSHATRA.bho = NAKSHATRA.hi;
export function nakshatraName(i: number, lang: Lang = 'en'): string {
  return pick(NAKSHATRA, NAKSHATRA_EN, lang)[i];
}

export const YOGA_EN = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda', 'Sukarma', 'Dhriti',
  'Shula', 'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata',
  'Variyan', 'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra', 'Vaidhriti',
];
const YOGA_TE = [
  'విష్కంభ', 'ప్రీతి', 'ఆయుష్మాన్', 'సౌభాగ్య', 'శోభన', 'అతిగండ', 'సుకర్మ', 'ధృతి',
  'శూల', 'గండ', 'వృద్ధి', 'ధ్రువ', 'వ్యాఘాత', 'హర్షణ', 'వజ్ర', 'సిద్ధి', 'వ్యతీపాత',
  'వరీయాన్', 'పరిఘ', 'శివ', 'సిద్ధ', 'సాధ్య', 'శుభ', 'శుక్ల', 'బ్రహ్మ', 'ఐంద్ర', 'వైధృతి',
];
export function yogaName(i: number, lang: Lang = 'en'): string {
  return sanskritName(YOGA_EN[i], YOGA_TE[i], lang);
}

const KARANA_MOVABLE = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti (Bhadra)'];
/** Karana index 0..59 = half-tithi count from Shukla Pratipada. */
const KARANA_MOVABLE_TE = ['బవ', 'బాలవ', 'కౌలవ', 'తైతిల', 'గర', 'వణిజ', 'విష్టి (భద్ర)'];
const KARANA_FIXED: Record<number, [string, string]> = {
  0: ['Kimstughna', 'కింస్తుఘ్న'], 57: ['Shakuni', 'శకుని'], 58: ['Chatushpada', 'చతుష్పాత్'], 59: ['Naga', 'నాగ'],
};
export function karanaName(k: number, lang: Lang = 'en'): string {
  const [en, te] = KARANA_FIXED[k] ?? [KARANA_MOVABLE[(k - 1) % 7], KARANA_MOVABLE_TE[(k - 1) % 7]];
  return sanskritName(en, te, lang);
}
export function isVishti(k: number): boolean {
  return k >= 1 && k <= 56 && (k - 1) % 7 === 6;
}

const MONTH_EN = [
  'Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha', 'Shravana', 'Bhadrapada',
  'Ashvayuja', 'Kartika', 'Margashira', 'Pushya', 'Magha', 'Phalguna',
];
// Lunar (chandramana) month names. Tamil Nadu and Kerala mostly use solar months, which are
// not in the app yet; these are the lunar names as their panchangams print them.
const MONTH: Lists = {
  te: ['చైత్రం', 'వైశాఖం', 'జ్యేష్ఠం', 'ఆషాఢం', 'శ్రావణం', 'భాద్రపదం', 'ఆశ్వయుజం', 'కార్తీకం', 'మార్గశిరం', 'పుష్యం', 'మాఘం', 'ఫాల్గుణం'],
  kn: ['ಚೈತ್ರ', 'ವೈಶಾಖ', 'ಜ್ಯೇಷ್ಠ', 'ಆಷಾಢ', 'ಶ್ರಾವಣ', 'ಭಾದ್ರಪದ', 'ಆಶ್ವಯುಜ', 'ಕಾರ್ತಿಕ', 'ಮಾರ್ಗಶಿರ', 'ಪುಷ್ಯ', 'ಮಾಘ', 'ಫಾಲ್ಗುಣ'],
  ta: ['சைத்ர', 'வைசாக', 'ஜ்யேஷ்ட', 'ஆஷாட', 'ஸ்ராவண', 'பாத்ரபத', 'ஆஸ்வயுஜ', 'கார்த்திக', 'மார்கசீர்ஷ', 'பௌஷ', 'மாக', 'பால்குன'],
  ml: ['ചൈത്രം', 'വൈശാഖം', 'ജ്യേഷ്ഠം', 'ആഷാഢം', 'ശ്രാവണം', 'ഭാദ്രപദം', 'ആശ്വിനം', 'കാർത്തികം', 'മാർഗശീർഷം', 'പൗഷം', 'മാഘം', 'ഫാൽഗുനം'],
  hi: ['चैत्र', 'वैशाख', 'ज्येष्ठ', 'आषाढ़', 'श्रावण', 'भाद्रपद', 'आश्विन', 'कार्तिक', 'मार्गशीर्ष', 'पौष', 'माघ', 'फाल्गुन'],
  mr: ['चैत्र', 'वैशाख', 'ज्येष्ठ', 'आषाढ', 'श्रावण', 'भाद्रपद', 'आश्विन', 'कार्तिक', 'मार्गशीर्ष', 'पौष', 'माघ', 'फाल्गुन'],
  bn: ['চৈত্র', 'বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন', 'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন'],
  gu: ['ચૈત્ર', 'વૈશાખ', 'જેઠ', 'અષાઢ', 'શ્રાવણ', 'ભાદરવો', 'આસો', 'કારતક', 'માગશર', 'પોષ', 'મહા', 'ફાગણ'],
  pa: ['ਚੇਤ', 'ਵਿਸਾਖ', 'ਜੇਠ', 'ਹਾੜ੍ਹ', 'ਸਾਵਣ', 'ਭਾਦੋਂ', 'ਅੱਸੂ', 'ਕੱਤਕ', 'ਮੱਘਰ', 'ਪੋਹ', 'ਮਾਘ', 'ਫੱਗਣ'],
  raj: ['चैत', 'बैसाख', 'जेठ', 'आसाढ़', 'सावण', 'भादवो', 'आसोज', 'काती', 'मिंगसर', 'पोह', 'माह', 'फागण'],
  or: ['ଚୈତ୍ର', 'ବୈଶାଖ', 'ଜ୍ୟେଷ୍ଠ', 'ଆଷାଢ଼', 'ଶ୍ରାବଣ', 'ଭାଦ୍ରବ', 'ଆଶ୍ୱିନ', 'କାର୍ତ୍ତିକ', 'ମାର୍ଗଶିର', 'ପୌଷ', 'ମାଘ', 'ଫାଲ୍ଗୁନ'],
  bho: ['चइत', 'बइसाख', 'जेठ', 'असाढ़', 'सावन', 'भादो', 'कुआर', 'कातिक', 'अगहन', 'पूस', 'माघ', 'फागुन'],
};
const ADHIKA: Partial<Record<Lang, string>> = { te: 'అధిక', kn: 'ಅಧಿಕ', ta: 'அதிக', ml: 'അധിക', hi: 'अधिक', mr: 'अधिक', bn: 'অধিক', gu: 'અધિક', pa: 'ਅਧਿਕ', raj: 'अधिक', or: 'ଅଧିକ', bho: 'अधिक' };
export function monthName(i: number, lang: Lang = 'en', adhika = false): string {
  const n = pick(MONTH, MONTH_EN, lang)[((i % 12) + 12) % 12];
  if (!adhika) return n;
  return `${ADHIKA[lang] ?? 'Adhika'} ${n}`;
}

const WEEKDAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY: Lists = {
  te: ['ఆదివారం', 'సోమవారం', 'మంగళవారం', 'బుధవారం', 'గురువారం', 'శుక్రవారం', 'శనివారం'],
  kn: ['ಭಾನುವಾರ', 'ಸೋಮವಾರ', 'ಮಂಗಳವಾರ', 'ಬುಧವಾರ', 'ಗುರುವಾರ', 'ಶುಕ್ರವಾರ', 'ಶನಿವಾರ'],
  ta: ['ஞாயிறு', 'திங்கள்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'வெள்ளி', 'சனி'],
  ml: ['ഞായർ', 'തിങ്കൾ', 'ചൊവ്വ', 'ബുധൻ', 'വ്യാഴം', 'വെള്ളി', 'ശനി'],
  hi: ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'],
  mr: ['रविवार', 'सोमवार', 'मंगळवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'],
  bn: ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'],
  gu: ['રવિવાર', 'સોમવાર', 'મંગળવાર', 'બુધવાર', 'ગુરુવાર', 'શુક્રવાર', 'શનિવાર'],
  pa: ['ਐਤਵਾਰ', 'ਸੋਮਵਾਰ', 'ਮੰਗਲਵਾਰ', 'ਬੁੱਧਵਾਰ', 'ਵੀਰਵਾਰ', 'ਸ਼ੁੱਕਰਵਾਰ', 'ਸ਼ਨਿੱਚਰਵਾਰ'],
  raj: ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'],
  or: ['ରବିବାର', 'ସୋମବାର', 'ମଙ୍ଗଳବାର', 'ବୁଧବାର', 'ଗୁରୁବାର', 'ଶୁକ୍ରବାର', 'ଶନିବାର'],
  bho: ['एतवार', 'सोमार', 'मंगर', 'बुध', 'बियफे', 'सुक', 'सनिचर'],
};
export function weekdayName(i: number, lang: Lang = 'en'): string {
  return pick(WEEKDAY, WEEKDAY_EN, lang)[i];
}

export const SAMVATSARA = [
  'Prabhava', 'Vibhava', 'Shukla', 'Pramoduta', 'Prajotpatti', 'Angirasa', 'Shrimukha', 'Bhava',
  'Yuva', 'Dhatu', 'Ishvara', 'Bahudhanya', 'Pramadhi', 'Vikrama', 'Vrisha', 'Chitrabhanu',
  'Svabhanu', 'Tarana', 'Parthiva', 'Vyaya', 'Sarvajit', 'Sarvadhari', 'Virodhi', 'Vikriti',
  'Khara', 'Nandana', 'Vijaya', 'Jaya', 'Manmatha', 'Durmukhi', 'Hevilambi', 'Vilambi', 'Vikari',
  'Sharvari', 'Plava', 'Shubhakrit', 'Shobhakrit', 'Krodhi', 'Vishvavasu', 'Parabhava', 'Plavanga',
  'Kilaka', 'Saumya', 'Sadharana', 'Virodhikrit', 'Paridhavi', 'Pramadicha', 'Ananda', 'Rakshasa',
  'Nala', 'Pingala', 'Kalayukti', 'Siddharthi', 'Raudri', 'Durmati', 'Dundubhi', 'Rudhirodgari',
  'Raktakshi', 'Krodhana', 'Akshaya',
];
const SAMVATSARA_TE = [
  'ప్రభవ', 'విభవ', 'శుక్ల', 'ప్రమోదూత', 'ప్రజోత్పత్తి', 'ఆంగీరస', 'శ్రీముఖ', 'భావ',
  'యువ', 'ధాత', 'ఈశ్వర', 'బహుధాన్య', 'ప్రమాది', 'విక్రమ', 'వృష', 'చిత్రభాను',
  'స్వభాను', 'తారణ', 'పార్థివ', 'వ్యయ', 'సర్వజిత్', 'సర్వధారి', 'విరోధి', 'వికృతి',
  'ఖర', 'నందన', 'విజయ', 'జయ', 'మన్మథ', 'దుర్ముఖి', 'హేవిళంబి', 'విళంబి', 'వికారి',
  'శార్వరి', 'ప్లవ', 'శుభకృత్', 'శోభకృత్', 'క్రోధి', 'విశ్వావసు', 'పరాభవ', 'ప్లవంగ',
  'కీలక', 'సౌమ్య', 'సాధారణ', 'విరోధికృత్', 'పరీధావి', 'ప్రమాదీచ', 'ఆనంద', 'రాక్షస',
  'నల', 'పింగళ', 'కాళయుక్తి', 'సిద్ధార్థి', 'రౌద్రి', 'దుర్మతి', 'దుందుభి', 'రుధిరోద్గారి',
  'రక్తాక్షి', 'క్రోధన', 'అక్షయ',
];
export const samvatsaraName = (i: number, lang: Lang = 'en') => sanskritName(SAMVATSARA[i], SAMVATSARA_TE[i], lang);

export const RASHI_EN = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
  'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena',
];
const RASHI: Lists = {
  te: ['మేషం', 'వృషభం', 'మిథునం', 'కర్కాటకం', 'సింహం', 'కన్య', 'తుల', 'వృశ్చికం', 'ధనుస్సు', 'మకరం', 'కుంభం', 'మీనం'],
  kn: ['ಮೇಷ', 'ವೃಷಭ', 'ಮಿಥುನ', 'ಕರ್ಕಾಟಕ', 'ಸಿಂಹ', 'ಕನ್ಯಾ', 'ತುಲಾ', 'ವೃಶ್ಚಿಕ', 'ಧನು', 'ಮಕರ', 'ಕುಂಭ', 'ಮೀನ'],
  ta: ['மேஷம்', 'ரிஷபம்', 'மிதுனம்', 'கடகம்', 'சிம்மம்', 'கன்னி', 'துலாம்', 'விருச்சிகம்', 'தனுசு', 'மகரம்', 'கும்பம்', 'மீனம்'],
  ml: ['മേടം', 'ഇടവം', 'മിഥുനം', 'കർക്കടകം', 'ചിങ്ങം', 'കന്നി', 'തുലാം', 'വൃശ്ചികം', 'ധനു', 'മകരം', 'കുംഭം', 'മീനം'],
  hi: ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुंभ', 'मीन'],
  mr: ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तूळ', 'वृश्चिक', 'धनु', 'मकर', 'कुंभ', 'मीन'],
  bn: ['মেষ', 'বৃষ', 'মিথুন', 'কর্কট', 'সিংহ', 'কন্যা', 'তুলা', 'বৃশ্চিক', 'ধনু', 'মকর', 'কুম্ভ', 'মীন'],
  gu: ['મેષ', 'વૃષભ', 'મિથુન', 'કર્ક', 'સિંહ', 'કન્યા', 'તુલા', 'વૃશ્ચિક', 'ધન', 'મકર', 'કુંભ', 'મીન'],
  pa: ['ਮੇਖ', 'ਬ੍ਰਿਖ', 'ਮਿਥੁਨ', 'ਕਰਕ', 'ਸਿੰਘ', 'ਕੰਨਿਆ', 'ਤੁਲਾ', 'ਬ੍ਰਿਸ਼ਚਕ', 'ਧਨੁ', 'ਮਕਰ', 'ਕੁੰਭ', 'ਮੀਨ'],
  raj: ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुंभ', 'मीन'],
  or: ['ମେଷ', 'ବୃଷ', 'ମିଥୁନ', 'କର୍କଟ', 'ସିଂହ', 'କନ୍ୟା', 'ତୁଳା', 'ବୃଶ୍ଚିକ', 'ଧନୁ', 'ମକର', 'କୁମ୍ଭ', 'ମୀନ'],
  bho: ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुंभ', 'मीन'],
};
export function rashiName(i: number, lang: Lang = 'en'): string {
  return pick(RASHI, RASHI_EN, lang)[((i % 12) + 12) % 12];
}
