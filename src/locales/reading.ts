// Wording of the daily Horoscope reading, transits, dashas and Life themes
// (src/engine/horoscope.ts, src/engine/lifeThemes.ts, src/engine/profileCard.ts), one table per language.
// Templates use {g} a planet, {h} a house ordinal, {name} a tara name, {n} a number,
// {maha}/{antar} dasha lords and {mt}/{at} their themes.
// kn/ta/ml/hi/mr are a first pass, to be checked by native speakers; other languages fall back to English.
import type { Graha } from '../engine/jyotish';
import type { Lang } from '../engine/names';
import { hi, mr } from './reading.north';
import { kn, ml, ta } from './reading.south';

type Line = { text: string; tip?: string };
type SlowGraha = 'jupiter' | 'saturn' | 'rahu' | 'ketu';

export interface ReadingText {
  ord: (n: number) => string;
  /** The nine taras, Janma to Parama Mitra. */
  tara: Line[];
  /** The Moon's transit house from the Moon sign, 1st to 12th. */
  moonHouse: Line[];
  chandraBala: string;
  taraBala: string;
  transit: Record<SlowGraha, { good: string; caution: string; tip: string }>;
  sadeSati: string;
  ashtama: string;
  ardhashtama: string;
  /** What each planet's period (and the planet itself) brings. */
  dashaTheme: Record<Graha, string>;
  dashaCare: Record<Graha, string>;
  dashaText: string;
  assumptions: string[];
  /** Life-theme meaning of each house, 1st to 12th. */
  houseTheme: string[];
  why: { sits: string; rules: string; actsFor: string; linked: string; karaka: string };
  lifeNote: string;
  cardNote: string;
}

const en: ReadingText = {
  ord: (n) => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'),
  tara: [
    { text: 'Your birth-star day — a natural day for prayer, gratitude and looking after yourself.', tip: 'Keep plans simple and avoid over-committing.' },
    { text: 'Sampat (prosperity) — favourable for money matters, purchases and practical progress.' },
    { text: 'A day to move carefully — double-check travel plans, documents and payments.', tip: 'Unhurried decisions work best today.' },
    { text: 'Kshema (well-being) — good for health routines, home and steady progress.' },
    { text: 'Patience brings the best results today, especially in conversations.', tip: 'Listen first; save disagreements for another day.' },
    { text: 'Sadhana (achievement) — efforts made today tend to bear fruit. Good for starting work on goals.' },
    { text: 'A quieter day — better for rest, routine and prayer than for big new beginnings.', tip: 'If something important must start today, choose the Abhijit muhurta.' },
    { text: 'Mitra (friend) — good for meetings, teamwork and help from friends.' },
    { text: 'Parama Mitra (best friend) — one of the most supportive days for important tasks.' },
  ],
  moonHouse: [
    { text: 'Comfort and good spirits — enjoy family meals and time with loved ones.' },
    { text: 'Spending and words need a little care today.', tip: 'Stick to planned purchases and speak gently.' },
    { text: 'Courage and initiative — good for communication, short trips and help from siblings.' },
    { text: 'Keep the mood at home calm and relaxed.', tip: 'A short walk or quiet time helps.' },
    { text: 'Plans involving children or studies benefit from patience today.', tip: 'Take one step at a time.' },
    { text: 'Strength to overcome obstacles — good for health routines and clearing pending work.' },
    { text: 'Good for partnerships, your spouse, agreements and travel.' },
    { text: 'Chandrashtama — the Moon is in the 8th from your Moon sign. A day to go gently.', tip: 'Postpone major new starts, drive carefully, and rest well.' },
    { text: 'Things may move slower than you would like — patience pays.', tip: 'A visit to a temple or time with elders is uplifting.' },
    { text: 'Good for work and recognition — tasks you complete today get noticed.' },
    { text: 'Gains and good news — favourable for income, friends and wishes being fulfilled.' },
    { text: 'A day for rest and reflection; keep an eye on expenses.', tip: 'Meditation, charity or an early night suit the day.' },
  ],
  chandraBala: 'Chandra bala (Moon in {h} from your sign)',
  taraBala: 'Tara bala — {name}',
  transit: {
    jupiter: {
      good: 'Guru blesses this period — growth in family, learning, finances and auspicious events is supported.',
      caution: 'Guru asks for patience now — steady effort and good advice bring results.',
      tip: 'Traditional: Guru prayers or Dattatreya worship on Thursdays, respect for teachers.',
    },
    saturn: {
      good: 'Shani supports you — hard work is rewarded and long-standing problems ease.',
      caution: 'Shani rewards discipline now — keep routines, be patient and plan finances carefully.',
      tip: 'Traditional: Hanuman Chalisa or Shani prayers on Saturdays, service to elders and the needy.',
    },
    rahu: {
      good: 'Rahu brings drive and opportunity — ambition, technology and foreign links can open doors.',
      caution: 'Rahu asks for clear thinking — verify before trusting new offers or shortcuts.',
      tip: 'Traditional: Durga worship, Rahu kalam prayers.',
    },
    ketu: {
      good: 'Ketu sharpens insight — good for spiritual practice and finishing what you started.',
      caution: 'Ketu favours focus and simplicity — avoid scattering your energy.',
      tip: 'Traditional: Ganesha worship.',
    },
  },
  sadeSati: 'Sade Sati — phase {n} of 3',
  ashtama: 'Ashtama Shani',
  ardhashtama: 'Ardhashtama Shani',
  dashaTheme: {
    sun: 'leadership, confidence, recognition and support from father and authorities',
    moon: 'emotional well-being, mother, home, travel and public goodwill',
    mars: 'energy, courage, property, land and sports',
    mercury: 'learning, business, communication, writing and friendships',
    jupiter: 'wisdom, children, wealth, spiritual growth and auspicious ceremonies',
    venus: 'comforts, marriage, arts, vehicles, beauty and happy relationships',
    saturn: 'discipline, long-term achievement, service and lasting rewards for hard work',
    rahu: 'ambition, new technology, foreign connections and unconventional success',
    ketu: 'spiritual insight, research, detachment and inner growth',
  },
  dashaCare: {
    sun: 'Balance pride with humility; look after your eyes and heart health.',
    moon: 'Protect your peace of mind with rest and routine.',
    mars: 'Channel energy constructively; drive and act calmly.',
    mercury: 'Read the fine print and avoid overthinking.',
    jupiter: 'Moderation in food and generosity keeps the blessings flowing.',
    venus: 'Enjoy comforts while keeping an eye on spending.',
    saturn: 'Results come steadily — patience and routine are your strengths.',
    rahu: 'Verify before trusting; keep your routines grounded.',
    ketu: 'Stay focused and connected to family.',
  },
  dashaText: 'The {maha} maha dasha supports {mt}. The current {antar} antardasha brings focus to {at}.',
  assumptions: [
    'Sidereal positions with Lahiri (Chitrapaksha) ayanamsa, geocentric, true ecliptic of date; Rahu/Ketu by mean node.',
    'Lagna from local sidereal time at the birth place; whole-sign houses; Navamsa (D9) by the standard 3°20′ division.',
    'Vimshottari dasha from the Moon\'s exact longitude, 365.25-day years.',
    'Daily reading from Chandra bala (Moon\'s transit from your Moon sign) and Tara bala (day\'s nakshatra from your birth star), as used in Telugu panchangams.',
    'Big-picture transits read from your Moon sign (Gochara), including Sade Sati.',
  ],
  houseTheme: [
    'self, health and personal confidence', 'family, savings and speech', 'courage, siblings, communication and short trips',
    'home, mother, property, vehicles and comforts', 'children, studies, creativity and devotion', 'health routines, service and overcoming competition',
    'marriage, partnerships and agreements', 'deep study, research, inheritance and inner change', 'fortune, father, higher learning and pilgrimage',
    'career, status and recognition', 'gains, income, friends and fulfilled wishes', 'spiritual life, foreign lands, charity and rest',
  ],
  why: {
    sits: '{g} sits in your {h} house',
    rules: '{g} rules your {h} house',
    actsFor: '{g} acts for your {h} lord',
    linked: '{g} is linked to your {h} house',
    karaka: '{g} is the natural significator',
  },
  lifeNote:
    'Themes follow classical Parashari reading of Vimshottari dashas: the houses each period lord occupies and rules (whole-sign houses), ' +
    'Rahu and Ketu acting through their sign lord, and each planet\'s natural significations. They show which areas of life tradition ' +
    'associates with a period — not events that will happen. Real life depends on your choices and circumstances.',
  cardNote: 'Rashi, nakshatra and Avakahada details are calculated (Lahiri). Lucky day, number and colour are traditional associations of the Moon-sign lord (and birth-star lord for numbers).',
};

const te: ReadingText = {
  ord: (n) => `${n}వ`,
  tara: [
    { text: 'మీ జన్మ నక్షత్ర దినం — ప్రార్థన, కృతజ్ఞత, ఆత్మసంరక్షణకు అనువైన రోజు.', tip: 'పనులు సరళంగా ఉంచండి, ఎక్కువ బాధ్యతలు తీసుకోకండి.' },
    { text: 'సంపత్ తార — ఆర్థిక విషయాలు, కొనుగోళ్లు, పనుల పురోగతికి అనుకూలం.' },
    { text: 'జాగ్రత్తగా ముందుకు సాగే రోజు — ప్రయాణాలు, పత్రాలు, చెల్లింపులు ఒకసారి సరిచూసుకోండి.', tip: 'నిదానంగా నిర్ణయాలు తీసుకోవడం మంచిది.' },
    { text: 'క్షేమ తార — ఆరోగ్యం, ఇల్లు, స్థిరమైన పురోగతికి మంచిది.' },
    { text: 'ఈ రోజు ఓర్పుతో మంచి ఫలితాలు — ముఖ్యంగా మాటల్లో.', tip: 'ముందు వినండి; వాదనలు వాయిదా వేయండి.' },
    { text: 'సాధన తార — ఈ రోజు చేసే ప్రయత్నాలు ఫలిస్తాయి. లక్ష్యాల దిశగా పని మొదలుపెట్టడానికి మంచిది.' },
    { text: 'ప్రశాంతమైన రోజు — కొత్త పెద్ద పనులకంటే విశ్రాంతి, దినచర్య, ప్రార్థనకు మంచిది.', tip: 'ముఖ్యమైన పని తప్పనిసరైతే అభిజిత్ ముహూర్తం ఎంచుకోండి.' },
    { text: 'మిత్ర తార — సమావేశాలు, కలిసి పని చేయడం, స్నేహితుల సహాయానికి మంచిది.' },
    { text: 'పరమ మిత్ర తార — ముఖ్యమైన పనులకు అత్యంత అనుకూలమైన రోజుల్లో ఒకటి.' },
  ],
  moonHouse: [
    { text: 'సుఖం, ఉల్లాసం — కుటుంబంతో భోజనం, ఆప్తులతో సమయం ఆనందించండి.' },
    { text: 'ఈ రోజు ఖర్చులు, మాటలు కొంచెం జాగ్రత్తగా.', tip: 'అనుకున్న కొనుగోళ్లకే పరిమితం అవ్వండి, మృదువుగా మాట్లాడండి.' },
    { text: 'ధైర్యం, చొరవ — సంభాషణలు, చిన్న ప్రయాణాలు, తోబుట్టువుల సహకారానికి మంచిది.' },
    { text: 'ఇంట్లో వాతావరణం ప్రశాంతంగా ఉంచుకోండి.', tip: 'కొంచెం నడక లేదా నిశ్శబ్ద సమయం మేలు.' },
    { text: 'పిల్లలు, చదువులకు సంబంధించిన పనుల్లో ఈ రోజు ఓర్పు అవసరం.', tip: 'ఒక్కో అడుగు వేయండి.' },
    { text: 'అడ్డంకులను అధిగమించే బలం — ఆరోగ్య నియమాలు, పెండింగ్ పనులు పూర్తి చేయడానికి మంచిది.' },
    { text: 'భాగస్వామ్యం, జీవిత భాగస్వామి, ఒప్పందాలు, ప్రయాణాలకు మంచిది.' },
    { text: 'చంద్రాష్టమం — చంద్రుడు మీ రాశి నుండి 8వ స్థానంలో ఉన్నాడు. నిదానంగా ఉండే రోజు.', tip: 'కొత్త పెద్ద పనులు వాయిదా వేయండి, జాగ్రత్తగా ప్రయాణించండి, బాగా విశ్రాంతి తీసుకోండి.' },
    { text: 'పనులు కొంచెం నెమ్మదిగా సాగవచ్చు — ఓర్పుతో మంచి ఫలితం.', tip: 'గుడికి వెళ్లడం లేదా పెద్దలతో సమయం మనసుకు ఉత్సాహం.' },
    { text: 'ఉద్యోగం, గుర్తింపుకు మంచిది — ఈ రోజు పూర్తి చేసే పనులు గుర్తింపు తెస్తాయి.' },
    { text: 'లాభాలు, శుభవార్తలు — ఆదాయం, స్నేహితులు, కోరికలు నెరవేరడానికి అనుకూలం.' },
    { text: 'విశ్రాంతి, ఆలోచనకు రోజు; ఖర్చులపై దృష్టి ఉంచండి.', tip: 'ధ్యానం, దానం లేదా త్వరగా నిద్ర ఈ రోజుకు తగినవి.' },
  ],
  chandraBala: 'చంద్ర బలం ({h} స్థానం)',
  taraBala: 'తారా బలం — {name}',
  transit: {
    jupiter: {
      good: 'గురు అనుగ్రహ కాలం — కుటుంబం, విద్య, ఆర్థికం, శుభకార్యాల్లో అభివృద్ధికి అనుకూలం.',
      caution: 'గురువు ఓర్పు కోరుతున్నాడు — స్థిరమైన ప్రయత్నం, మంచి సలహాలు ఫలితాన్నిస్తాయి.',
      tip: 'సంప్రదాయం: గురువారం గురు/దత్తాత్రేయ ఆరాధన, గురువులను గౌరవించడం.',
    },
    saturn: {
      good: 'శని అనుకూలం — కష్టానికి ఫలితం, పాత సమస్యలు తగ్గుతాయి.',
      caution: 'శని క్రమశిక్షణను మెచ్చే కాలం — దినచర్య, ఓర్పు, ఆర్థిక ప్రణాళిక ముఖ్యం.',
      tip: 'సంప్రదాయం: శనివారం హనుమాన్ చాలీసా / శని ప్రార్థన, పెద్దలకు, అవసరమైనవారికి సేవ.',
    },
    rahu: {
      good: 'రాహువు ఉత్సాహం, అవకాశాలు తెస్తాడు — సాంకేతికత, విదేశీ సంబంధాలు తలుపులు తెరుస్తాయి.',
      caution: 'రాహువు స్పష్టమైన ఆలోచన కోరతాడు — కొత్త ఆఫర్లను నమ్మే ముందు సరిచూసుకోండి.',
      tip: 'సంప్రదాయం: దుర్గా ఆరాధన, రాహుకాల పూజ.',
    },
    ketu: {
      good: 'కేతువు అంతర్దృష్టిని పెంచుతాడు — ఆధ్యాత్మిక సాధనకు, మొదలుపెట్టిన పనులు పూర్తి చేయడానికి మంచిది.',
      caution: 'కేతువు ఏకాగ్రత, సరళతను ఇష్టపడతాడు — శక్తిని చెదరగొట్టకండి.',
      tip: 'సంప్రదాయం: గణపతి ఆరాధన.',
    },
  },
  sadeSati: 'ఏలినాటి శని — {n}వ దశ',
  ashtama: 'అష్టమ శని',
  ardhashtama: 'అర్ధాష్టమ శని',
  dashaTheme: {
    sun: 'నాయకత్వం, ఆత్మవిశ్వాసం, గుర్తింపు, తండ్రి, అధికారుల సహకారం',
    moon: 'మానసిక సంతోషం, తల్లి, ఇల్లు, ప్రయాణాలు, ప్రజాదరణ',
    mars: 'శక్తి, ధైర్యం, ఆస్తి, భూమి, క్రీడలు',
    mercury: 'విద్య, వ్యాపారం, సంభాషణ, రచన, స్నేహాలు',
    jupiter: 'జ్ఞానం, సంతానం, ధనం, ఆధ్యాత్మిక అభివృద్ధి, శుభకార్యాలు',
    venus: 'సుఖాలు, వివాహం, కళలు, వాహనాలు, సౌందర్యం, సంతోషకరమైన బంధాలు',
    saturn: 'క్రమశిక్షణ, దీర్ఘకాల విజయం, సేవ, కష్టానికి శాశ్వత ఫలం',
    rahu: 'ఆశయాలు, కొత్త సాంకేతికత, విదేశీ సంబంధాలు, వినూత్న విజయం',
    ketu: 'ఆధ్యాత్మిక అంతర్దృష్టి, పరిశోధన, వైరాగ్యం, అంతర్గత అభివృద్ధి',
  },
  dashaCare: {
    sun: 'అహంకారం కాకుండా వినయం; కళ్లు, గుండె ఆరోగ్యం జాగ్రత్త.',
    moon: 'విశ్రాంతి, దినచర్యతో మనశ్శాంతి కాపాడుకోండి.',
    mars: 'శక్తిని మంచి పనులకు వాడండి; ప్రశాంతంగా ప్రవర్తించండి.',
    mercury: 'ఒప్పందాలు జాగ్రత్తగా చదవండి, అతిగా ఆలోచించకండి.',
    jupiter: 'ఆహారంలో మితం, దానగుణం శుభాలను కొనసాగిస్తాయి.',
    venus: 'సుఖాలను ఆస్వాదిస్తూ ఖర్చులపై దృష్టి ఉంచండి.',
    saturn: 'ఫలితాలు నెమ్మదిగా వస్తాయి — ఓర్పు, దినచర్య మీ బలం.',
    rahu: 'నమ్మే ముందు సరిచూసుకోండి; దినచర్య స్థిరంగా ఉంచండి.',
    ketu: 'ఏకాగ్రతతో, కుటుంబంతో అనుబంధంగా ఉండండి.',
  },
  dashaText: '{maha} మహాదశ {mt} కు అనుకూలం. ప్రస్తుత {antar} అంతర్దశ {at} పై దృష్టి పెడుతుంది.',
  assumptions: [
    'లాహిరి (చిత్రాపక్ష) అయనాంశతో నిరయన గ్రహస్థితులు, భూకేంద్రిత, ఆ తేదీ నిజ క్రాంతివృత్తం; రాహు/కేతువులు మధ్యమ పాతం ప్రకారం.',
    'జన్మస్థలం స్థానిక నక్షత్ర కాలం నుండి లగ్నం; రాశి భావాలు (whole-sign); నవాంశ (D9) సాధారణ 3°20′ విభాగంతో.',
    'చంద్రుని ఖచ్చితమైన రేఖాంశం నుండి వింశోత్తరి దశ, 365.25 రోజుల సంవత్సరం.',
    'దిన ఫలం చంద్ర బలం (మీ రాశి నుండి చంద్ర సంచారం), తారా బలం (మీ జన్మ నక్షత్రం నుండి ఆ రోజు నక్షత్రం) ఆధారంగా — తెలుగు పంచాంగాల్లో లాగే.',
    'పెద్ద గ్రహ గోచారం మీ చంద్ర రాశి నుండి, ఏలినాటి శనితో సహా.',
  ],
  houseTheme: [
    'ఆత్మవిశ్వాసం, ఆరోగ్యం, వ్యక్తిత్వం', 'కుటుంబం, పొదుపు, వాక్కు', 'ధైర్యం, తోబుట్టువులు, సంభాషణ, చిన్న ప్రయాణాలు',
    'ఇల్లు, తల్లి, ఆస్తి, వాహనాలు, సుఖాలు', 'సంతానం, చదువు, సృజనాత్మకత, భక్తి', 'ఆరోగ్య నియమాలు, సేవ, పోటీలో విజయం',
    'వివాహం, భాగస్వామ్యం, ఒప్పందాలు', 'లోతైన అధ్యయనం, పరిశోధన, వారసత్వం, అంతర్గత మార్పు', 'అదృష్టం, తండ్రి, ఉన్నత విద్య, తీర్థయాత్రలు',
    'ఉద్యోగం, హోదా, గుర్తింపు', 'లాభాలు, ఆదాయం, స్నేహితులు, కోరికలు నెరవేరడం', 'ఆధ్యాత్మికత, విదేశాలు, దానం, విశ్రాంతి',
  ],
  why: {
    sits: '{g} మీ {h} భావంలో ఉన్నాడు',
    rules: '{g} మీ {h} భావాధిపతి',
    actsFor: '{g} మీ {h} భావాధిపతి తరఫున పనిచేస్తాడు',
    linked: '{g} మీ {h} భావంతో సంబంధం',
    karaka: '{g} సహజ కారకుడు',
  },
  lifeNote:
    'ఈ అంశాలు వింశోత్తరి దశల శాస్త్రీయ పారాశరీ పద్ధతిని అనుసరిస్తాయి: ప్రతి దశాధిపతి ఉన్న, అధిపతిగా ఉన్న భావాలు, రాహు-కేతువులు తాము ఉన్న రాశ్యాధిపతి ద్వారా, ' +
    'ప్రతి గ్రహం సహజ కారకత్వాలు. ఏ కాలంలో ఏ జీవన అంశాలు ముందుకు వస్తాయని సంప్రదాయం చెబుతుందో చూపుతాయి — జరగబోయే సంఘటనలు కాదు. నిజ జీవితం మీ ఎంపికలు, పరిస్థితులపై ఆధారపడుతుంది.',
  cardNote: 'రాశి, నక్షత్రం, అవకహడ వివరాలు లెక్కించినవి (లాహిరి). అదృష్ట దినం, సంఖ్య, రంగు చంద్ర రాశ్యాధిపతి (సంఖ్యలకు జన్మ నక్షత్రాధిపతి) సంప్రదాయ సంబంధాలు.',
};

const READING_TEXT: Partial<Record<Lang, ReadingText>> = { en, te, kn, ta, ml, hi, mr };

/** The reading wording for `lang`, falling back to English. */
export const readingText = (lang: Lang): ReadingText => READING_TEXT[lang] ?? en;
/** Languages whose readings are fully written (the rest show English). */
export const hasReadingText = (lang: Lang) => lang in READING_TEXT;
export const fill = (t: string, v: Record<string, string | number>) => Object.entries(v).reduce((s, [k, x]) => s.split(`{${k}}`).join(String(x)), t);
