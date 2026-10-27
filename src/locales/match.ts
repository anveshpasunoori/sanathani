// Wording of Kundali matching (src/engine/matching.ts), one table per language.
// Templates use {b} the bride's and {g} the groom's value, {a}/{n} numbers or names.
// kn/ta/ml/hi/mr are a first pass, to be checked by native speakers; other languages fall back to English.
import type { Lang } from '../engine/names';
import { hi, mr } from './match.north';
import { kn, ml, ta } from './match.south';

export type KootaKey = 'varna' | 'vashya' | 'tara' | 'yoni' | 'maitri' | 'gana' | 'bhakoot' | 'nadi';
export type VashyaGroup = 'Chatushpada' | 'Manava' | 'Jalachara' | 'Vanachara' | 'Keeta';

export interface MatchText {
  /** What each koota traditionally looks at. */
  about: Record<KootaKey, string>;
  brideGroom: string;
  /** Shudra, Vaishya, Kshatriya, Brahmana (varna values 1–4). */
  varna: [string, string, string, string];
  vashya: Record<VashyaGroup, string>;
  /** Yoni animals, Horse … Lion. */
  yoni: string[];
  /** Deva, Manushya, Rakshasa. */
  gana: [string, string, string];
  /** Adi (Vata), Madhya (Pitta), Antya (Kapha). */
  nadi: [string, string, string];
  /** Both directions, one direction, neither. */
  taraDetail: [string, string, string];
  lords: string;
  bhakootDetail: string;
  cancel: { gana: string; bhakoot: string; nadiSign: string; nadiStar: string; nadiPada: string };
  /** Both have it, neither has it, only one has it. */
  kujaNote: [string, string, string];
  kujaOwn: string;
  kujaExalted: string;
  /** {n} is the house as an ordinal in the reader's language. */
  kujaFromLagna: string;
  kujaFromMoon: string;
  assumptions: string[];
}

const en: MatchText = {
  about: {
    varna: 'Temperament and spiritual outlook',
    vashya: 'Mutual attraction and influence',
    tara: 'Well-being and fortune through the birth stars',
    yoni: 'Physical and intimate compatibility',
    maitri: 'Friendship and mental wavelength (Moon-sign lords)',
    gana: 'Nature and behaviour',
    bhakoot: 'Family welfare, prosperity and harmony',
    nadi: 'Health and progeny (constitution)',
  },
  brideGroom: 'Bride {b}, groom {g}',
  varna: ['Shudra', 'Vaishya', 'Kshatriya', 'Brahmana'],
  vashya: { Chatushpada: 'Chatushpada', Manava: 'Manava', Jalachara: 'Jalachara', Vanachara: 'Vanachara', Keeta: 'Keeta' },
  yoni: ['Horse', 'Elephant', 'Sheep', 'Serpent', 'Dog', 'Cat', 'Rat', 'Cow', 'Buffalo', 'Tiger', 'Deer', 'Monkey', 'Mongoose', 'Lion'],
  gana: ['Deva', 'Manushya', 'Rakshasa'],
  nadi: ['Adi (Vata)', 'Madhya (Pitta)', 'Antya (Kapha)'],
  taraDetail: ['Both stars support each other', 'Supportive in one direction', 'Calls for care in both directions'],
  lords: 'Lords: {b} and {g}',
  bhakootDetail: 'Moon signs are {b}/{g} from each other',
  cancel: {
    gana: 'Moon-sign lords are friendly, which traditionally offsets Gana dosha.',
    bhakoot: 'Moon-sign lords are the same or friends — Bhakoot dosha is traditionally cancelled.',
    nadiSign: 'Same Moon sign with different stars — Nadi dosha is traditionally cancelled.',
    nadiStar: 'Same star in different Moon signs — Nadi dosha is traditionally cancelled.',
    nadiPada: 'Same star but different padas — many traditions cancel Nadi dosha.',
  },
  kujaNote: [
    'Both have Kuja dosha, so it is traditionally considered balanced (samya).',
    'Neither chart has Kuja dosha.',
    'Kuja dosha is present in one chart only. Families traditionally review the full charts with an astrologer and may perform a simple remedy.',
  ],
  kujaOwn: 'Mars is in its own sign',
  kujaExalted: 'Mars is exalted (Makara)',
  kujaFromLagna: 'Mars in the {n} house from Lagna',
  kujaFromMoon: 'Mars in the {n} house from the Moon (birth time unknown)',
  assumptions: [
    'Ashtakoota (North/Telugu style) Guna Milan out of 36, from each person\'s Moon sign and birth star (Lahiri).',
    'Bhakoot, Nadi and Gana doshas are shown with the commonly accepted parihara (cancellation) rules; "adjusted" counts a cancelled dosha at full marks.',
    'Kuja dosha: Mars in houses 1, 2, 4, 7, 8 or 12 from Lagna (from the Moon if the birth time is unknown), set aside when Mars is in its own sign or exalted; balanced when both have it.',
    'Vashya and Yoni tables vary slightly between almanacs, so scores may differ by a point from other software.',
  ],
};

const te: MatchText = {
  about: {
    varna: 'స్వభావం, ఆధ్యాత్మిక దృష్టి',
    vashya: 'పరస్పర ఆకర్షణ, ప్రభావం',
    tara: 'జన్మ నక్షత్రాల ద్వారా క్షేమం, అదృష్టం',
    yoni: 'శారీరక, దాంపత్య అనుకూలత',
    maitri: 'స్నేహం, మానసిక సామరస్యం (రాశ్యాధిపతులు)',
    gana: 'స్వభావం, ప్రవర్తన',
    bhakoot: 'కుటుంబ క్షేమం, సంపద, సామరస్యం',
    nadi: 'ఆరోగ్యం, సంతానం (శరీర ప్రకృతి)',
  },
  brideGroom: 'వధువు {b}, వరుడు {g}',
  varna: ['శూద్ర', 'వైశ్య', 'క్షత్రియ', 'బ్రాహ్మణ'],
  vashya: { Chatushpada: 'చతుష్పాద', Manava: 'మానవ', Jalachara: 'జలచర', Vanachara: 'వనచర', Keeta: 'కీట' },
  yoni: ['గుర్రం', 'ఏనుగు', 'మేక', 'పాము', 'కుక్క', 'పిల్లి', 'ఎలుక', 'ఆవు', 'గేదె', 'పులి', 'జింక', 'కోతి', 'ముంగిస', 'సింహం'],
  gana: ['దేవ', 'మనుష్య', 'రాక్షస'],
  nadi: ['ఆది (వాత)', 'మధ్య (పిత్త)', 'అంత్య (కఫ)'],
  taraDetail: ['రెండు నక్షత్రాలు పరస్పరం అనుకూలం', 'ఒకవైపు అనుకూలం', 'రెండు వైపులా జాగ్రత్త అవసరం'],
  lords: 'అధిపతులు: {b}, {g}',
  bhakootDetail: 'చంద్ర రాశులు పరస్పరం {b}/{g} స్థానాల్లో',
  cancel: {
    gana: 'రాశ్యాధిపతులు మిత్రులు — సంప్రదాయంగా గణ దోషం తొలగుతుంది.',
    bhakoot: 'రాశ్యాధిపతులు ఒకరే లేదా మిత్రులు — సంప్రదాయంగా భకూట దోషం తొలగుతుంది.',
    nadiSign: 'ఒకే రాశి, వేర్వేరు నక్షత్రాలు — సంప్రదాయంగా నాడి దోషం తొలగుతుంది.',
    nadiStar: 'ఒకే నక్షత్రం, వేర్వేరు రాశులు — సంప్రదాయంగా నాడి దోషం తొలగుతుంది.',
    nadiPada: 'ఒకే నక్షత్రం, వేర్వేరు పాదాలు — చాలా సంప్రదాయాల్లో నాడి దోషం తొలగుతుంది.',
  },
  kujaNote: [
    'ఇద్దరికీ కుజ దోషం ఉంది, కాబట్టి సంప్రదాయంగా సమానం (సామ్యం) అని భావిస్తారు.',
    'ఇద్దరి జాతకాల్లోనూ కుజ దోషం లేదు.',
    'ఒక్కరి జాతకంలోనే కుజ దోషం ఉంది. పూర్తి జాతకాలను జ్యోతిష్కుడితో చూపించి, చిన్న పరిహారం చేయడం సంప్రదాయం.',
  ],
  kujaOwn: 'కుజుడు స్వక్షేత్రంలో ఉన్నాడు',
  kujaExalted: 'కుజుడు ఉచ్ఛలో ఉన్నాడు (మకరం)',
  kujaFromLagna: 'లగ్నం నుండి {n} భావంలో కుజుడు',
  kujaFromMoon: 'చంద్రుని నుండి {n} భావంలో కుజుడు (జనన సమయం తెలియదు)',
  assumptions: [
    'అష్టకూట (ఉత్తర/తెలుగు పద్ధతి) గుణ మేళనం 36కి, ప్రతి ఒక్కరి చంద్ర రాశి, జన్మ నక్షత్రం నుండి (లాహిరి).',
    'భకూట, నాడి, గణ దోషాలను సాధారణంగా అంగీకరించే పరిహార (దోష భంగ) నియమాలతో చూపిస్తాము; "సవరించిన" స్కోరు తొలగిన దోషానికి పూర్తి గుణాలు ఇస్తుంది.',
    'కుజ దోషం: లగ్నం నుండి (జనన సమయం తెలియకపోతే చంద్రుని నుండి) 1, 2, 4, 7, 8, 12 భావాల్లో కుజుడు; స్వక్షేత్రం లేదా ఉచ్ఛలో ఉంటే మినహాయింపు; ఇద్దరికీ ఉంటే సమానం.',
    'వశ్య, యోని పట్టికలు పంచాంగాల మధ్య కొద్దిగా మారుతాయి, కాబట్టి ఇతర సాఫ్ట్‌వేర్‌తో ఒక గుణం తేడా రావచ్చు.',
  ],
};

const MATCH_TEXT: Partial<Record<Lang, MatchText>> = { en, te, kn, ta, ml, hi, mr };

/** The matching wording for `lang`, falling back to English. */
export const matchText = (lang: Lang): MatchText => MATCH_TEXT[lang] ?? en;
