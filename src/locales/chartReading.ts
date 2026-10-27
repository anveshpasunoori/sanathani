// Wording of the birth-chart reading (src/engine/chartReading.ts), one table per language.
// Templates use {g} planet, {s} its gifts, {h}/{lh} house ordinals, {name} house meaning,
// {lord} house lord, {n} a number, {q} a quality, {x} a nature, {p} the planets forming a yoga.
// kn/ta/ml/hi/mr are a first pass, to be checked by native speakers; other languages fall back to English.
import type { Dignity, SaturnPhase } from '../engine/chartReading';
import type { Graha } from '../engine/jyotish';
import type { Lang } from '../engine/names';
import { hi, mr } from './chartReading.north';
import { kn, ml, ta } from './chartReading.south';

export type YogaId =
  | 'gajakesari' | 'budhaditya' | 'chandramangala' | 'ruchaka' | 'bhadra' | 'hamsa' | 'malavya' | 'sasa'
  | 'raja' | 'dhana' | 'viparita' | 'neechabhanga' | 'parivartana' | 'adhi' | 'amala' | 'sunapha' | 'kemadruma' | 'kalasarpa';

export interface ChartText {
  ord: (n: number) => string;
  and: string;
  dignity: Record<Dignity, string>;
  dignityLine: Record<Dignity, string>;
  nodeLine: string;
  remedy: Record<Graha, string>;
  houseName: string[];
  inHouse: string;
  neechaBhanga: string;
  vargottama: string;
  digbala: string;
  retro: string;
  combust: string;
  houseLord: string;
  /** Where the house lord sits: kendra, trikona, 2nd/11th, 3rd, 6th/8th/12th. */
  lordLine: [string, string, string, string, string];
  /** [one planet, several planets] */
  brighten: [string, string];
  drive: [string, string];
  patience: [string, string];
  bindus: string;
  /** strong, balanced, grows with effort */
  bindusQ: [string, string, string];
  yoga: Record<YogaId, { name: string; text: string; tip?: string }>;
  saturn: Record<SaturnPhase['kind'], { name: string; text: string }>;
  signNature: string[];
  nakshatraNature: string[];
  lagnaTitle: string;
  moonTitle: string;
  starTitle: string;
  lagnaText: string;
  moonText: string;
  starText: string;
}

const en: ChartText = {
  ord: (n) => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'),
  and: ' & ',
  dignity: { exalted: 'Exalted', moolatrikona: 'Moolatrikona', own: 'Own sign', friend: "Friend's sign", neutral: 'Neutral sign', enemy: "Opponent's sign", debilitated: 'Debilitated' },
  dignityLine: {
    exalted: '{g} is exalted — its gifts of {s} come to you naturally and strongly.',
    moolatrikona: '{g} is in its Moolatrikona sign — {s} are a dependable strength in your life.',
    own: '{g} is in its own sign — comfortable and confident in matters of {s}.',
    friend: "{g} sits in a friend's sign — {s} are well supported.",
    neutral: '{g} is in a neutral sign — {s} grow with your own steady effort.',
    enemy: "{g} sits in an opponent's sign — {s} reward patience and good advice.",
    debilitated: '{g} is in its sign of debilitation — {s} grow through effort and patience, and often become a hard-won strength.',
  },
  nodeLine: '{g} amplifies the matters of this house and of its sign lord — {s}.',
  remedy: {
    sun: 'Offer water to the Sun at sunrise (Arghya) and recite Aditya Hrudayam; respect your father and elders.',
    moon: 'Worship Shiva or Gauri on Mondays, keep a calm routine and honour your mother.',
    mars: 'Hanuman or Subrahmanya worship on Tuesdays; channel energy into exercise and service.',
    mercury: 'Vishnu Sahasranamam on Wednesdays; give to students and keep learning.',
    jupiter: 'Guru or Dattatreya worship on Thursdays; honour teachers and give food or learning.',
    venus: 'Lakshmi worship on Fridays; keep relationships warm and the home clean and bright.',
    saturn: 'Hanuman Chalisa or Shani prayers on Saturdays; serve the elderly and the needy, and keep steady routines.',
    rahu: 'Durga worship and prayers during Rahu Kalam; verify before trusting shortcuts.',
    ketu: 'Ganesha worship; meditation and finishing what you begin.',
  },
  houseName: ['self and health', 'family and wealth', 'courage and siblings', 'home and mother', 'children and intellect', 'health and service', 'marriage and partnership', 'longevity and research', 'fortune and dharma', 'career and status', 'gains and friends', 'spirituality and expenses'],
  inHouse: 'It sits in your {h} house ({name}).',
  neechaBhanga: 'Its debilitation is cancelled (neecha bhanga) — what starts slowly turns into real strength.',
  vargottama: 'Vargottama — the same sign in Rasi and Navamsa gives it steadiness.',
  digbala: 'It has directional strength (dig bala) here and works at full power.',
  retro: 'It is retrograde — revisiting and reflecting deeply serve these matters well.',
  combust: 'It is close to the Sun (combust) — let these qualities show with confidence rather than holding back.',
  houseLord: 'Your {h} house ({name}) is ruled by {lord}, placed in your {lh} house.',
  lordLine: [
    'The lord is in a kendra — this part of life has a firm foundation and tends to grow steadily.',
    'The lord is in a trikona — this part of life is blessed by good fortune and past merit.',
    'The lord is in a house of gains — effort here brings returns and resources.',
    'The lord is in the house of initiative — results come through your own courage and effort.',
    'The lord is in a house of effort — this area grows through patience, service and persistence, and rewards it.',
  ],
  brighten: ['{g} brightens this house.', '{g} brighten this house.'],
  drive: ['{g} gives drive and determination here.', '{g} give drive and determination here.'],
  patience: ['{g} asks for patience and care here.', '{g} ask for patience and care here.'],
  bindus: 'Ashtakavarga: {n} bindus ({q}).',
  bindusQ: ['strong', 'balanced', 'grows with effort'],
  yoga: {
    gajakesari: { name: 'Gaja Kesari Yoga', text: 'Jupiter in a kendra from the Moon: wisdom, respect in society, a generous nature and lasting good name.' },
    budhaditya: { name: 'Budha-Aditya Yoga', text: 'Sun and Mercury together: a sharp intellect, clear speech and skill in learning, business and administration.' },
    chandramangala: { name: 'Chandra-Mangala Yoga', text: 'Moon and Mars together: enterprise, earning power and the courage to act on your feelings.' },
    ruchaka: { name: 'Ruchaka Yoga (Mahapurusha)', text: 'A strong Mars in a kendra: courage, leadership, physical vitality and success in competitive fields.' },
    bhadra: { name: 'Bhadra Yoga (Mahapurusha)', text: 'A strong Mercury in a kendra: intelligence, eloquence, a gift for learning, trade and writing.' },
    hamsa: { name: 'Hamsa Yoga (Mahapurusha)', text: 'A strong Jupiter in a kendra: righteousness, wisdom, respect and a spiritual, generous life.' },
    malavya: { name: 'Malavya Yoga (Mahapurusha)', text: 'A strong Venus in a kendra: comforts, artistic taste, a happy married life and refinement.' },
    sasa: { name: 'Sasa Yoga (Mahapurusha)', text: 'A strong Saturn in a kendra: authority earned through discipline, organisational ability and lasting achievement.' },
    raja: { name: 'Raja Yoga', text: 'The lords of a kendra and a trikona join together ({p}): rise in status, authority and recognition, especially in their periods.' },
    dhana: { name: 'Dhana Yoga', text: 'The lords of wealth and fortune connect ({p}): good earning capacity and accumulation of resources.' },
    viparita: { name: 'Viparita Raja Yoga', text: 'A lord of a difficult house sits in another difficult house ({p}): the ability to turn obstacles into success and rise after challenges.' },
    neechabhanga: { name: 'Neecha Bhanga Raja Yoga', text: 'A debilitated planet has its weakness cancelled ({p}): a slow start that turns into notable success.' },
    parivartana: { name: 'Parivartana Yoga', text: 'Two planets exchange signs ({p}): the matters of both houses support and strengthen each other.' },
    adhi: { name: 'Adhi Yoga', text: 'Benefics in the 6th, 7th and 8th from the Moon: a comfortable, respected life and capable leadership.' },
    amala: { name: 'Amala Yoga', text: 'A benefic in the 10th house: a clean reputation and work that brings lasting good name.' },
    sunapha: { name: 'Sunapha / Anapha Yoga', text: 'Planets beside the Moon: self-earned wealth, good health and a steady mind.' },
    kemadruma: { name: 'Kemadruma (to balance)', text: 'No planets beside the Moon: you may sometimes feel you are carrying things alone — strong friendships and routine keep the mind steady.', tip: 'Traditional: Shiva worship on Mondays, Chandra mantra, and offering milk or white rice.' },
    kalasarpa: { name: 'Kala Sarpa (to balance)', text: 'All planets lie on one side of the Rahu–Ketu axis: life tends to move in strong phases — persistence through slower stretches is well rewarded.', tip: 'Traditional: Naga worship (Subrahmanya), Rahu-Ketu pooja at Srikalahasti, and Durga prayers.' },
  },
  saturn: {
    sadesati: { name: 'Sade Sati', text: 'Saturn passes over your Moon sign for about seven and a half years. It is a period of maturity: responsibilities grow, and patient, honest effort is rewarded with lasting results.' },
    ashtama: { name: 'Ashtama Shani', text: 'Saturn in the 8th from your Moon sign for about two and a half years: a time to go carefully with health, travel and finances, and to deepen spiritual practice.' },
    ardhashtama: { name: 'Ardhashtama Shani', text: 'Saturn in the 4th from your Moon sign for about two and a half years: give extra care to home, mother, property matters and peace of mind.' },
  },
  signNature: [
    'energetic, courageous and quick to take the lead',
    'steady, patient, loyal and fond of comfort and beauty',
    'curious, witty, adaptable and a natural communicator',
    'caring, intuitive and deeply attached to home and family',
    'dignified, generous and confident, with natural authority',
    'practical, careful, helpful and attentive to detail',
    'balanced, fair-minded, graceful and good with people',
    'intense, determined, perceptive and resilient',
    'optimistic, principled and drawn to learning and dharma',
    'disciplined, ambitious, responsible and hard-working',
    'independent, humanitarian and full of original ideas',
    'compassionate, imaginative, devotional and gentle',
  ],
  nakshatraNature: [
    'quick, helpful and a natural healer',
    'responsible, determined and able to carry heavy duties',
    'sharp, honest and able to cut through confusion',
    'charming, creative and blessed with growth and plenty',
    'curious, gentle and always seeking knowledge',
    'thoughtful, intense and able to renew after storms',
    'kind, hopeful and able to bounce back',
    'nurturing, devoted and dependable — one of the most auspicious stars',
    'perceptive, strategic and deeply intuitive',
    'dignified, respectful of tradition and ancestors',
    'warm, creative and fond of celebration and comfort',
    'generous, reliable and a good friend and partner',
    'skilful with the hands, resourceful and witty',
    'artistic, elegant and a builder of beautiful things',
    'independent, flexible and good in business',
    'goal-driven, patient and successful in the long run',
    'devoted, friendly and successful far from home',
    'protective, capable and a natural elder',
    'deep, searching and drawn to the roots of things',
    'confident, persuasive and hard to defeat',
    'principled, persistent and assured of final victory',
    'a good listener, learned and respected for wisdom',
    'prosperous, musical and generous',
    'independent, healing and research-minded',
    'idealistic, intense and devoted to a cause',
    'wise, calm and steady under pressure',
    'gentle, caring and a guide and protector of others',
  ],
  lagnaTitle: 'Lagna (rising sign)',
  moonTitle: 'Moon sign',
  starTitle: 'Birth star',
  lagnaText: 'Outwardly you are {x}.',
  moonText: 'At heart you are {x}.',
  starText: 'Your birth star makes you {x}.',
};

const te: ChartText = {
  ord: (n) => `${n}వ`,
  and: ' & ',
  dignity: { exalted: 'ఉచ్ఛ', moolatrikona: 'మూలత్రికోణం', own: 'స్వక్షేత్రం', friend: 'మిత్ర క్షేత్రం', neutral: 'సమ క్షేత్రం', enemy: 'శత్రు క్షేత్రం', debilitated: 'నీచ' },
  dignityLine: {
    exalted: '{g} ఉచ్ఛలో ఉన్నాడు — {s} సహజంగా, బలంగా మీకు లభిస్తాయి.',
    moolatrikona: '{g} మూలత్రికోణంలో ఉన్నాడు — {s} మీ జీవితంలో నమ్మకమైన బలం.',
    own: '{g} స్వక్షేత్రంలో ఉన్నాడు — {s} విషయాల్లో సౌకర్యం, ఆత్మవిశ్వాసం.',
    friend: '{g} మిత్ర క్షేత్రంలో ఉన్నాడు — {s} కు మంచి సహకారం.',
    neutral: '{g} సమ క్షేత్రంలో ఉన్నాడు — {s} మీ స్థిరమైన ప్రయత్నంతో పెరుగుతాయి.',
    enemy: '{g} శత్రు క్షేత్రంలో ఉన్నాడు — {s} విషయంలో ఓర్పు, మంచి సలహా ఫలితాన్నిస్తాయి.',
    debilitated: '{g} నీచలో ఉన్నాడు — {s} కృషి, ఓర్పుతో పెరుగుతాయి; తరచూ కష్టపడి సాధించిన బలంగా మారతాయి.',
  },
  nodeLine: '{g} ఈ భావం, ఈ రాశ్యాధిపతి విషయాలను పెంచుతాడు — {s}.',
  remedy: {
    sun: 'సూర్యోదయాన అర్ఘ్యం, ఆదిత్య హృదయం పారాయణ; తండ్రిని, పెద్దలను గౌరవించడం.',
    moon: 'సోమవారం శివుడు / గౌరీ ఆరాధన, ప్రశాంతమైన దినచర్య, తల్లిని గౌరవించడం.',
    mars: 'మంగళవారం హనుమాన్ / సుబ్రహ్మణ్య ఆరాధన; శక్తిని వ్యాయామం, సేవలో వినియోగించడం.',
    mercury: 'బుధవారం విష్ణు సహస్రనామం; విద్యార్థులకు సహాయం, నిరంతర అభ్యాసం.',
    jupiter: 'గురువారం గురు / దత్తాత్రేయ ఆరాధన; గురువులను గౌరవించడం, అన్నదానం / విద్యాదానం.',
    venus: 'శుక్రవారం లక్ష్మీ ఆరాధన; బంధాల్లో ఆప్యాయత, ఇల్లు శుభ్రంగా, కాంతిగా.',
    saturn: 'శనివారం హనుమాన్ చాలీసా / శని ప్రార్థన; వృద్ధులకు, అవసరమైనవారికి సేవ, స్థిరమైన దినచర్య.',
    rahu: 'దుర్గా ఆరాధన, రాహుకాలంలో ప్రార్థన; అడ్డదారులను నమ్మే ముందు సరిచూసుకోవడం.',
    ketu: 'గణపతి ఆరాధన; ధ్యానం, మొదలుపెట్టిన పనులు పూర్తి చేయడం.',
  },
  houseName: ['వ్యక్తిత్వం, ఆరోగ్యం', 'కుటుంబం, ధనం', 'ధైర్యం, తోబుట్టువులు', 'ఇల్లు, తల్లి', 'సంతానం, బుద్ధి', 'ఆరోగ్యం, సేవ', 'వివాహం, భాగస్వామ్యం', 'ఆయుష్షు, పరిశోధన', 'అదృష్టం, ధర్మం', 'వృత్తి, హోదా', 'లాభాలు, స్నేహితులు', 'ఆధ్యాత్మికత, వ్యయం'],
  inHouse: 'ఇది మీ {h} భావం ({name}) లో ఉంది.',
  neechaBhanga: 'నీచభంగం ఉంది — నెమ్మదిగా మొదలైనది బలంగా మారుతుంది.',
  vargottama: 'వర్గోత్తమం — రాశి, నవాంశ ఒకటే కావడం దీనికి స్థిరత్వం ఇస్తుంది.',
  digbala: 'దిగ్బలం ఉంది — ఈ భావంలో ఇది పూర్తి శక్తితో పనిచేస్తుంది.',
  retro: 'వక్రంలో ఉంది — ఈ విషయాల్లో పునఃపరిశీలన, లోతైన ఆలోచన మేలు చేస్తాయి.',
  combust: 'సూర్యునికి దగ్గరగా (అస్తంగతం) ఉంది — ఈ గుణాలను నమ్మకంగా ప్రదర్శించడం నేర్చుకోండి.',
  houseLord: '{h} భావం ({name}) అధిపతి {lord}, {lh} భావంలో ఉన్నాడు.',
  lordLine: [
    'అధిపతి కేంద్రంలో ఉన్నాడు — ఈ విషయాలకు బలమైన పునాది, స్థిరమైన అభివృద్ధి.',
    'అధిపతి త్రికోణంలో ఉన్నాడు — ఈ విషయాలకు అదృష్టం, పూర్వపుణ్య బలం.',
    'అధిపతి లాభ స్థానంలో ఉన్నాడు — ఇక్కడి ప్రయత్నం ఫలితాన్ని, వనరులను ఇస్తుంది.',
    'అధిపతి పరాక్రమ స్థానంలో ఉన్నాడు — మీ ధైర్యం, స్వయంకృషితో ఫలితాలు.',
    'అధిపతి శ్రమ స్థానంలో ఉన్నాడు — ఈ విషయాలు ఓర్పు, సేవ, పట్టుదలతో పెరుగుతాయి, వాటికి ఫలమిస్తాయి.',
  ],
  brighten: ['{g} ఈ భావానికి శుభత్వాన్ని ఇస్తున్నారు.', '{g} ఈ భావానికి శుభత్వాన్ని ఇస్తున్నారు.'],
  drive: ['{g} ఇక్కడ ఉత్సాహం, పట్టుదల ఇస్తారు.', '{g} ఇక్కడ ఉత్సాహం, పట్టుదల ఇస్తారు.'],
  patience: ['{g} ఇక్కడ ఓర్పు, జాగ్రత్తను కోరతారు.', '{g} ఇక్కడ ఓర్పు, జాగ్రత్తను కోరతారు.'],
  bindus: 'అష్టకవర్గ బిందువులు: {n} ({q}).',
  bindusQ: ['బలమైనది', 'సమతుల్యం', 'కృషితో పెరిగేది'],
  yoga: {
    gajakesari: { name: 'గజకేసరి యోగం', text: 'చంద్రునికి కేంద్రంలో గురువు: జ్ఞానం, సమాజంలో గౌరవం, ఉదార స్వభావం, శాశ్వత కీర్తి.' },
    budhaditya: { name: 'బుధాదిత్య యోగం', text: 'సూర్య బుధుల కలయిక: పదునైన బుద్ధి, స్పష్టమైన మాట, విద్య, వ్యాపారం, పరిపాలనలో నైపుణ్యం.' },
    chandramangala: { name: 'చంద్ర మంగళ యోగం', text: 'చంద్ర కుజుల కలయిక: వ్యాపార నైపుణ్యం, సంపాదన శక్తి, భావాలపై ధైర్యంగా పనిచేయడం.' },
    ruchaka: { name: 'రుచక యోగం (మహాపురుష)', text: 'కేంద్రంలో బలమైన కుజుడు: ధైర్యం, నాయకత్వం, శారీరక శక్తి, పోటీలో విజయం.' },
    bhadra: { name: 'భద్ర యోగం (మహాపురుష)', text: 'కేంద్రంలో బలమైన బుధుడు: బుద్ధిబలం, వాక్చాతుర్యం, విద్య, వ్యాపారం, రచనలో ప్రతిభ.' },
    hamsa: { name: 'హంస యోగం (మహాపురుష)', text: 'కేంద్రంలో బలమైన గురువు: ధర్మబుద్ధి, జ్ఞానం, గౌరవం, ఆధ్యాత్మిక, ఉదార జీవితం.' },
    malavya: { name: 'మాలవ్య యోగం (మహాపురుష)', text: 'కేంద్రంలో బలమైన శుక్రుడు: సుఖాలు, కళాభిరుచి, సంతోషకరమైన వైవాహిక జీవితం.' },
    sasa: { name: 'శశ యోగం (మహాపురుష)', text: 'కేంద్రంలో బలమైన శని: క్రమశిక్షణతో సాధించే అధికారం, నిర్వహణ సామర్థ్యం, శాశ్వత విజయం.' },
    raja: { name: 'రాజ యోగం', text: 'కేంద్ర, త్రికోణ అధిపతుల కలయిక ({p}): హోదా, అధికారం, గుర్తింపులో ఎదుగుదల — ముఖ్యంగా వారి దశల్లో.' },
    dhana: { name: 'ధన యోగం', text: 'ధన, భాగ్య అధిపతుల సంబంధం ({p}): మంచి సంపాదన సామర్థ్యం, సంపద వృద్ధి.' },
    viparita: { name: 'విపరీత రాజ యోగం', text: 'దుస్థాన అధిపతి మరో దుస్థానంలో ({p}): అడ్డంకులను విజయంగా మార్చే శక్తి, సవాళ్ల తర్వాత ఎదుగుదల.' },
    neechabhanga: { name: 'నీచభంగ రాజ యోగం', text: 'నీచ గ్రహానికి నీచభంగం ({p}): నెమ్మదిగా మొదలై గొప్ప విజయంగా మారుతుంది.' },
    parivartana: { name: 'పరివర్తన యోగం', text: 'రెండు గ్రహాల రాశి మార్పిడి ({p}): రెండు భావాల విషయాలు పరస్పరం బలపడతాయి.' },
    adhi: { name: 'అధి యోగం', text: 'చంద్రునికి 6, 7, 8 స్థానాల్లో శుభగ్రహాలు: సుఖమైన, గౌరవప్రదమైన జీవితం, సమర్థ నాయకత్వం.' },
    amala: { name: 'అమల యోగం', text: 'దశమ స్థానంలో శుభగ్రహం: నిర్మలమైన కీర్తి, శాశ్వత మంచి పేరు తెచ్చే వృత్తి.' },
    sunapha: { name: 'సునఫా / అనఫా యోగం', text: 'చంద్రునికి ఇరువైపులా గ్రహాలు: స్వయంగా సంపాదించిన ధనం, మంచి ఆరోగ్యం, స్థిరమైన మనస్సు.' },
    kemadruma: { name: 'కేమద్రుమ (సమతుల్యం కోసం)', text: 'చంద్రునికి ఇరువైపులా గ్రహాలు లేవు: కొన్నిసార్లు ఒంటరిగా మోస్తున్నట్లు అనిపించవచ్చు — మంచి స్నేహాలు, దినచర్య మనస్సును స్థిరంగా ఉంచుతాయి.', tip: 'సంప్రదాయం: సోమవారం శివారాధన, చంద్ర మంత్రం, పాలు / బియ్యం దానం.' },
    kalasarpa: { name: 'కాలసర్ప (సమతుల్యం కోసం)', text: 'అన్ని గ్రహాలు రాహు-కేతువుల మధ్య ఒకవైపు: జీవితం బలమైన దశలుగా సాగుతుంది — నెమ్మదైన సమయాల్లో పట్టుదలకు మంచి ఫలితం.', tip: 'సంప్రదాయం: నాగ (సుబ్రహ్మణ్య) ఆరాధన, శ్రీకాళహస్తిలో రాహు-కేతు పూజ, దుర్గా ప్రార్థన.' },
  },
  saturn: {
    sadesati: { name: 'ఏలినాటి శని', text: 'శని మీ చంద్ర రాశి మీదుగా సుమారు ఏడున్నర సంవత్సరాలు సంచరిస్తాడు. ఇది పరిణతి కాలం: బాధ్యతలు పెరుగుతాయి, ఓర్పుతో నిజాయితీగా చేసే కృషికి శాశ్వత ఫలితం.' },
    ashtama: { name: 'అష్టమ శని', text: 'చంద్ర రాశికి 8వ స్థానంలో శని, సుమారు రెండున్నర సంవత్సరాలు: ఆరోగ్యం, ప్రయాణాలు, ఆర్థిక విషయాల్లో జాగ్రత్త, ఆధ్యాత్మిక సాధన పెంచే సమయం.' },
    ardhashtama: { name: 'అర్ధాష్టమ శని', text: 'చంద్ర రాశికి 4వ స్థానంలో శని, సుమారు రెండున్నర సంవత్సరాలు: ఇల్లు, తల్లి, ఆస్తి విషయాలు, మనశ్శాంతిపై అదనపు శ్రద్ధ.' },
  },
  signNature: [
    'ఉత్సాహవంతులు, ధైర్యవంతులు, ముందుండి నడిపించేవారు',
    'స్థిరమైనవారు, ఓర్పు, విశ్వాసం, సుఖం, సౌందర్యం పట్ల ఇష్టం',
    'జిజ్ఞాస, చమత్కారం, సర్దుకుపోయే గుణం, సహజ వాక్చాతుర్యం',
    'ఆప్యాయత, అంతర్దృష్టి, ఇల్లు, కుటుంబం పట్ల గాఢ అనుబంధం',
    'హుందాతనం, ఉదారత, ఆత్మవిశ్వాసం, సహజ నాయకత్వం',
    'ఆచరణాత్మకం, జాగ్రత్త, సహాయ గుణం, సూక్ష్మ దృష్టి',
    'సమతుల్యం, న్యాయబుద్ధి, సౌమ్యత, అందరితో కలిసిపోయే గుణం',
    'తీవ్రత, పట్టుదల, లోతైన గ్రహణశక్తి, తట్టుకునే శక్తి',
    'ఆశావాదం, సిద్ధాంతబద్ధత, విద్య, ధర్మం పట్ల ఆసక్తి',
    'క్రమశిక్షణ, ఆశయం, బాధ్యత, కష్టపడే గుణం',
    'స్వతంత్రత, మానవతావాదం, కొత్త ఆలోచనలు',
    'కరుణ, ఊహాశక్తి, భక్తి, సౌమ్యత',
  ],
  nakshatraNature: [
    'వేగం, సహాయ గుణం, సహజ వైద్య గుణం',
    'బాధ్యత, పట్టుదల, పెద్ద బాధ్యతలు మోయగల శక్తి',
    'పదునైన బుద్ధి, నిజాయితీ, గందరగోళాన్ని చేధించే శక్తి',
    'ఆకర్షణ, సృజనాత్మకత, వృద్ధి, సమృద్ధి',
    'జిజ్ఞాస, సౌమ్యత, ఎప్పుడూ జ్ఞానాన్వేషణ',
    'ఆలోచనాపరులు, తీవ్రత, కష్టాల తర్వాత కొత్తగా ఎదిగే శక్తి',
    'దయ, ఆశ, తిరిగి నిలదొక్కుకునే గుణం',
    'పోషించే గుణం, భక్తి, నమ్మకం — అత్యంత శుభ నక్షత్రాల్లో ఒకటి',
    'గ్రహణశక్తి, వ్యూహం, లోతైన అంతర్దృష్టి',
    'హుందాతనం, సంప్రదాయం, పితృదేవతల పట్ల గౌరవం',
    'ఆప్యాయత, సృజనాత్మకత, వేడుకలు, సుఖం పట్ల ఇష్టం',
    'ఉదారత, నమ్మకం, మంచి స్నేహితులు, భాగస్వాములు',
    'చేతి నైపుణ్యం, వనరుల వినియోగం, చమత్కారం',
    'కళాత్మకత, సొగసు, అందమైనవి నిర్మించే గుణం',
    'స్వతంత్రత, సర్దుకుపోయే గుణం, వ్యాపార నైపుణ్యం',
    'లక్ష్య సాధన, ఓర్పు, దీర్ఘకాలంలో విజయం',
    'భక్తి, స్నేహభావం, దూర ప్రాంతాల్లో విజయం',
    'రక్షించే గుణం, సమర్థత, సహజ పెద్దరికం',
    'లోతైన ఆలోచన, అన్వేషణ, మూలాల వరకు వెళ్లే గుణం',
    'ఆత్మవిశ్వాసం, ఒప్పించే శక్తి, ఓటమి ఎరుగని గుణం',
    'సిద్ధాంతబద్ధత, పట్టుదల, చివరకు విజయం',
    'మంచి శ్రోతలు, విద్వాంసులు, జ్ఞానానికి గౌరవం',
    'సంపద, సంగీతాభిరుచి, ఉదారత',
    'స్వతంత్రత, వైద్య గుణం, పరిశోధనాసక్తి',
    'ఆదర్శవాదం, తీవ్రత, ఒక లక్ష్యానికి అంకితం',
    'జ్ఞానం, ప్రశాంతత, ఒత్తిడిలోనూ స్థిరత్వం',
    'సౌమ్యత, ఆప్యాయత, ఇతరులకు మార్గదర్శి, రక్షకులు',
  ],
  lagnaTitle: 'లగ్నం',
  moonTitle: 'చంద్ర రాశి',
  starTitle: 'జన్మ నక్షత్రం',
  lagnaText: 'బయటకు మీరు {x}.',
  moonText: 'మనసులో మీరు {x}.',
  starText: 'మీ నక్షత్ర స్వభావం: {x}.',
};

const CHART_TEXT: Partial<Record<Lang, ChartText>> = { en, te, kn, ta, ml, hi, mr };

/** The chart-reading wording for `lang`, falling back to English. */
export const chartText = (lang: Lang): ChartText => CHART_TEXT[lang] ?? en;
