// How each region keeps the festival poojas. The core vidhanam (dhyanam, avahanam, the sixteen
// upacharas, aarti) is shared; what differs is the festival's local name, its customs, what is kept
// ready and what is offered — and, for the solar-calendar regions, sometimes the date itself.
// Customs vary from family to family within a region too; the UI says so.
import type { TraditionId } from './types';

export type Region = 'te' | 'kn' | 'ta' | 'ml' | 'mr' | 'gu' | 'bn' | 'or' | 'north';

type Text = { en: string; te?: string };

export const REGIONS: Array<{ id: Region; en: string; te: string }> = [
  { id: 'te', en: 'Telugu', te: 'తెలుగు' },
  { id: 'kn', en: 'Karnataka', te: 'కర్ణాటక' },
  { id: 'ta', en: 'Tamil Nadu', te: 'తమిళనాడు' },
  { id: 'ml', en: 'Kerala', te: 'కేరళ' },
  { id: 'mr', en: 'Maharashtra', te: 'మహారాష్ట్ర' },
  { id: 'gu', en: 'Gujarat', te: 'గుజరాత్' },
  { id: 'bn', en: 'Bengal', te: 'బెంగాల్' },
  { id: 'or', en: 'Odisha', te: 'ఒడిశా' },
  { id: 'north', en: 'North India', te: 'ఉత్తర భారతం' },
];

/** The region whose customs to show first, from the Panchangam tradition chosen at setup. */
export const regionFor = (t: TraditionId): Region => t;

export interface RegionalCustom {
  /** What the festival is called there. */
  name: Text;
  customs: Text[];
  /** Extra things to keep ready, on top of the common samagri. */
  samagri?: Text[];
  naivedyam?: Text[];
  /** Set when the region keeps it on a different day from the dates shown above. */
  dateNote?: Text;
}

type ByRegion = Partial<Record<Region, RegionalCustom>>;

const VINAYAKA_TE: RegionalCustom = {
  name: { en: 'Vinayaka Chavithi', te: 'వినాయక చవితి' },
  customs: [
    { en: 'A clay idol is installed in a mandapam with a frame of fruits and corn hung above it (palavelli).', te: 'మట్టి విగ్రహాన్ని మండపంలో ప్రతిష్ఠిస్తారు; పైన పండ్లు, మొక్కజొన్న కండెలతో పాలవెల్లి కడతారు.' },
    { en: 'Twenty-one kinds of leaves (ekavimshati patri) are offered with the names of Ganapathi.', te: 'ఏకవింశతి పత్రాలతో (21 రకాల ఆకులు) గణపతి నామాలతో పూజిస్తారు.' },
    { en: 'The Vinayaka Vratakalpam is read along with the Shamantakamani story; afterwards akshatas are placed on the head so that seeing the moon that night brings no false blame.', te: 'వినాయక వ్రతకల్పం, శమంతకోపాఖ్యానం చదివి తలపై అక్షతలు వేసుకుంటారు — ఆ రాత్రి చంద్రుడిని చూసినా నీలాపనిందలు రావని నమ్మకం.' },
    { en: 'Nimajjanam on the 3rd, 5th, 9th or 11th day, as the family keeps it.', te: 'కుటుంబ ఆచారం ప్రకారం 3, 5, 9 లేదా 11వ రోజు నిమజ్జనం.' },
  ],
  samagri: [{ en: '21 kinds of patri', te: '21 రకాల పత్రి' }, { en: 'Palavelli frame, fruits, corn cobs', te: 'పాలవెల్లి, పండ్లు, మొక్కజొన్న కండెలు' }],
  naivedyam: [{ en: 'Undrallu, kudumulu', te: 'ఉండ్రాళ్ళు, కుడుములు' }, { en: 'Panakam, vadapappu', te: 'పానకం, వడపప్పు' }],
};

const GANAPATHI: ByRegion = {
  te: {
    ...VINAYAKA_TE,
    customs: [...VINAYAKA_TE.customs, { en: 'In Telangana, large community pandals and the Khairatabad Ganesh in Hyderabad; processions on the immersion day.', te: 'తెలంగాణలో హైదరాబాద్ ఖైరతాబాద్ గణేశుడు, పెద్ద మండపాలు; నిమజ్జనం రోజు ఊరేగింపులు.' }],
  },
  kn: {
    name: { en: 'Gowri–Ganesha Habba' },
    customs: [
      { en: 'Swarna Gowri vrata is kept the day before Ganesha Chaturthi; Gowri is welcomed as the daughter of the house.' },
      { en: 'Married women give each other baagina — a gift tray of turmeric, kumkum, bangles, a blouse piece, coconut and grains.' },
      { en: 'Ganesha is installed and worshipped the next day; immersion together with Gowri, often on the 3rd or 5th day.' },
    ],
    samagri: [{ en: 'Gowri idol, baagina trays' }],
    naivedyam: [{ en: 'Modaka, kadubu, chakkuli' }, { en: 'Panchakajjaya' }],
  },
  ta: {
    name: { en: 'Vinayagar Chathurthi' },
    customs: [
      { en: 'A small clay idol, usually with a paper umbrella (kudai), is bought on the day and worshipped at home.' },
      { en: 'Arugampul (durva grass) and an erukku (crown flower) garland are offered.' },
      { en: 'The idol is immersed in a well, tank or the sea within one to three days.' },
    ],
    samagri: [{ en: 'Paper umbrella, erukku garland, arugampul' }],
    naivedyam: [{ en: 'Kozhukattai — sweet (coconut-jaggery) and savoury' }, { en: 'Sundal' }],
  },
  ml: {
    name: { en: 'Vinayaka Chathurthi' },
    customs: [
      { en: 'Ashtadravya Ganapathi Homam — an offering of eight items into the fire — is done in temples and many homes.' },
      { en: 'Temples hold aanayoottu (feeding of elephants), most famously at Vadakkunnathan, Thrissur.' },
    ],
    naivedyam: [{ en: 'Modakam, unniyappam' }, { en: 'Ada' }],
  },
  mr: {
    name: { en: 'Ganeshotsav' },
    customs: [
      { en: 'Ganpati is welcomed home with music and "Ganpati Bappa Morya", installed with pranapratishtha.' },
      { en: 'Aarti morning and evening with family and neighbours.' },
      { en: 'Kept for 1½, 5, 7 or 10 days (to Anant Chaturdashi), then visarjan with a procession.' },
      { en: 'In many homes Gauri (Mahalakshmi) is also brought home for three days during the festival.' },
    ],
    samagri: [{ en: 'Durva bundles of 21, red flowers (jaswand/hibiscus)' }],
    naivedyam: [{ en: 'Ukadiche modak (steamed, 21 of them)' }, { en: 'Puran poli' }],
  },
  north: {
    name: { en: 'Ganesh Chaturthi' },
    customs: [
      { en: 'Celebrated mainly at home or in community pandals; Ganesh is also worshipped with Lakshmi at Diwali.' },
      { en: 'Seeing the moon on Chaturthi night is avoided (Kalank Chauth).' },
    ],
    naivedyam: [{ en: 'Modak, motichoor laddoo' }],
  },
};

const VARALAKSHMI_TE: RegionalCustom = {
  name: { en: 'Varalakshmi Vratam', te: 'వరలక్ష్మీ వ్రతం' },
  customs: [
    { en: 'Kept on the Friday before Shravana Purnima: a kalasham is decorated as the Goddess, often with a silver face (mukham).', te: 'శ్రావణ పూర్ణిమ ముందు శుక్రవారం: కలశాన్ని అమ్మవారిగా అలంకరిస్తారు, తరచూ వెండి ముఖంతో.' },
    { en: 'A yellow thread with nine knots (toramu) is worshipped and tied on the right wrist.', te: 'తొమ్మిది ముడుల పసుపు తోరాన్ని పూజించి కుడి చేతికి కట్టుకుంటారు.' },
    { en: 'The vrata katha (Charumathi\'s story) is read; married women are given vayanam.', te: 'చారుమతి కథ చదివి, ముత్తైదువలకు వాయనం ఇస్తారు.' },
    { en: 'Deepavali: Lakshmi pooja in the evening with rows of deepams.', te: 'దీపావళి: సాయంత్రం దీపాలతో లక్ష్మీ పూజ.' },
  ],
  samagri: [{ en: 'Kalasham with mukham, yellow thread for toramu', te: 'కలశం, అమ్మవారి ముఖం, తోరానికి పసుపు దారం' }, { en: 'Vayanam items (blouse piece, turmeric, kumkum, fruit)', te: 'వాయనం (రవిక గుడ్డ, పసుపు, కుంకుమ, పండ్లు)' }],
  naivedyam: [{ en: 'Pulagam, payasam, nine kinds of pindivantalu where the family keeps it', te: 'పులగం, పాయసం, ఆచారం ఉంటే తొమ్మిది రకాల పిండివంటలు' }],
};

const LAKSHMI: ByRegion = {
  te: VARALAKSHMI_TE,
  kn: {
    name: { en: 'Varamahalakshmi Habba' },
    customs: [
      { en: 'On the same Friday, a kalasha is dressed as the Goddess with a decorated face; a sacred thread (dora) is tied on the wrist.' },
      { en: 'Women invite each other home and exchange baagina.' },
    ],
    naivedyam: [{ en: 'Holige, payasa, kosambari' }],
  },
  ta: {
    name: { en: 'Varalakshmi Nombu' },
    customs: [
      { en: 'The Goddess is invoked in a kalasam decorated with a face, the evening before or on the Friday morning.' },
      { en: 'A yellow nombu charadu (thread) is tied on the wrist after the pooja.' },
      { en: 'At Deepavali the main custom is the early-morning oil bath on Naraka Chaturdashi; Lakshmi–Kubera pooja is done in some homes.' },
    ],
    naivedyam: [{ en: 'Kozhukattai, sweet pongal, vadai' }],
  },
  ml: {
    name: { en: 'Lakshmi pooja' },
    customs: [
      { en: 'Lakshmi is worshipped mainly on Fridays; Deepavali is quieter in Kerala, with lamps and sweets.' },
      { en: 'Some families keep Varalakshmi Vratam as in the neighbouring states.' },
    ],
  },
  mr: {
    name: { en: 'Lakshmi Pujan' },
    customs: [
      { en: 'Done on the Diwali Amavasya evening; account books, coins and a new broom (seen as a form of Lakshmi) are worshipped.' },
      { en: 'Kojagiri Purnima (Ashvin Purnima) night: Lakshmi is worshipped and saffron milk is kept in the moonlight.' },
    ],
    naivedyam: [{ en: 'Lahya-batasha (puffed rice and sugar drops), Diwali faral' }],
  },
  north: {
    name: { en: 'Diwali Lakshmi–Ganesh Puja' },
    customs: [
      { en: 'On Kartik Amavasya in the evening (pradosh kaal, ideally the fixed Vrishabha lagna), with new Lakshmi and Ganesh idols each year.' },
      { en: 'Traders worship new account books (bahi-khata); diyas are kept burning through the night and doors left open to welcome Lakshmi.' },
    ],
    naivedyam: [{ en: 'Kheel-batashe, sweets' }],
  },
};

const UGADI: ByRegion = {
  te: {
    name: { en: 'Ugadi', te: 'ఉగాది' },
    customs: [
      { en: 'Oil bath, new clothes and mango-leaf torans on the doors.', te: 'అభ్యంగన స్నానం, కొత్త బట్టలు, గుమ్మాలకు మామిడి తోరణాలు.' },
      { en: 'Ugadi pachadi with six tastes — neem flowers, new jaggery, tamarind, raw mango, salt and chilli — eaten first.', te: 'షడ్రుచుల ఉగాది పచ్చడి — వేపపూత, కొత్త బెల్లం, చింతపండు, మామిడి, ఉప్పు, కారం — ముందుగా తింటారు.' },
      { en: 'Panchanga shravanam — hearing the new year\'s predictions — in the evening.', te: 'సాయంత్రం పంచాంగ శ్రవణం.' },
    ],
    naivedyam: [{ en: 'Ugadi pachadi, bobbatlu (bakshalu), pulihora', te: 'ఉగాది పచ్చడి, బొబ్బట్లు (భక్ష్యాలు), పులిహోర' }],
  },
  kn: {
    name: { en: 'Ugadi (Yugadi)' },
    customs: [
      { en: 'Bevu-bella — neem leaves or flowers with jaggery — is shared as the first taste of the year.' },
      { en: 'Panchanga is read at home or in the temple.' },
    ],
    naivedyam: [{ en: 'Bevu-bella, obbattu (holige)' }],
  },
  mr: {
    name: { en: 'Gudi Padwa' },
    customs: [
      { en: 'A gudi is raised at the door or window: a bamboo staff with a bright silk cloth, neem and mango leaves, a garland of sugar crystals and flowers, topped with an upturned copper or silver pot.' },
      { en: 'Neem leaves with jaggery are eaten; rangoli at the doorstep.' },
    ],
    samagri: [{ en: 'Bamboo staff, silk cloth, copper/silver pot, gathi (sugar-crystal garland)' }],
    naivedyam: [{ en: 'Shrikhand-puri, puran poli' }],
  },
  ta: {
    name: { en: 'Puthandu (Tamil New Year)' },
    dateNote: { en: 'Kept on the solar date, Chithirai 1 (about 14 April) — not Chaitra Shukla Pratipada, so the dates above do not apply.' },
    customs: [
      { en: 'A tray of fruits, flowers, jewellery and a mirror is arranged the night before and seen first on waking.' },
      { en: 'The new panchangam is read; visit to the temple.' },
    ],
    naivedyam: [{ en: 'Mango pachadi (sweet, sour and bitter), vadai, payasam' }],
  },
  ml: {
    name: { en: 'Vishu' },
    dateNote: { en: 'Kept on the solar date, Medam 1 (about 14–15 April) — not Chaitra Shukla Pratipada, so the dates above do not apply.' },
    customs: [
      { en: 'Vishukkani is arranged the night before — konna (golden shower) flowers, a golden cucumber, rice, fruits, a bell-metal mirror, a lit lamp and Krishna\'s picture — and seen first thing on waking, eyes closed until then.' },
      { en: 'Elders give Vishukkaineetam (coins) to the younger ones; Vishu sadya at noon.' },
    ],
    samagri: [{ en: 'Konna flowers, golden cucumber, bell-metal mirror (vaal kannadi), uruli' }],
  },
  north: {
    name: { en: 'Chaitra Navratri begins (Nav Samvatsar)' },
    customs: [
      { en: 'Ghatasthapana for Chaitra Navratri; the Hindu new year (Vikram Samvat) begins.' },
      { en: 'In some places neem leaves with misri are eaten on the first day.' },
    ],
  },
};

const DURGA: ByRegion = {
  te: {
    name: { en: 'Dasara Navaratri (and Bathukamma)', te: 'దసరా నవరాత్రులు, బతుకమ్మ' },
    customs: [
      { en: 'The Goddess is decorated in a different alankaram each day, as at Vijayawada Kanaka Durga temple.', te: 'విజయవాడ కనకదుర్గమ్మ వలె రోజుకో అలంకారం.' },
      { en: 'Many homes arrange a Bommala Koluvu (doll display).', te: 'చాలా ఇళ్ళలో బొమ్మల కొలువు.' },
      { en: 'Saraswati pooja on Moola nakshatra, Ayudha pooja on Navami; on Vijayadashami, Shami (jammi) pooja and jammi leaves exchanged as gold.', te: 'మూలా నక్షత్రాన సరస్వతీ పూజ, నవమి నాడు ఆయుధ పూజ; విజయదశమి శమీ పూజ, జమ్మి ఆకులు బంగారంగా ఇచ్చిపుచ్చుకోవడం.' },
      { en: 'In Telangana, for nine days, from Engili Pula Bathukamma on Mahalaya Amavasya to Saddula Bathukamma on Durgashtami, women stack seasonal flowers — tangedu, gunuka, banti — into a cone-shaped Bathukamma.', te: 'తెలంగాణలో మహాలయ అమావాస్య ఎంగిలి పూల బతుకమ్మ నుండి దుర్గాష్టమి సద్దుల బతుకమ్మ వరకు తొమ్మిది రోజులు తంగేడు, గునుక, బంతి పూలతో బతుకమ్మ పేరుస్తారు.' },
      { en: 'They sing and dance in circles around it in the evening, then float it in a tank or pond.', te: 'సాయంత్రం చుట్టూ తిరుగుతూ పాటలు పాడి, చెరువులో నిమజ్జనం చేస్తారు.' },
      { en: 'In Telangana on Vijayadashami, seeing the Palapitta (Indian roller) bird and Alai Balai embraces.', te: 'తెలంగాణలో విజయదశమి నాడు పాలపిట్ట దర్శనం, అలయ్ బలయ్.' },
    ],
    samagri: [{ en: 'For Bathukamma: tangedu, gunuka, banti and other seasonal flowers; a brass plate (tambalam) for the base', te: 'తంగేడు, గునుక, బంతి పూలు; బతుకమ్మ పేర్చడానికి తాంబాలం' }],
    naivedyam: [{ en: 'In Telangana: saddulu — nine kinds of flavoured rice (on Saddula Bathukamma), malida', te: 'తెలంగాణలో: సద్దులు — తొమ్మిది రకాల సద్దులు, మలీద' }],
  },
  kn: {
    name: { en: 'Navaratri (Mysuru Dasara)' },
    customs: [
      { en: 'Bombe Habba — a doll display arranged on steps.' },
      { en: 'Saraswati pooja on Moola nakshatra; Ayudha pooja on Navami, when tools, vehicles and instruments are worshipped.' },
      { en: 'Vijayadashami: banni (shami) leaves are exchanged; the Jamboo Savari procession in Mysuru.' },
    ],
  },
  ta: {
    name: { en: 'Navarathri Golu' },
    customs: [
      { en: 'Dolls are arranged on an odd number of steps (padi); neighbours are invited each evening and given vettalai-pakku with kumkum and fruit.' },
      { en: 'Saraswati Pooja on Navami with books and instruments before the Goddess, together with Ayudha Pooja.' },
      { en: 'Vijayadashami is the day for Vidyarambham — a child\'s first letters.' },
    ],
    naivedyam: [{ en: 'A different sundal each evening' }],
  },
  ml: {
    name: { en: 'Navaratri — Pooja Vaypu' },
    customs: [
      { en: 'On Durgashtami evening books and tools are placed before Saraswati (pooja vaypu) and are not used until Vijayadashami.' },
      { en: 'Vijayadashami: pooja eduppu (taking them back) and Vidyarambham — children write their first letters in rice, guided by an elder or teacher.' },
    ],
  },
  mr: {
    name: { en: 'Navratri and Dasara' },
    customs: [
      { en: 'Ghatasthapana on the first day: an earthen pot over sown grains; a fresh flower garland is added each day.' },
      { en: 'Gondhal and jagaran in many families; Mahalakshmi worship on Ashtami.' },
      { en: 'Dasara: apta leaves are exchanged as "gold" (sone) and Seemollanghan is observed.' },
    ],
  },
  north: {
    name: { en: 'Navratri and Dussehra' },
    customs: [
      { en: 'Nine days of fasting; Kanya puja (Kanjak) on Ashtami or Navami — young girls are worshipped and fed halwa, puri and chana.' },
      { en: 'Ram Lila performances, and Ravana Dahan on Dussehra.' },
      { en: 'In Bengal and the east, Durga Puja in pandals from Shashthi to Dashami.' },
    ],
  },
};

const SARASWATI: ByRegion = {
  te: {
    name: { en: 'Saraswati pooja (Navaratri Moola)', te: 'సరస్వతీ పూజ (నవరాత్రి మూల)' },
    customs: [
      { en: 'Books, pens and instruments are placed before the Goddess on Moola nakshatra of Navaratri.', te: 'నవరాత్రుల మూలా నక్షత్రం నాడు పుస్తకాలు, కలాలు, వాద్యాలు అమ్మవారి ముందు ఉంచుతారు.' },
      { en: 'Aksharabhyasam for small children; many families go to the Gnana Saraswati temple at Basara.', te: 'చిన్నారులకు అక్షరాభ్యాసం; చాలామంది బాసర జ్ఞాన సరస్వతి ఆలయానికి వెళ్తారు.' },
    ],
  },
  kn: { name: { en: 'Saraswati pooja (Navaratri)' }, customs: [{ en: 'Books are kept before the Goddess from Moola nakshatra until Vijayadashami.' }] },
  ta: { name: { en: 'Saraswati Pooja' }, customs: [{ en: 'On Navami, with Ayudha Pooja; books are taken back and a child\'s Vidyarambham is done on Vijayadashami.' }] },
  ml: { name: { en: 'Pooja Vaypu and Vidyarambham' }, customs: [{ en: 'Books placed before Saraswati on Durgashtami; first letters written in rice on Vijayadashami.' }] },
  mr: { name: { en: 'Saraswati Pujan' }, customs: [{ en: 'Saraswati is invoked on Moola in Navratri; on Dasara children draw a Saraswati figure on their slates and worship it.' }] },
  north: {
    name: { en: 'Vasant Panchami' },
    customs: [
      { en: 'Magha Shukla Panchami: yellow clothes, yellow flowers and yellow sweets; students place their books before the Goddess.' },
      { en: 'Pandals in Bengal and Bihar; a common day for a child\'s first writing.' },
    ],
    naivedyam: [{ en: 'Kesari (saffron) rice, boondi, yellow sweets' }],
  },
};

const KRISHNA: ByRegion = {
  te: {
    name: { en: 'Krishnashtami', te: 'కృష్ణాష్టమి' },
    customs: [
      { en: 'Little footprints are drawn in rice flour from the doorway to the pooja room.', te: 'గుమ్మం నుండి పూజగది వరకు బియ్యప్పిండితో చిన్ని పాదాలు వేస్తారు.' },
      { en: 'Uttiyadi the next day — a pot of curd hung high is broken.', te: 'మరుసటి రోజు ఉట్టి కొట్టడం.' },
    ],
    naivedyam: [{ en: 'Butter, atukulu with jaggery, milk sweets', te: 'వెన్న, బెల్లం అటుకులు, పాల మిఠాయిలు' }],
  },
  kn: {
    name: { en: 'Gokulashtami' },
    customs: [{ en: 'Krishna\'s footprints at the doorway; midnight pooja; at Udupi the festival continues with Vitla Pindi the next day.' }],
    naivedyam: [{ en: 'Chakkuli, kodubale, unde (laddus)' }],
  },
  ta: {
    name: { en: 'Gokulashtami / Sri Jayanthi' },
    customs: [{ en: 'Footprints drawn from the doorway; the pooja is usually done in the evening.' }],
    naivedyam: [{ en: 'Seedai, murukku, aval, butter' }],
  },
  ml: {
    name: { en: 'Ashtami Rohini' },
    dateNote: { en: 'Kept on the day of Rohini nakshatra with Ashtami in the solar month of Chingam, which can differ from the dates above.' },
    customs: [{ en: 'Shobha Yatra — processions of children dressed as Krishna and Radha; special celebrations at Guruvayur.' }],
    naivedyam: [{ en: 'Paal payasam, unniyappam' }],
  },
  mr: {
    name: { en: 'Gokulashtami and Dahi Handi' },
    customs: [{ en: 'Midnight birth celebration; next day Dahi Handi — human pyramids break a pot of curd hung high.' }],
    naivedyam: [{ en: 'Gopalkala (poha with curd, cucumber and spices)' }],
  },
  north: {
    name: { en: 'Janmashtami' },
    customs: [
      { en: 'Fast until midnight, when the infant Krishna is bathed with panchamrit and placed in a decorated cradle (jhula).' },
      { en: 'Smarta families follow Ashtami at midnight; Vaishnava (ISKCON and others) may keep the next day by Rohini.' },
    ],
    naivedyam: [{ en: 'Panjiri, panchamrit, makhan-mishri' }],
  },
};

const SANKRANTI_TE: RegionalCustom = {
  name: { en: 'Sankranti (Bhogi, Sankranti, Kanuma)', te: 'సంక్రాంతి (భోగి, సంక్రాంతి, కనుమ)' },
  customs: [
    { en: 'Bhogi: a bonfire of old things at dawn; in the evening bhogi pallu (regi fruits with coins and flowers) are poured over children.', te: 'భోగి: తెల్లవారుజామున భోగి మంటలు; సాయంత్రం పిల్లలకు భోగి పళ్ళు పోస్తారు.' },
    { en: 'Sankranti: muggulu with gobbemmalu, offerings to ancestors, Haridasu and Gangireddu at the door.', te: 'సంక్రాంతి: గొబ్బెమ్మలతో ముగ్గులు, పితృ తర్పణం, హరిదాసులు, గంగిరెద్దులు.' },
    { en: 'Kanuma: cattle are bathed, decorated and worshipped.', te: 'కనుమ: పశువులకు స్నానం, అలంకరణ, పూజ.' },
  ],
  naivedyam: [{ en: 'Pongali, ariselu, chakkilalu', te: 'పొంగలి, అరిసెలు, చక్కిలాలు' }],
};

const SURYA: ByRegion = {
  te: {
    ...SANKRANTI_TE,
    customs: [...SANKRANTI_TE.customs, { en: 'In Telangana, kite flying is a big part of the day, especially in Hyderabad.', te: 'తెలంగాణలో, ముఖ్యంగా హైదరాబాద్‌లో గాలిపటాల పండుగ.' }],
    naivedyam: [...SANKRANTI_TE.naivedyam!, { en: 'In Telangana: sakinalu, nuvvula laddu', te: 'తెలంగాణలో: సకినాలు, నువ్వుల లడ్డు' }],
  },
  kn: {
    name: { en: 'Makara Sankranti' },
    customs: [
      { en: 'Ellu-bella — sesame, jaggery, dry coconut, groundnuts and fried gram — is shared with sugar figures (sakkare acchu).' },
      { en: 'In villages cattle are decorated and led across a small fire (kichchu haayisuvudu).' },
    ],
    naivedyam: [{ en: 'Ellu-bella, sakkare acchu, pongal' }],
  },
  ta: {
    name: { en: 'Pongal' },
    customs: [
      { en: 'Four days: Bhogi, Thai Pongal, Mattu Pongal and Kaanum Pongal.' },
      { en: 'On Thai Pongal, rice is boiled with milk in a new pot tied with a turmeric plant, outdoors facing the sun; everyone calls "Pongalo Pongal" as it boils over.' },
      { en: 'Mattu Pongal honours the cattle; Kaanum Pongal is for visiting family.' },
    ],
    samagri: [{ en: 'New earthen or brass pot, turmeric plant, sugarcane' }],
    naivedyam: [{ en: 'Sakkarai pongal, ven pongal, sugarcane' }],
  },
  ml: {
    name: { en: 'Makara Sankranti — Makaravilakku' },
    customs: [{ en: 'The day of Makaravilakku at Sabarimala; at home it is kept simply with a lamp and Surya namaskaram.' }],
  },
  mr: {
    name: { en: 'Makar Sankrant' },
    customs: [
      { en: 'Tilgul (sesame-jaggery sweets) is given with the words "tilgul ghya, goad goad bola".' },
      { en: 'Married women hold haldi-kunku and exchange small gifts (vaan); black clothes are worn; kites are flown.' },
    ],
    naivedyam: [{ en: 'Tilgul laddoo, gul poli' }],
  },
  north: {
    name: { en: 'Makar Sankranti, Lohri, Uttarayan' },
    customs: [
      { en: 'Lohri (Punjab) the evening before, around a bonfire with sesame, gur and popcorn.' },
      { en: 'Holy dip (Prayagraj and other rivers); khichdi and til laddoo given in charity; kites in Gujarat and Rajasthan.' },
    ],
    naivedyam: [{ en: 'Khichdi, til-gur laddoo, gajak' }],
  },
};

const HANUMAN: ByRegion = {
  te: {
    name: { en: 'Hanuman Jayanti', te: 'హనుమాన్ జయంతి' },
    customs: [
      { en: 'Kept on Vaishakha Bahula Dashami; many complete a 41-day Hanuman deeksha that day, wearing orange or red.', te: 'వైశాఖ బహుళ దశమి నాడు; చాలామంది 41 రోజుల హనుమాన్ దీక్షను ఆ రోజు ముగిస్తారు.' },
      { en: 'Hanuman Chalisa and Sundarakanda parayanam; Kondagattu draws large crowds in Telangana.', te: 'హనుమాన్ చాలీసా, సుందరకాండ పారాయణం; తెలంగాణలో కొండగట్టుకు భక్తులు.' },
    ],
    naivedyam: [{ en: 'Appalu, vadamala, bananas', te: 'అప్పాలు, వడమాల, అరటిపండ్లు' }],
  },
  kn: {
    name: { en: 'Hanuma Jayanti' },
    dateNote: { en: 'Usually kept on Margashira Shukla Trayodashi in Karnataka, which differs from the dates above.' },
    customs: [{ en: 'Hanumad vrata; worship at Anjanadri (Hampi).' }],
  },
  ta: {
    name: { en: 'Hanumath Jayanthi' },
    dateNote: { en: 'Kept on Margazhi Amavasya (with Moola nakshatra) in Tamil Nadu, which differs from the dates above.' },
    customs: [{ en: 'Garlands of vadai (vadai malai) and betel leaves (vetrilai malai); butter is applied to the deity (vennai kappu). Namakkal and Suchindram are famous.' }],
  },
  ml: {
    name: { en: 'Hanuman Jayanti' },
    dateNote: { en: 'Often kept on the Amavasya of Dhanu (Margazhi), as in Tamil Nadu.' },
    customs: [{ en: 'Avil (beaten rice) offerings and Ramayana reading at Hanuman shrines.' }],
  },
  mr: {
    name: { en: 'Hanuman Jayanti' },
    dateNote: { en: 'Kept on Chaitra Purnima at sunrise, the hour of birth.' },
    customs: [{ en: 'Shendur (sindoor) and oil are offered; kirtans from before dawn in Maruti temples.' }],
  },
  north: {
    name: { en: 'Hanuman Jayanti' },
    dateNote: { en: 'Kept on Chaitra Purnima.' },
    customs: [{ en: 'Sunderkand and Hanuman Chalisa recitations; sindoor and a chola (covering) are offered.' }],
    naivedyam: [{ en: 'Boondi laddoo, gur-chana' }],
  },
};

const SUBRAHMANYA: ByRegion = {
  te: {
    name: { en: 'Subrahmanya Shashthi, Nagula Chavithi', te: 'సుబ్రహ్మణ్య షష్ఠి, నాగుల చవితి' },
    customs: [
      { en: 'Nagula Chavithi (Kartika Shukla Chaturthi): milk is poured into an anthill (putta) and the snake deity worshipped.', te: 'నాగుల చవితి (కార్తీక శుద్ధ చవితి): పుట్టలో పాలు పోసి నాగదేవతను పూజిస్తారు.' },
      { en: 'Subrahmanya Shashthi in Margashira; Mopidevi is a well-known temple.', te: 'మార్గశిర సుబ్రహ్మణ్య షష్ఠి; మోపిదేవి ప్రసిద్ధ క్షేత్రం.' },
    ],
    naivedyam: [{ en: 'Chalimidi, chimmili, milk', te: 'చలిమిడి, చిమ్మిలి, పాలు' }],
  },
  kn: {
    name: { en: 'Subramanya Shashti' },
    customs: [{ en: 'Margashira Shukla Shashti; Naga worship and pilgrimage to Kukke Subramanya; Naga Panchami in Shravana.' }],
  },
  ta: {
    name: { en: 'Skanda Shashti, Thaipusam' },
    customs: [
      { en: 'Skanda Shashti: a six-day fast in Aippasi ending with Soorasamharam at Tiruchendur.' },
      { en: 'Thaipusam (Pusam star in Thai): kavadi and paal kudam (milk pots) carried to Murugan temples, especially Palani.' },
    ],
  },
  ml: {
    name: { en: 'Thaipooyam, Skanda Shashti' },
    customs: [{ en: 'Kavadi processions at Subrahmanya temples on Thaipooyam; Shashti fasting.' }],
  },
  mr: { name: { en: 'Kartikeya darshan' }, customs: [{ en: 'Less widely kept; Kartikeya shrines are visited on Kartik Purnima.' }] },
  north: { name: { en: 'Skanda Shashti' }, customs: [{ en: 'Less widely kept in the North; Kartikeya is worshipped mainly as part of Shiva\'s family.' }] },
};

const SHIVA: ByRegion = {
  te: {
    name: { en: 'Karthika masam and Maha Shivaratri', te: 'కార్తీక మాసం, మహాశివరాత్రి' },
    customs: [
      { en: 'Karthika Mondays: fasting, river baths at dawn and deepams; 365 wicks lit on Karthika Purnima.', te: 'కార్తీక సోమవారాలు: ఉపవాసం, తెల్లవారుజామున నదీస్నానం, దీపాలు; కార్తీక పూర్ణిమ నాడు 365 వత్తులు.' },
      { en: 'Maha Shivaratri: abhishekam through the night and jagaranam; Srisailam and Vemulawada draw large crowds.', te: 'మహాశివరాత్రి: రాత్రంతా అభిషేకం, జాగరణ; శ్రీశైలం, వేములవాడకు భక్తులు.' },
    ],
  },
  kn: { name: { en: 'Maha Shivaratri' }, customs: [{ en: 'Night vigil with abhisheka in each of the four yamas; Kartika Somavara deepotsava.' }] },
  ta: {
    name: { en: 'Maha Shivaratri, Karthigai Deepam' },
    customs: [{ en: 'Four kala poojas through Shivaratri night; Karthigai Deepam — rows of lamps at home and the great flame on Tiruvannamalai.' }],
  },
  ml: { name: { en: 'Shivaratri' }, customs: [{ en: 'Night vigil; ancestor rites (bali) at Aluva Manappuram on the riverbank the next morning.' }] },
  mr: { name: { en: 'Shravan Somvar, Mahashivratri' }, customs: [{ en: 'Shravan Mondays with shivamuth — a handful of a different grain offered each Monday; Mahashivratri fast and vigil.' }] },
  north: {
    name: { en: 'Sawan Somvar, Mahashivratri' },
    customs: [{ en: 'Sawan Mondays with bel patra and water offered; Kanwar Yatra carrying Ganga water; Mahashivratri fast and night puja.' }],
    naivedyam: [{ en: 'Thandai, fruits, bhang (in some places)' }],
  },
};

export const REGIONAL_CUSTOMS: Record<string, ByRegion> = {
  ganapathi: GANAPATHI,
  lakshmi: LAKSHMI,
  ugadi: UGADI,
  durga: DURGA,
  saraswati: SARASWATI,
  krishna: KRISHNA,
  surya: SURYA,
  hanuman: HANUMAN,
  subrahmanya: SUBRAHMANYA,
  shiva: SHIVA,
};
