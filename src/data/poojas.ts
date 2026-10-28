// Pooja guides: when each pooja is done (dates computed by the Panchangam engine), what to keep
// ready (samagri), and an outline of the steps. Steps describe the common Telugu household
// practice; mantras are limited to short, universally used verses. Long stotrams come from
// stotras.json (Telugu Wikisource). Family customs vary — the guides say so.
import { findCrossing, sunSidereal } from '../engine/astro';
import type { Activity } from '../engine/muhurta';
import { observancesInRange } from '../engine/observances';
import { solarMonthsBetween } from '../engine/solar';
import { dayPanchang } from '../engine/panchang';
import type { Place } from '../engine/panchang';
import { addDays, civilDateOf, parseCivil, weekdayOf, type CivilDate } from '../engine/tz';
import type { DeityImageId } from './deityImages';

type Text = { en: string; te: string };

export interface PoojaStep {
  title: Text;
  text: string;
  /** Words to say (Telugu script). */
  mantra?: string;
  /** 'sankalpam' steps are filled in from the day's panchangam by the UI. */
  kind?: 'sankalpam';
  /** For the sankalpam: whose pooja, e.g. 'శ్రీ ఉమామహేశ్వర స్వామి'. */
  preeti?: string;
  /** For the sankalpam: a different closing resolve (Shraddha). */
  sankalpaEnding?: string[];
  /** 108-name lists (ids in ashtottarams.ts) to offer at during this step. */
  namavalis?: string[];
  /** A full stotram (id in stotras.json) to recite or sing during this step, shown inline. */
  stotra?: string;
}

export interface Pooja {
  id: string;
  title: Text;
  deity: Text;
  image: DeityImageId;
  when: Text;
  /** Next dates from `from` (computed), with a label. */
  next: (from: CivilDate, place: Place, tradition?: string) => Array<{ date: CivilDate; label: string }>;
  /** Optional shortcut, e.g. to the muhurtam finder. */
  action?: { label: Text; activity: Activity };
  samagri: Text[];
  naivedyam: Text[];
  /** Detailed vidhanam (full shodashopachara). */
  steps: PoojaStep[];
  /** Short daily form: built by shortSteps() from these hints, or given explicitly. */
  short: ShortForm;
  stotras: string[];
  note?: string;
  /** Where a region keeps the festival its own way (e.g. the new year), what replaces the common guide. */
  byTradition?: Partial<Record<string, RegionalGuide>>;
  /** Two observances under one pooja (Purnima / Amavasya): a switch on the page, each replacing parts of the guide. */
  variants?: Array<{ id: string; label: Text; guide: PoojaVariant }>;
}

export type PoojaVariant = Partial<Pick<Pooja, 'when' | 'samagri' | 'naivedyam' | 'steps' | 'short' | 'stotras' | 'note'>>;

export type RegionalGuide = Partial<Pick<Pooja, 'samagri' | 'naivedyam' | 'steps' | 'short' | 'stotras' | 'note'>>;

/** The pooja as kept in this tradition (the common guide when the region has no version of its own). */
export const poojaForTradition = (p: Pooja, tradition?: string): Pooja =>
  ({ ...p, ...(tradition ? p.byTradition?.[tradition] : undefined) });

export interface ShortForm {
  mantra?: string;
  offer?: string;
  chant?: string;
  extra?: PoojaStep[];
  steps?: PoojaStep[];
  /** 108-name lists shown at the Ganapathi prayer and at the chanting step. */
  prayerNames?: string[];
  chantNames?: string[];
  /** Steps after naivedyam & harathi (e.g. a closing song). */
  closing?: PoojaStep[];
}

const MANTRA = {
  vakratunda: 'వక్రతుండ మహాకాయ సూర్యకోటి సమప్రభ ।\nనిర్విఘ్నం కురు మే దేవ సర్వకార్యేషు సర్వదా ॥',
  shuklambaram: 'శుక్లాంబరధరం విష్ణుం శశివర్ణం చతుర్భుజం ।\nప్రసన్నవదనం ధ్యాయేత్ సర్వ విఘ్నోపశాంతయే ॥',
  achamanam: 'ఓం కేశవాయ స్వాహా ।\nఓం నారాయణాయ స్వాహా ।\nఓం మాధవాయ స్వాహా ॥',
  sarvamangala: 'సర్వమంగళ మాంగల్యే శివే సర్వార్థ సాధికే ।\nశరణ్యే త్ర్యంబకే గౌరి నారాయణి నమోస్తుతే ॥',
  panchakshari: 'ఓం నమః శివాయ',
  mrityunjaya: 'ఓం త్ర్యంబకం యజామహే సుగంధిం పుష్టివర్ధనమ్ ।\nఉర్వారుకమివ బంధనాన్ మృత్యోర్ముక్షీయ మామృతాత్ ॥',
  saraswati: 'సరస్వతి నమస్తుభ్యం వరదే కామరూపిణి ।\nవిద్యారంభం కరిష్యామి సిద్ధిర్భవతు మే సదా ॥',
  rama: 'శ్రీ రామ రామ రామేతి రమే రామే మనోరమే ।\nసహస్రనామ తత్తుల్యం రామనామ వరాననే ॥',
  krishna: 'కృష్ణాయ వాసుదేవాయ హరయే పరమాత్మనే ।\nప్రణత క్లేశనాశాయ గోవిందాయ నమో నమః ॥',
  surya: 'జపాకుసుమ సంకాశం కాశ్యపేయం మహాద్యుతిమ్ ।\nతమోఽరిం సర్వపాపఘ్నం ప్రణతోఽస్మి దివాకరమ్ ॥',
  shani: 'నీలాంజన సమాభాసం రవిపుత్రం యమాగ్రజమ్ ।\nఛాయామార్తాండ సంభూతం తం నమామి శనైశ్చరమ్ ॥',
  narasimha: 'ఉగ్రం వీరం మహావిష్ణుం జ్వలంతం సర్వతోముఖమ్ ।\nనృసింహం భీషణం భద్రం మృత్యుమృత్యుం నమామ్యహమ్ ॥',
  achamanam24: 'ఓం కేశవాయ స్వాహా, ఓం నారాయణాయ స్వాహా, ఓం మాధవాయ స్వాహా ॥\nఓం గోవిందాయ నమః, ఓం విష్ణవే నమః, ఓం మధుసూదనాయ నమః, ఓం త్రివిక్రమాయ నమః,\nఓం వామనాయ నమః, ఓం శ్రీధరాయ నమః, ఓం హృషీకేశాయ నమః, ఓం పద్మనాభాయ నమః,\nఓం దామోదరాయ నమః, ఓం సంకర్షణాయ నమః, ఓం వాసుదేవాయ నమః, ఓం ప్రద్యుమ్నాయ నమః,\nఓం అనిరుద్ధాయ నమః, ఓం పురుషోత్తమాయ నమః, ఓం అధోక్షజాయ నమః, ఓం నారసింహాయ నమః,\nఓం అచ్యుతాయ నమః, ఓం జనార్దనాయ నమః, ఓం ఉపేంద్రాయ నమః, ఓం హరయే నమః, ఓం శ్రీ కృష్ణాయ నమః ॥',
  bhutocchatana: 'ఉత్తిష్ఠంతు భూతపిశాచాః ఏతే భూమి భారకాః ।\nఏతేషామవిరోధేన బ్రహ్మకర్మ సమారభే ॥',
  pranayamam: 'ఓం భూః, ఓం భువః, ఓం సువః, ఓం మహః, ఓం జనః, ఓం తపః, ఓగ్ం సత్యమ్ ।\nఓం తత్సవితుర్వరేణ్యం భర్గో దేవస్య ధీమహి ధియో యో నః ప్రచోదయాత్ ।\nఓమాపో జ్యోతీ రసోఽమృతం బ్రహ్మ భూర్భువస్సువరోమ్ ॥',
  kalasha: 'కలశస్య ముఖే విష్ణుః కంఠే రుద్రః సమాశ్రితః ।\nమూలే తత్ర స్థితో బ్రహ్మా మధ్యే మాతృగణాః స్మృతాః ॥\nకుక్షౌ తు సాగరాః సర్వే సప్తద్వీపా వసుంధరా ।\nఋగ్వేదోఽథ యజుర్వేదః సామవేదో హ్యథర్వణః ।\nఅంగైశ్చ సహితాః సర్వే కలశాంబు సమాశ్రితాః ॥\nగంగే చ యమునే చైవ గోదావరి సరస్వతి ।\nనర్మదే సింధు కావేరి జలేఽస్మిన్ సన్నిధిం కురు ॥',
  deepam: 'సాజ్యం త్రివర్తి సంయుక్తం వహ్నినా యోజితం మయా ।\nగృహాణ మంగళం దీపం త్రైలోక్య తిమిరాపహమ్ ॥',
  naivedyam: 'ఓం భూర్భువస్సువః । ఓం తత్సవితుర్వరేణ్యం భర్గో దేవస్య ధీమహి ధియో యో నః ప్రచోదయాత్ ॥\nసత్యం త్వర్తేన పరిషించామి (సాయంత్రం: ఋతం త్వా సత్యేన పరిషించామి)\nఅమృతమస్తు । అమృతోపస్తరణమసి స్వాహా ।\nఓం ప్రాణాయ స్వాహా, ఓం అపానాయ స్వాహా, ఓం వ్యానాయ స్వాహా,\nఓం ఉదానాయ స్వాహా, ఓం సమానాయ స్వాహా ॥\nమధ్యే మధ్యే పానీయం సమర్పయామి । అమృతాపిధానమసి స్వాహా ।\nహస్తౌ ప్రక్షాళయామి, పాదౌ ప్రక్షాళయామి, శుద్ధాచమనీయం సమర్పయామి ॥',
  tambulam: 'పూగీఫల సమాయుక్తం నాగవల్లీ దళైర్యుతమ్ ।\nకర్పూర చూర్ణ సంయుక్తం తాంబూలం ప్రతిగృహ్యతామ్ ॥',
  pradakshina: 'యానికాని చ పాపాని జన్మాంతర కృతాని చ ।\nతాని తాని వినశ్యంతి ప్రదక్షిణ పదే పదే ॥\nపాపోఽహం పాపకర్మాఽహం పాపాత్మా పాపసంభవః ।\nత్రాహి మాం కృపయా దేవ శరణాగత వత్సల ॥\nఅన్యథా శరణం నాస్తి త్వమేవ శరణం మమ ।\nతస్మాత్ కారుణ్య భావేన రక్ష రక్ష పరమేశ్వర ॥',
  theertham: 'అకాలమృత్యు హరణం సర్వవ్యాధి నివారణమ్ ।\nసమస్త పాపక్షయకరం దేవ పాదోదకం శుభమ్ ॥',
  kshamapana: 'మంత్రహీనం క్రియాహీనం భక్తిహీనం జనార్దన ।\nయత్పూజితం మయా దేవ పరిపూర్ణం తదస్తు మే ॥',
};

/** How each pooja addresses its deity in the upachara formulas ("… నమః, ఆసనం సమర్పయామి"). */
const DEITY: Record<string, { namah: string; preeti: string; female?: boolean }> = {
  'Ganapathi': { namah: 'శ్రీ మహాగణాధిపతయే నమః', preeti: 'శ్రీ మహాగణాధిపతి' },
  'Mahalakshmi': { namah: 'శ్రీ మహాలక్ష్మ్యై నమః', preeti: 'శ్రీ మహాలక్ష్మీ దేవతా', female: true },
  'Varalakshmi Devi': { namah: 'శ్రీ వరలక్ష్మీ దేవతాయై నమః', preeti: 'శ్రీ వరలక్ష్మీ దేవతా', female: true },
  'your ishta devata': { namah: 'శ్రీ ఇష్టదేవతాయై నమః', preeti: 'శ్రీ ఇష్టదేవతా' },
  'Ayyappa Swamy': { namah: 'శ్రీ ధర్మశాస్త్రే నమః', preeti: 'శ్రీ ధర్మశాస్తా (అయ్యప్ప స్వామి)' },
  'Sri Lalitha': { namah: 'శ్రీ లలితా పరమేశ్వర్యై నమః', preeti: 'శ్రీ లలితా పరమేశ్వరీ', female: true },
  'Sri Maha Vishnu': { namah: 'శ్రీ మహావిష్ణవే నమః', preeti: 'శ్రీ మహావిష్ణు' },
  'Satyanarayana Swamy': { namah: 'శ్రీ సత్యనారాయణ స్వామినే నమః', preeti: 'శ్రీ సత్యనారాయణ స్వామి' },
  'Sri Anjaneya Swamy': { namah: 'శ్రీ ఆంజనేయ స్వామినే నమః', preeti: 'శ్రీ ఆంజనేయ స్వామి' },
  'Lord Shiva': { namah: 'శ్రీ ఉమామహేశ్వర స్వామినే నమః', preeti: 'శ్రీ ఉమామహేశ్వర స్వామి' },
  'Goddess Durga': { namah: 'శ్రీ దుర్గా దేవ్యై నమః', preeti: 'శ్రీ దుర్గా దేవీ', female: true },
  'Goddess Saraswati': { namah: 'శ్రీ సరస్వతీ దేవ్యై నమః', preeti: 'శ్రీ సరస్వతీ దేవీ', female: true },
  'Lord Subrahmanya': { namah: 'శ్రీ సుబ్రహ్మణ్యేశ్వర స్వామినే నమః', preeti: 'శ్రీ సుబ్రహ్మణ్యేశ్వర స్వామి' },
  'Sri Rama': { namah: 'శ్రీ సీతారామచంద్ర స్వామినే నమః', preeti: 'శ్రీ సీతారామచంద్ర స్వామి' },
  'Sri Krishna': { namah: 'శ్రీ కృష్ణ పరమాత్మనే నమః', preeti: 'శ్రీ కృష్ణ పరమాత్మ' },
  'Lord Surya': { namah: 'శ్రీ సూర్యనారాయణ స్వామినే నమః', preeti: 'శ్రీ సూర్యనారాయణ స్వామి' },
  'Lord Shani': { namah: 'శ్రీ శనైశ్చరాయ నమః', preeti: 'శ్రీ శనైశ్చర' },
  'Lord Narasimha': { namah: 'శ్రీ లక్ష్మీనృసింహ స్వామినే నమః', preeti: 'శ్రీ లక్ష్మీనృసింహ స్వామి' },
  'Lord Dattatreya': { namah: 'శ్రీ దత్తాత్రేయ స్వామినే నమః', preeti: 'శ్రీ దత్తాత్రేయ స్వామి' },
  'Sri Venkateswara Swamy': { namah: 'శ్రీ వేంకటేశ్వర స్వామినే నమః', preeti: 'శ్రీ వేంకటేశ్వర స్వామి' },
  'Kubera and Lakshmi': { namah: 'శ్రీ లక్ష్మీ కుబేరాభ్యాం నమః', preeti: 'శ్రీ లక్ష్మీ కుబేర' },
};

/**
 * The full shodashopachara vidhanam as laid out in a Telugu vratha kalpam: each step says what to do
 * and the formula to say. Indexes (used by the poojas below to insert their own special steps):
 *  0 preparation · 1 achamanam · 2 Ganapathi prarthana · 3 pranayamam · 4 sankalpam · 5 kalasha pooja ·
 *  6 dhyanam & avahanam · 7 asanam · 8 padyam/arghyam/achamaniyam · 9 snanam · 10 vastram ·
 *  11 gandham, akshatas, pushpam · 12 archana · 13 dhoopam · 14 deepam · 15 naivedyam · 16 tambulam ·
 *  17 neerajanam · 18 mantra pushpam · 19 pradakshina namaskaram · 20 kshamapana · 21 theertham · 22 udvasana
 */
function upacharas(deity: string, extra: { dhyanam?: string; nama?: string; namavali?: string | string[] } = {}): PoojaStep[] {
  const d = DEITY[deity] ?? { namah: '', preeti: '' };
  const n = d.namah;
  const say = (...lines: string[]) => lines.map((l) => `${n} — ${l}`).join('\n');
  const who = deity || 'the deity';
  return [
    { title: { en: 'Preparation', te: 'పూజా సిద్ధత' }, text: `Bathe and wear clean (preferably silk or washed cotton) clothes; apply bottu/namam. Clean the pooja place and draw a muggu. Place ${who} on a raised peetham facing east; sit facing east or north. Arrange on a plate: turmeric, kumkum, akshatas, flowers, sandal, agarbatti, camphor, deepam (on the deity's right), a kalasham or chembu of water with an uddharini, naivedyam, betel leaves with nuts, and fruits. Light the deepam first.` },
    { title: { en: 'Achamanam', te: 'ఆచమనం' }, text: 'Take a little water in the right palm and sip it with each of the first three names (Kesava, Narayana, Madhava); release water from the palm saying Govindaya Namaha, and touch the face, eyes, ears and shoulders as each following name is said.', mantra: MANTRA.achamanam24 },
    { title: { en: 'Ganapathi prarthana & bhutocchatana', te: 'గణపతి ప్రార్థన & భూతోచ్చాటన' }, text: 'Pray to Ganapathi (a turmeric Ganapathi — pasupu Ganapathi — on a betel leaf is common), then throw a few akshatas over the left shoulder to clear the place of obstacles.', mantra: `${MANTRA.shuklambaram}\n${MANTRA.bhutocchatana}` },
    { title: { en: 'Pranayamam', te: 'ప్రాణాయామం' }, text: 'Close the right nostril with the thumb, breathe in through the left; close both and hold while saying the mantra mentally; breathe out through the right. Do this three times.', mantra: MANTRA.pranayamam },
    { title: { en: 'Sankalpam', te: 'సంకల్పం' }, text: 'Take akshatas and a little water in the right palm, cover it with the left, and say the sankalpam. It is filled in below with today\'s panchangam for your location — add your gotram and name. At the end, leave the water and akshatas in the plate.', kind: 'sankalpam', preeti: d.preeti },
    { title: { en: 'Kalasha pooja', te: 'కలశ పూజ' }, text: 'Put gandham, akshatas and a flower in the kalasham (or the water chembu), cover it with the right palm and invoke the sacred rivers into the water. Sprinkle a little of it on the pooja items, the place and yourself.', mantra: MANTRA.kalasha },
    { title: { en: 'Dhyanam & Avahanam', te: 'ధ్యానం & ఆవాహనం' }, text: `Close your eyes and meditate on the form of ${who}; then, holding akshatas and a flower, invite the deity into the image and offer them.`, mantra: [extra.dhyanam, say('ధ్యాయామి, ధ్యానం సమర్పయామి', 'ఆవాహయామి')].filter(Boolean).join('\n') },
    { title: { en: 'Asanam', te: 'ఆసనం' }, text: 'Offer akshatas as a seat.', mantra: say('ఆసనం సమర్పయామి') },
    { title: { en: 'Padyam, Arghyam, Achamaniyam', te: 'పాద్యం, అర్ఘ్యం, ఆచమనీయం' }, text: 'With the uddharini, offer a few drops of water at the feet, then for the hands, then to sip — pouring each into the plate.', mantra: say('పాదయోః పాద్యం సమర్పయామి', 'హస్తయోః అర్ఘ్యం సమర్పయామి', 'ముఖే శుద్ధ ఆచమనీయం సమర్పయామి') },
    { title: { en: 'Snanam (panchamruta snanam)', te: 'స్నానం (పంచామృత స్నానం)' }, text: 'Sprinkle (or, for a metal idol, pour) water as bath. On festival days bathe with milk, curd, ghee, honey and sugar one after another, then clean water; wipe dry.', mantra: say('క్షీరేణ స్నపయామి', 'దధ్నా స్నపయామి', 'ఆజ్యేన స్నపయామి', 'మధునా స్నపయామి', 'శర్కరయా స్నపయామి', 'శుద్ధోదక స్నానం సమర్పయామి', 'స్నానానంతరం శుద్ధ ఆచమనీయం సమర్పయామి') },
    d.female
      ? { title: { en: 'Vastram, Haridra-Kumkuma, Mangalyam', te: 'వస్త్రం, హరిద్రా కుంకుమ, మాంగళ్యం' }, text: 'Offer a new cloth or blouse piece (or akshatas in its place), turmeric and kumkum, the mangalya sutram / nalla pusalu, bangles and ornaments.', mantra: say('వస్త్రయుగ్మం సమర్పయామి', 'హరిద్రా కుంకుమం సమర్పయామి', 'మాంగళ్య సూత్రం సమర్పయామి', 'ఆభరణాని సమర్పయామి') }
      : { title: { en: 'Vastram & Yajnopavitam', te: 'వస్త్రం & యజ్ఞోపవీతం' }, text: 'Offer a new cloth or a pair of cotton vastrams (or akshatas in their place) and the sacred thread, and ornaments.', mantra: say('వస్త్రయుగ్మం సమర్పయామి', 'యజ్ఞోపవీతం సమర్పయామి', 'ఆభరణాని సమర్పయామి') },
    { title: { en: 'Gandham, Akshatas, Pushpam', te: 'గంధం, అక్షతలు, పుష్పాలు' }, text: 'Apply sandal paste, offer akshatas, and adorn with flowers and a garland.', mantra: say('గంధాన్ ధారయామి', 'అక్షతాన్ సమర్పయామి', 'పుష్పైః పూజయామి') },
    { title: { en: 'Archana', te: 'అర్చన (అష్టోత్తర శతనామ పూజ)' }, text: extra.namavali
        ? `Offer a flower, leaf or pinch of akshatas/kumkum at each of the 108 names below${extra.nama ? ` — ${extra.nama}` : ''}. Tap each name as you offer to keep count. End with:`
        : `Offer a flower, leaf or pinch of akshatas/kumkum at each of the 108 names of ${who} from your pooja book${extra.nama ? ` — ${extra.nama}` : ''}. If you do not have the names, chant the deity's mantra 108 times while offering. End with:`,
      mantra: say('అష్టోత్తర శతనామ పూజాం సమర్పయామి'), namavalis: extra.namavali ? [extra.namavali].flat() : undefined },
    { title: { en: 'Dhoopam', te: 'ధూపం' }, text: 'Light agarbatti/sambrani and wave it in circles before the deity, ringing the bell with the left hand.', mantra: say('ధూపమాఘ్రాపయామి') },
    { title: { en: 'Deepam', te: 'దీపం' }, text: 'Show the ghee lamp in circles before the deity, then wash the fingers.', mantra: `${MANTRA.deepam}\n${say('దీపం దర్శయామి')}` },
    { title: { en: 'Naivedyam', te: 'నైవేద్యం' }, text: 'Place the naivedyam (covered with a betel leaf or tulasi) before the deity. Sprinkle water around it, then, with the right hand, wave the food towards the deity as each "svaha" is said. Keep a little water for "madhye madhye paniyam".', mantra: `${MANTRA.naivedyam}\n${say('మహా నైవేద్యం సమర్పయామి')}` },
    { title: { en: 'Tambulam', te: 'తాంబూలం' }, text: 'Offer two betel leaves with nuts (and a fruit and dakshina, if you wish).', mantra: `${MANTRA.tambulam}\n${say('తాంబూలం సమర్పయామి')}` },
    { title: { en: 'Neerajanam (harathi)', te: 'నీరాజనం (హారతి)' }, text: 'Light camphor and wave it clockwise before the deity three times while ringing the bell and singing a mangala harathi; then show it to everyone, who take the warmth to their eyes.', mantra: say('కర్పూర నీరాజనం దర్శయామి') },
    { title: { en: 'Mantra Pushpam', te: 'మంత్ర పుష్పం' }, text: 'Hold flowers and akshatas in folded hands and recite the Mantra Pushpam (in the Stotrams tab), or at least the formula, then offer them at the deity\'s feet.', mantra: say('సువర్ణ దివ్య మంత్రపుష్పం సమర్పయామి') },
    { title: { en: 'Pradakshina namaskaram', te: 'ప్రదక్షిణ నమస్కారం' }, text: 'Go around the deity (or turn clockwise in place) three times with folded hands, then prostrate — men sashtanga, women panchanga namaskaram.', mantra: `${MANTRA.pradakshina}\n${say('ప్రదక్షిణ నమస్కారాన్ సమర్పయామి')}` },
    { title: { en: 'Kshamapana', te: 'క్షమాపణ' }, text: 'With folded hands, ask forgiveness for any mistakes in the mantras, actions or devotion, and dedicate the pooja.', mantra: `${MANTRA.kshamapana}\nఅనయా ధ్యానావాహనాది షోడశోపచార పూజయా భగవాన్ సర్వాత్మకః ${d.preeti || 'శ్రీ దేవ'} సుప్రీతో వరదో భవతు ॥` },
    { title: { en: 'Theertham & prasadam', te: 'తీర్థ ప్రసాదాలు' }, text: 'Take the abhisheka/kalasha water as theertham in the right palm (three sips, with the left hand under it), take akshatas on the head as blessing, and share the prasadam with everyone.', mantra: MANTRA.theertham },
    { title: { en: 'Udvasana', te: 'ఉద్వాసన' }, text: 'At the end (or the next morning for festival poojas), offer akshatas and gently move the idol to signal the deity\'s return to its abode. Clay idols (e.g. Vinayaka Chavithi) are immersed on the chosen day.', mantra: say('యథాస్థానం ప్రవేశయామి, శోభనార్థం పునరాగమనాయ చ') },
  ];
}

/** The short daily form: deepam, Ganapathi prayer, offering with the deity's mantra, chant, naivedyam & harathi. */
export function shortSteps(p: Pooja): PoojaStep[] {
  const f = p.short;
  if (f.steps) return f.steps;
  const deity = p.deity.en;
  return [
    { title: { en: 'Deepam', te: 'దీపారాధన' }, text: `After bathing, light a lamp and an agarbatti before ${deity}.` },
    { title: { en: 'Ganapathi prayer', te: 'గణపతి ప్రార్థన' }, text: f.prayerNames ? 'Fold your hands and pray that the pooja goes without obstacles, then offer akshatas at Ganapathi\'s 108 names (tap each to keep count).' : 'Fold your hands and pray that the pooja goes without obstacles.', mantra: MANTRA.shuklambaram, namavalis: f.prayerNames },
    { title: { en: 'Offering', te: 'సమర్పణ' }, text: `Offer ${f.offer ?? 'flowers, turmeric-kumkum and akshatas'} to ${deity} with this mantra.`, mantra: f.mantra },
    ...(f.extra ?? []),
    { title: { en: 'Chant', te: 'జపం / పారాయణ' }, text: f.chant ?? 'Chant the mantra 11 or 108 times.', namavalis: f.chantNames },
    { title: { en: 'Naivedyam & harathi', te: 'నైవేద్యం & హారతి' }, text: 'Offer fruit, jaggery or a sweet, then show camphor harathi.' },
    ...(f.closing ?? []),
    { title: { en: 'Namaskaram', te: 'నమస్కారం' }, text: 'Bow down, ask forgiveness for any shortcomings, and take the prasadam.', mantra: MANTRA.kshamapana },
  ];
}

// Festivals kept only in some regions need a tradition; the guides default to the Telugu one.
const festival = (id: string, label: string) => (from: CivilDate, place: Place, tradition?: string) =>
  observancesInRange(from, addDays(from, 400), place, tradition ?? 'te').filter((o) => o.id === id).slice(0, 2).map((o) => ({ date: o.date, label }));

/**
 * Dhanurmasam (Margazhi): the solar month of Dhanu, when the 30 Thiruppavai pasurams are sung, one a day.
 * Kerala reckons the month by its own rule. Includes today's pasuram while the month is running.
 */
function dhanurmasam(from: CivilDate, place: Place, tradition?: string) {
  const m = solarMonthsBetween(from, addDays(from, 400), place, tradition === 'ml' ? 'malayalam' : 'tamil').find((x) => x.month === 8 && x.end >= from);
  if (!m) return [];
  const day = Math.round((Date.parse(from) - Date.parse(m.start)) / 86400000) + 1;
  return [
    ...(day >= 1 ? [{ date: from, label: `Today: pasuram ${Math.min(day, 30)} of 30` }] : [{ date: m.start, label: 'Dhanurmasam begins (pasuram 1)' }]),
    ...(addDays(m.start, 26) >= from ? [{ date: addDays(m.start, 26), label: 'Koodaravalli (pasuram 27)' }] : []),
    { date: m.end, label: 'Bhogi — Goda Kalyanam' },
  ];
}

const nextWeekday = (from: CivilDate, wd: number) => addDays(from, (wd - weekdayOf(from) + 7) % 7);


/** Saraswati pooja in Navaratri falls on the day Moola nakshatra prevails (Telugu custom). */
function moolaInNavaratri(from: CivilDate, place: Place) {
  const start = observancesInRange(from, addDays(from, 400), place).find((o) => o.id === 'navaratri');
  if (!start) return [];
  for (let i = 0; i < 10; i++) {
    const d = addDays(start.date, i);
    const p = dayPanchang(d, place);
    if (p.nakshatras.some((n) => n.index === 18 && n.start < p.sunset)) return d >= from ? [{ date: d, label: 'Saraswati Pooja (Moola nakshatra, Navaratri)' }] : [];
  }
  return [];
}

/** Shani Trayodashi: a Saturday with Trayodashi at sunrise. */
function shaniTrayodashi(from: CivilDate, place: Place) {
  for (let i = 0; i < 200; i++) {
    const d = addDays(from, i);
    if (weekdayOf(d) !== 6) continue;
    const t = dayPanchang(d, place).tithis[0].index;
    if (t === 12 || t === 27) return [{ date: d, label: 'Shani Trayodashi' }];
  }
  return [];
}

const monthly = (id: string, label: string, days = 35) => (from: CivilDate, place: Place) =>
  observancesInRange(from, addDays(from, days), place).filter((o) => o.id === id).slice(0, 1).map((o) => ({ date: o.date, label }));

/** Varalakshmi Vratam: the Friday before Shravana Purnima (Telugu tradition). */
function varalakshmi(from: CivilDate, place: Place) {
  return observancesInRange(from, addDays(from, 400), place).filter((o) => o.id === 'raksha-bandhan').slice(0, 1).map((o) => {
    const back = (weekdayOf(o.date) - 5 + 7) % 7 || 7;
    return { date: addDays(o.date, -back), label: 'Varalakshmi Vratam' };
  });
}

/** Ayyappa Mandala season: 41 days from Vrischika Sankranti (Sun enters sidereal Scorpio). */
export function mandalaStart(from: CivilDate, place: Place): CivilDate | null {
  const { y, m, d } = parseCivil(from);
  const t = findCrossing(sunSidereal, 210, new Date(Date.UTC(y, m - 1, d) - 45 * 86400000), 410, 24);
  if (!t) return null;
  const start = civilDateOf(t, place.tz);
  return addDays(start, 41) < from ? mandalaStart(addDays(from, 30), place) : start;
}

// The new year is kept differently in each region; the Telugu Ugadi guide is the common one.
const NEW_YEAR_START = upacharas('your ishta devata').slice(1, 6);
const NEW_YEAR_BY_REGION: Partial<Record<string, RegionalGuide>> = {
  kn: {
    samagri: [
      { en: 'Mango leaf thorana for the doorway; rangoli', te: 'గుమ్మానికి మామిడాకుల తోరణం; రంగోలి' },
      { en: 'Oil for the abhyanga (oil) bath', te: 'అభ్యంగన స్నానానికి నూనె' },
      { en: 'New clothes', te: 'కొత్త బట్టలు' },
      { en: 'Bevu-bella: tender neem leaves and flowers, new jaggery (some add tamarind, raw mango, pepper and salt)', te: 'బేవు-బెల్ల: లేత వేప ఆకులు, వేపపూత, కొత్త బెల్లం (కొందరు చింతపండు, మామిడి, మిరియాలు, ఉప్పు కలుపుతారు)' },
      { en: 'The new year Panchanga', te: 'కొత్త సంవత్సర పంచాంగం' },
      { en: 'Flowers, turmeric, kumkum, akshatas, deepam, camphor', te: 'పూలు, పసుపు, కుంకుమ, అక్షతలు, దీపం, కర్పూరం' },
    ],
    naivedyam: [{ en: 'Bevu-bella', te: 'బేవు-బెల్ల' }, { en: 'Obbattu (holige), mavinakayi chitranna, kosambari, payasa', te: 'ఒబ్బట్టు (హోళిగె), మామిడికాయ చిత్రాన్నం, కోసంబరి, పాయసం' }],
    steps: [
      { title: { en: 'Abhyanga snana', te: 'అభ్యంగన స్నానం' }, text: 'Wake early; elders apply oil to the family and everyone takes an oil bath and wears new clothes. Tie the mango leaf thorana and draw rangoli at the door.' },
      ...NEW_YEAR_START,
      { title: { en: 'Pooja to the family deity', te: 'ఇష్టదేవతా పూజ' }, text: 'Perform pooja to the family deity (and to the new Panchanga, kept before the deity) with flowers, deepam and dhoopa.' },
      { title: { en: 'Bevu-bella', te: 'బేవు-బెల్ల' }, text: 'Offer bevu-bella as naivedya, then everyone eats a little before anything else: the bitter neem and the sweet jaggery stand for the sorrows and joys of the year, to be taken together.' },
      { title: { en: 'Panchanga shravana', te: 'పంచాంగ శ్రవణం' }, text: 'Hear the new year\'s Panchanga read at home or in the temple, usually in the evening. The year name for your location is on the Home screen.' },
      { title: { en: 'Chandra darshana', te: 'చంద్ర దర్శనం' }, text: 'In many Kannada homes the family looks for the first thin crescent of the new moon on the evening after Ugadi (Chandra darshana), when it is visible.' },
      { title: { en: 'Blessings', te: 'ఆశీర్వాదం' }, text: 'Seek blessings of elders and visit the temple.' },
    ],
    short: { offer: 'flowers and bevu-bella', extra: [{ title: { en: 'Bevu-bella', te: 'బేవు-బెల్ల' }, text: 'After naivedya, everyone tastes the neem and jaggery before breakfast.' }], chant: 'Read or hear the new year\'s Panchanga with the family.' },
  },
  mr: {
    samagri: [
      { en: 'For the gudi: a long bamboo staff, a new silk cloth or saree (khan), a copper or silver kalash (tambya)', te: 'గుడి కోసం: పొడవాటి వెదురు కర్ర, కొత్త పట్టు వస్త్రం లేదా చీర, రాగి/వెండి కలశం' },
      { en: 'Neem and mango leaves, a flower garland and a sakhar gathi (sugar-crystal garland)', te: 'వేప, మామిడి ఆకులు, పూలమాల, చక్కెర హారం (సాఖర్ గాఠి)' },
      { en: 'Rangoli colours for the doorstep', te: 'గుమ్మం ముందు రంగోలి రంగులు' },
      { en: 'Oil and utane for the abhyanga snan; new clothes', te: 'అభ్యంగన స్నానానికి నూనె, సున్నిపిండి; కొత్త బట్టలు' },
      { en: 'Neem leaves, jaggery, ajwain, a pinch of hing, soaked chana dal and salt for the neem chutney', te: 'వేప చట్నీకి: వేపాకు, బెల్లం, వాము, ఇంగువ, నానబెట్టిన శనగపప్పు, ఉప్పు' },
      { en: 'Haldi-kunku, akshata, flowers, dhoop, niranjan (lamp), camphor', te: 'పసుపు-కుంకుమ, అక్షతలు, పూలు, ధూపం, దీపం, కర్పూరం' },
    ],
    naivedyam: [{ en: 'Neem chutney (kadulimbachi chutney)', te: 'వేప చట్నీ' }, { en: 'Shrikhand-puri or puran poli', te: 'శ్రీఖండ్-పూరీ లేదా పూరణ్ పోళీ' }],
    steps: [
      { title: { en: 'Abhyanga snan & rangoli', te: 'అభ్యంగన స్నానం & రంగోలి' }, text: 'Wake early, take an oil bath and wear new clothes. Clean the entrance, draw rangoli and tie a toran of mango leaves.' },
      ...NEW_YEAR_START,
      { title: { en: 'Raising the gudi (Brahmadhwaj)', te: 'గుడి నిలపడం (బ్రహ్మధ్వజం)' }, text: 'Wash the bamboo staff and apply haldi-kunku. Tie the silk cloth at the top, then the neem and mango leaves, the flower garland and the sakhar gathi, and set the kalash upside down over the tip. Raise the gudi at the right side of the main door, or at a window or balcony where it can be seen, on a small rangoli.' },
      { title: { en: 'Gudi pooja', te: 'గుడి పూజ' }, text: 'Offer haldi-kunku, akshata and flowers to the gudi, show dhoop and the lamp, and pray for a good year for the home.', mantra: 'బ్రహ్మధ్వజ నమస్తేఽస్తు సర్వాభీష్ట ఫలప్రద ।\nప్రాప్తేఽస్మిన్ సంవత్సరే నిత్యం మద్గృహే మంగళం కురు ॥' },
      { title: { en: 'Naivedya & neem chutney', te: 'నైవేద్యం & వేప చట్నీ' }, text: 'Offer shrikhand-puri or puran poli to the gudi and the family deity. Everyone first eats a little of the neem chutney, then the meal.' },
      { title: { en: 'Panchang vachan', te: 'పంచాంగ పఠనం' }, text: 'Read the new year\'s panchang aloud — the samvatsar name and the year ahead.' },
      { title: { en: 'Taking down the gudi', te: 'గుడిని దించడం' }, text: 'Before sunset, offer haldi-kunku and a little milk and sugar (or the naivedya) to the gudi once more, then take it down; the sakhar gathi is shared as prasad.' },
    ],
    short: { offer: 'haldi-kunku, flowers and akshata to the gudi', mantra: 'బ్రహ్మధ్వజ నమస్తేఽస్తు సర్వాభీష్ట ఫలప్రద ।\nప్రాప్తేఽస్మిన్ సంవత్సరే నిత్యం మద్గృహే మంగళం కురు ॥', extra: [{ title: { en: 'Raise the gudi', te: 'గుడి నిలపండి' }, text: 'Raise the gudi (bamboo, silk cloth, neem and mango leaves, garland, sakhar gathi, upturned kalash) at the main door; take it down before sunset.' }, { title: { en: 'Neem chutney', te: 'వేప చట్నీ' }, text: 'Everyone eats a little neem chutney before the meal.' }], chant: 'Read the new year\'s panchang with the family.' },
  },
  ta: {
    samagri: [
      { en: 'For the kanni tray: the three fruits (mango, jackfruit, banana) and other fruits, betel leaves and areca nuts, coins or gold jewellery, flowers and a mirror', te: 'కన్ని తట్టకు: ముక్కనులు (మామిడి, పనస, అరటి), ఇతర పండ్లు, తమలపాకులు, వక్కలు, నాణేలు/బంగారు నగలు, పూలు, అద్దం' },
      { en: 'Kuthuvilakku (brass lamp) with oil and wicks', te: 'కుత్తువిళక్కు (ఇత్తడి దీపం), నూనె, వత్తులు' },
      { en: 'Mango leaf thoranam and rice-flour kolam at the entrance', te: 'మామిడాకుల తోరణం, గుమ్మం ముందు ముగ్గు (కోలం)' },
      { en: 'Oil for the oil bath; new clothes', te: 'తలస్నానానికి నూనె; కొత్త బట్టలు' },
      { en: 'For mango pachadi: raw mango, neem flowers, jaggery', te: 'మామిడి పచ్చడికి: మామిడికాయ, వేపపూత, బెల్లం' },
      { en: 'The new panchangam; flowers, turmeric, kumkum, camphor', te: 'కొత్త పంచాంగం; పూలు, పసుపు, కుంకుమ, కర్పూరం' },
    ],
    naivedyam: [{ en: 'Mango pachadi (sweet, sour and bitter)', te: 'మామిడి పచ్చడి (తీపి, పులుపు, చేదు)' }, { en: 'Vadai, payasam, sweet pongal', te: 'వడ, పాయసం, చక్కెర పొంగలి' }],
    steps: [
      { title: { en: 'Kanni the night before', te: 'ముందు రాత్రి కన్ని' }, text: 'On the last night of Panguni, clean the house and arrange the kanni tray before the deity: the three fruits, betel and areca, coins or gold, flowers and a mirror.' },
      { title: { en: 'Seeing the kanni', te: 'కన్ని దర్శనం' }, text: 'On waking on Chithirai 1, keep the eyes closed until you reach the pooja room, so that the auspicious kanni is the first thing seen in the new year.' },
      { title: { en: 'Oil bath & kolam', te: 'తలస్నానం & కోలం' }, text: 'Take an oil bath, wear new clothes, tie the mango leaf thoranam and draw a kolam at the entrance.' },
      ...NEW_YEAR_START,
      { title: { en: 'Pooja', te: 'పూజ' }, text: 'Light the kuthuvilakku and perform pooja to the family deity with flowers, dhoopam and deepam.' },
      { title: { en: 'Mango pachadi', te: 'మామిడి పచ్చడి' }, text: 'Offer the mango pachadi with the festival meal; tasting its sweet, sour and bitter flavours is a wish to meet the year\'s ups and downs alike.' },
      { title: { en: 'Panchanga padanam', te: 'పంచాంగ పఠనం' }, text: 'Read the new panchangam — the year name (shown on the Home screen) and its forecasts.' },
      { title: { en: 'Blessings', te: 'ఆశీర్వాదం' }, text: 'Seek blessings of elders and visit the temple.' },
    ],
    short: { offer: 'flowers before the kanni tray', extra: [{ title: { en: 'See the kanni', te: 'కన్ని దర్శనం' }, text: 'Arrange the kanni tray the night before and see it first on waking, eyes closed until then.' }], chant: 'Read the new panchangam with the family.' },
  },
  ml: {
    samagri: [
      { en: 'Uruli (bell-metal vessel) with unakkalari (raw rice)', te: 'ఉరులి (కంచు పాత్ర), పచ్చి బియ్యం' },
      { en: 'Konna (golden shower) flowers', te: 'కొన్న పూలు (రేల పూలు)' },
      { en: 'Kanivellari (golden cucumber), jackfruit, mango, banana, a halved coconut', te: 'కణివెళ్ళరి (బంగారు దోస), పనస, మామిడి, అరటి, సగం చేసిన కొబ్బరికాయ' },
      { en: 'Vaal kannadi (bell-metal mirror), gold ornament, coins, a folded kasavu mundu', te: 'వాల్ కణ్ణాడి (కంచు అద్దం), బంగారు నగ, నాణేలు, మడిచిన కసవు ముండు' },
      { en: 'Betel leaves and areca nuts; the Ramayana or Bhagavatam', te: 'తమలపాకులు, వక్కలు; రామాయణం లేదా భాగవతం' },
      { en: 'Krishna\'s idol or picture; nilavilakku with oil and wicks', te: 'శ్రీకృష్ణుని విగ్రహం/పటం; నిలవిళక్కు, నూనె, వత్తులు' },
      { en: 'Coins for Vishukkaineetam', te: 'విషుక్కైనీట్టం నాణేలు' },
    ],
    naivedyam: [{ en: 'Vishu katta or Vishu kanji', te: 'విషు కట్ట / విషు కంజి' }, { en: 'Vishu sadya: mampazha pulissery, veppampoo rasam, payasam', te: 'విషు సద్య: మామిడిపండు పులిస్సేరి, వేపపూత రసం, పాయసం' }],
    steps: [
      { title: { en: 'Arranging the Vishukkani', te: 'విషుక్కణి అమరిక' }, text: 'On the night before, the eldest woman of the house arranges the kani before Krishna: the uruli with raw rice, konna flowers, kanivellari, fruits and the halved coconut, the vaal kannadi, gold, coins, the folded mundu, betel and the Ramayana or Bhagavatam, with the nilavilakku beside it.' },
      { title: { en: 'Kani kanal at dawn', te: 'కణి దర్శనం (తెల్లవారుజామున)' }, text: 'Before dawn she lights the nilavilakku, then leads each member of the family in with their eyes closed, to open them before the kani so that it is the first sight of the year.' },
      { title: { en: 'Vishukkaineetam', te: 'విషుక్కైనీట్టం' }, text: 'Elders give coins to the children and younger members as a blessing of plenty for the year.' },
      { title: { en: 'Bath & temple', te: 'స్నానం & ఆలయ దర్శనం' }, text: 'Bathe, wear new clothes (kodi vastram) and visit the temple; Guruvayur and Sabarimala have Vishu darshan.' },
      { title: { en: 'Pooja to Krishna', te: 'శ్రీకృష్ణ పూజ' }, text: 'Offer flowers, light the lamp and pray to Sri Krishna and the family deity.', mantra: MANTRA.krishna },
      { title: { en: 'Vishu sadya', te: 'విషు సద్య' }, text: 'Offer the festival meal, then the family eats the Vishu sadya at noon. The kani is also shown to the cattle and trees in many homes.' },
    ],
    short: { mantra: MANTRA.krishna, offer: 'konna flowers to Sri Krishna', extra: [{ title: { en: 'Vishukkani', te: 'విషుక్కణి' }, text: 'Arrange the kani the night before and see it first at dawn with eyes closed until then; elders then give Vishukkaineetam.' }], chant: 'Chant the Krishna mantra 108 times or read the Vishnu Sahasranamam.' },
    stotras: ['vishnu-sahasranamam', 'mantra-pushpam'],
  },
  gu: {
    samagri: [
      { en: 'Rangoli colours and diyas for the doorstep; a toran of mango or ashopalav leaves', te: 'గుమ్మం ముందు రంగోలి రంగులు, దీపాలు; మామిడి / అశోక ఆకుల తోరణం' },
      { en: 'New clothes', te: 'కొత్త బట్టలు' },
      { en: 'Kanku (kumkum), chokha (rice), flowers, dhoop, a ghee diya', te: 'కుంకుమ, అక్షతలు, పూలు, ధూపం, నేతి దీపం' },
      { en: 'A packet of salt (sabras) bought at dawn, for a year full of all tastes', te: 'తెల్లవారుజామున కొనే ఉప్పు (సబ్రస్) — అన్ని రుచులతో నిండిన సంవత్సరం కోసం' },
      { en: 'Sweets and mukhwas for visitors', te: 'అతిథులకు తీపి, ముఖ్వాస్' },
    ],
    naivedyam: [{ en: 'Annakut — many dishes offered together', te: 'అన్నకూట్ — ఎన్నో వంటకాల నైవేద్యం' }, { en: 'Mohanthal, ghughra, mathiya, chorafali', te: 'మోహన్‌థాల్, ఘుఘ్రా, మఠియా, చోరాఫలీ' }, { en: 'Fruits', te: 'పండ్లు' }],
    steps: [
      { title: { en: 'Early bath & rangoli', te: 'తెల్లవారుజాము స్నానం & రంగోలి' }, text: 'Wake before sunrise, bathe and wear new clothes. Draw a rangoli at the door, light diyas and hang a toran. Many families buy a packet of salt (sabras) at dawn as the first purchase of the year.' },
      ...NEW_YEAR_START,
      { title: { en: 'Pooja to Thakorji and Lakshmi', te: 'ఠాకోర్జీ & లక్ష్మీ పూజ' }, text: 'Offer kanku, chokha and flowers to the family deity and to Lakshmi, show dhoop and the diya, and pray for a good year. The chopda (account books) were worshipped on Diwali; business reopens on Labh Pancham.' },
      { title: { en: 'Annakut', te: 'అన్నకూట్' }, text: 'Today is also Govardhan Puja: homes and havelis offer an annakut — a mountain of dishes — to Thakorji, then share it as prasad.' },
      { title: { en: 'Saal Mubarak', te: 'సాల్ ముబారక్' }, text: 'Visit the temple, touch the feet of elders for their blessings, and greet everyone with "Saal Mubarak" or "Nutan Varshabhinandan".' },
    ],
    short: { offer: 'kanku, chokha and flowers', extra: [{ title: { en: 'Saal Mubarak', te: 'సాల్ ముబారక్' }, text: 'Seek the blessings of elders and greet everyone with "Saal Mubarak".' }] },
    stotras: ['lakshmi-ashtottaram', 'mahalakshmi-ashtakam', 'mantra-pushpam'],
  },
  bn: {
    samagri: [
      { en: 'Alpana (rice-paste designs) at the door', te: 'గుమ్మం ముందు అల్పనా (బియ్యపు పిండి ముగ్గు)' },
      { en: 'A mangal ghot (water pot) with mango leaves and a vermilion swastika', te: 'మామిడాకులు, సిందూర స్వస్తికతో మంగళ ఘటం' },
      { en: 'Pictures or idols of Ganesh and Lakshmi', te: 'గణేశ, లక్ష్మీ పటాలు / విగ్రహాలు' },
      { en: 'Flowers, sindoor, dhoop, a ghee lamp, a conch (shankh)', te: 'పూలు, సిందూరం, ధూపం, నేతి దీపం, శంఖం' },
      { en: 'For traders: the new haal khata (red account book)', te: 'వ్యాపారులకు: కొత్త హాల్ ఖాతా (ఎర్ర లెక్కల పుస్తకం)' },
      { en: 'New clothes', te: 'కొత్త బట్టలు' },
    ],
    naivedyam: [{ en: 'Sandesh, rosogolla and other sweets', te: 'సందేశ్, రసగుల్లా, ఇతర తీపి' }, { en: 'Fruits', te: 'పండ్లు' }, { en: 'Luchi and payesh for the family meal', te: 'కుటుంబ భోజనానికి లూచీ, పాయసం' }],
    steps: [
      { title: { en: 'Bath & alpana', te: 'స్నానం & అల్పనా' }, text: 'Bathe early, wear new clothes and draw alpana at the door.' },
      ...NEW_YEAR_START,
      { title: { en: 'Ganesh and Lakshmi puja', te: 'గణేశ & లక్ష్మీ పూజ' }, text: 'Set up the mangal ghot with mango leaves and a vermilion swastika. Offer flowers, sindoor and sweets to Ganesh and Lakshmi, blow the conch and show the lamp.' },
      { title: { en: 'Haal khata', te: 'హాల్ ఖాతా' }, text: 'Shopkeepers and traders open a new account book after the puja, often blessed at the temple and marked with a vermilion swastika, and welcome customers with sweets.' },
      { title: { en: 'Shubho Noboborsho', te: 'శుభో నొబొబొర్షో' }, text: 'Touch the feet of elders (pranam) for their blessings, greet everyone with "Shubho Noboborsho", and share the new year meal.' },
    ],
    short: { offer: 'flowers, sindoor and sweets to Ganesh and Lakshmi', extra: [{ title: { en: 'Shubho Noboborsho', te: 'శుభో నొబొబొర్షో' }, text: 'Seek the blessings of elders and greet everyone with "Shubho Noboborsho".' }] },
    stotras: ['ganesha-ashtottaram', 'lakshmi-ashtottaram', 'mantra-pushpam'],
  },
  or: {
    samagri: [
      { en: 'Bel (wood apple), curd, chhena, jaggery and banana for the bela pana', te: 'బేల పణకు: మారేడు పండు, పెరుగు, ఛేనా, బెల్లం, అరటి' },
      { en: 'A small earthen pot with a hole in its base (basundhara theki) for the tulasi', te: 'తులసికి అడుగున రంధ్రం ఉన్న చిన్న మట్టి కుండ (బసుంధర ఠేకి)' },
      { en: 'Flowers, sandal paste, dhoop, a ghee lamp', te: 'పూలు, గంధం, ధూపం, నేతి దీపం' },
      { en: 'A picture of Hanuman — Hanuman Jayanti is kept on this day in Odisha', te: 'హనుమాన్ పటం — ఒడిశాలో ఈ రోజే హనుమాన్ జయంతి' },
      { en: 'New clothes and the new panjika', te: 'కొత్త బట్టలు, కొత్త పంజిక' },
    ],
    naivedyam: [{ en: 'Bela pana (bel fruit drink with curd, chhena and jaggery)', te: 'బేల పణ (మారేడు పండు పానీయం)' }, { en: 'Chhatua (sattu) and fruits', te: 'ఛతువా (సత్తు), పండ్లు' }],
    steps: [
      { title: { en: 'Bath', te: 'స్నానం' }, text: 'Bathe early and wear new clothes.' },
      ...NEW_YEAR_START,
      { title: { en: 'Basundhara theki', te: 'బసుంధర ఠేకి' }, text: 'Hang the earthen pot of water over the tulasi plant so that it drips on her through the hot months, and worship the tulasi.' },
      { title: { en: 'Bela pana', te: 'బేల పణ' }, text: 'Offer bela pana to the deities, then share it with the family and with neighbours and passers-by.' },
      { title: { en: 'Hanuman Jayanti', te: 'హనుమాన్ జయంతి' }, text: 'Worship Hanuman with flowers and sindoor and read the Hanuman Chalisa.' },
      { title: { en: 'Panjika', te: 'పంజిక' }, text: 'Hear the new year\'s panjika read and seek the blessings of elders.' },
    ],
    short: { offer: 'flowers and bela pana', extra: [{ title: { en: 'Basundhara theki', te: 'బసుంధర ఠేకి' }, text: 'Hang the pot of water over the tulasi plant.' }] },
    stotras: ['hanuman-chalisa', 'mantra-pushpam'],
  },
  north: {
    samagri: [
      { en: 'For Ghatasthapana: a wide clay pot with clean soil and barley (jau) seeds', te: 'ఘటస్థాపనకు: మట్టి పాత్ర, శుభ్రమైన మట్టి, యవలు (బార్లీ విత్తనాలు)' },
      { en: 'A kalash with water and a little Ganga jal, a coin, supari, akshat, and five mango leaves', te: 'కలశం: నీరు, కొంచెం గంగాజలం, నాణెం, వక్క, అక్షతలు, ఐదు మామిడాకులు' },
      { en: 'A coconut wrapped in red cloth (chunri), tied with mauli', te: 'ఎర్ర వస్త్రంలో చుట్టి మౌళి దారం కట్టిన కొబ్బరికాయ' },
      { en: 'Picture or idol of Durga Maa, red cloth for the chowki', te: 'దుర్గామాత పటం/విగ్రహం, పీటకు ఎర్ర వస్త్రం' },
      { en: 'Akhand jyoti (a ghee lamp kept lit for nine days)', te: 'అఖండ జ్యోతి (తొమ్మిది రోజులు వెలిగే నేతి దీపం)' },
      { en: 'Roli, haldi, akshat, flowers, dhoop, camphor; neem leaves with misri', te: 'రోలి, పసుపు, అక్షతలు, పూలు, ధూపం, కర్పూరం; వేపాకు, పటికబెల్లం' },
    ],
    naivedyam: [{ en: 'Fruits, milk sweets, halwa; a satvik vrat meal for those fasting', te: 'పండ్లు, పాల తీపి, హల్వా; ఉపవాసం ఉండేవారికి సాత్విక ఆహారం' }],
    steps: [
      { title: { en: 'Bath & preparation', te: 'స్నానం & సిద్ధత' }, text: 'Bathe early, clean the pooja place and spread a red cloth on a chowki facing east or north. Put up a flag or toran at the door where that is the custom.' },
      ...NEW_YEAR_START.slice(0, 4),
      { title: { en: 'Ghatasthapana', te: 'ఘటస్థాపన' }, text: 'In the morning muhurat of Pratipada, sow barley in the soil of the clay pot. Fill the kalash with water, Ganga jal, a coin, supari and akshat, place the mango leaves at its mouth and the coconut in red cloth on top, and set it on the pot. Install Durga Maa beside it and light the akhand jyoti.', mantra: MANTRA.kalasha },
      { title: { en: 'Shailputri pooja', te: 'శైలపుత్రి పూజ' }, text: 'The first day of Chaitra Navratri is for Maa Shailputri: offer roli, akshat, red flowers and naivedya, and take the Navratri sankalp if you will fast.', mantra: MANTRA.sarvamangala },
      { title: { en: 'Nav Samvatsar', te: 'నవ సంవత్సరం' }, text: 'Worship the new year: read the new panchang (the Vikram Samvat year begins), and eat a little neem with misri for health in the year ahead.' },
      { title: { en: 'Aarti', te: 'ఆరతి' }, text: 'Perform aarti of Durga Maa morning and evening through the nine days; water the barley daily.' },
    ],
    short: { mantra: MANTRA.sarvamangala, offer: 'red flowers, roli and akshat to Durga Maa', extra: [{ title: { en: 'Ghatasthapana', te: 'ఘటస్థాపన' }, text: 'Set up the kalash over sown barley and light the akhand jyoti for the nine days of Chaitra Navratri.' }], chant: 'Chant "ఓం దుం దుర్గాయై నమః" 108 times, and eat a little neem with misri.' },
    stotras: ['lalitha-sahasranamam', 'mantra-pushpam'],
  },
};

// The standard upacharas for Varalakshmi, used around the family's own vratham text.
const VARA_STD = upacharas('Varalakshmi Devi', { namavali: 'lakshmi-ashtottaram', nama: 'kumkum or flowers' });

export const POOJAS: Pooja[] = [
  {
    id: 'nithya', image: 'nithya',
    title: { en: 'Nithya Pooja (daily)', te: 'నిత్య పూజ' }, deity: { en: 'Your ishta devata, beginning with Sri Ganapathi', te: 'శ్రీ గణపతి పూజతో ప్రారంభమయ్యే ఇష్టదేవతా పూజ' },
    when: { en: 'Every day — morning after bath, and in many homes again at dusk with the deepam.', te: 'ప్రతిరోజూ — ఉదయం స్నానం తర్వాత; చాలా ఇళ్ళలో సాయంత్రం దీపారాధనతో మళ్ళీ.' },
    next: (from) => [{ date: from, label: 'Today' }],
    samagri: [
      { en: 'Picture or idol of Ganapathi and your ishta devata on a clean peetham', te: 'శుభ్రమైన పీఠంపై గణపతి, ఇష్టదేవత పటం / విగ్రహం' },
      { en: 'Deepam with ghee or oil, wicks; ekaharathi (single-wick lamp) and camphor', te: 'నెయ్యి / నూనె దీపం, వత్తులు; ఏకహారతి, కర్పూరం' },
      { en: 'Turmeric, kumkum, akshatas, flowers', te: 'పసుపు, కుంకుమ, అక్షతలు, పూలు' },
      { en: 'Kalasham or chembu of water with an uddharini and a small plate', te: 'ఉద్ధరిణితో కలశం / చెంబు నీరు, చిన్న పళ్ళెం' },
      { en: 'Agarbatti, bell, naivedyam (fruit, jaggery or cooked prasadam)', te: 'అగరబత్తి, గంట, నైవేద్యం (పండు, బెల్లం లేదా ప్రసాదం)' },
    ],
    naivedyam: [{ en: 'Fruit, jaggery, milk or the day\'s cooked prasadam', te: 'పండు, బెల్లం, పాలు లేదా ఆ రోజు వండిన ప్రసాదం' }],
    steps: [
      { title: { en: 'Ganapathi dhyanam', te: 'గణపతి ధ్యానం' }, text: 'Begin with Ganapathi. Recite the dhyana shlokas, then bow (namaskaram).', mantra: 'శుక్లాంబరధరం విష్ణుం శశివర్ణం చతుర్భుజమ్ ।\nప్రసన్నవదనం ధ్యాయేత్ సర్వవిఘ్నోపశాంతయే ॥\nఅగజానన పద్మార్కం గజాననం అహర్నిశమ్ ।\nఅనేకదంతం భక్తానాం ఏకదంతముపాస్మహే ॥\nవక్రతుండ మహాకాయ సూర్యకోటిసమప్రభ ।\nనిర్విఘ్నం కురుమే దేవ సర్వకార్యేషు సర్వదా ॥\nఓం శ్రీ మహాగణాధిపతయే నమః (నమస్కారం చేయాలి)' },
      { title: { en: 'Ekaharathi', te: 'ఏకహారతి' }, text: 'Light the ekaharathi and decorate it with turmeric, kumkum, akshatas and flowers.' },
      { title: { en: 'Deeparadhana', te: 'దీపారాధన' }, text: 'Light the deepam and pray that it stays steady as the witness of the pooja.', mantra: 'భో దీప దేవి రూపస్త్వం కర్మసాక్షీ హ్యవిఘ్నకృత్ ।\nయావత్ పూజాం కరిష్యామి తావత్త్వం సుస్థిరో భవ ॥\nదీపారాధన ముహూర్తః సుముహూర్తోస్తు ॥' },
      { title: { en: 'Achamanam', te: 'ఆచమనం' }, text: 'Sip water (theertham) from the right palm with each of the first three names, wash the hands, and say Govindaya Namaha.', mantra: 'ఓం కేశవాయ స్వాహా ॥ (తీర్థం పుచ్చుకోవాలి)\nఓం నారాయణాయ స్వాహా ॥ (తీర్థం పుచ్చుకోవాలి)\nఓం మాధవాయ స్వాహా ॥ (తీర్థం పుచ్చుకోవాలి)\nచేతులు శుద్ధి చేసుకొని — ఓం గోవిందాయ నమః ॥' },
      { title: { en: 'Vishnu\'s names', te: 'విష్ణోర్వింశతి నామాలు' }, text: 'Recite the names of Vishnu with folded hands.', mantra: 'ఓం కేశవాయ నమః । ఓం నారాయణాయ నమః । ఓం మాధవాయ నమః ।\nఓం గోవిందాయ నమః । ఓం విష్ణవే నమః । ఓం మధుసూదనాయ నమః ।\nఓం త్రివిక్రమాయ నమః । ఓం వామనాయ నమః । ఓం శ్రీధరాయ నమః ।\nఓం హృషీకేశాయ నమః । ఓం పద్మనాభాయ నమః । ఓం దామోదరాయ నమః ।\nఓం సంకర్షణాయ నమః । ఓం వాసుదేవాయ నమః । ఓం ప్రద్యుమ్నాయ నమః ।\nఓం అనిరుద్ధాయ నమః । ఓం పురుషోత్తమాయ నమః । ఓం అధోక్షజాయ నమః ।\nఓం నారసింహాయ నమః । ఓం అచ్యుతాయ నమః । ఓం జనార్దనాయ నమః ।\nఓం ఉపేంద్రాయ నమః । ఓం హరయే నమః । ఓం శ్రీకృష్ణాయ నమః ॥' },
      { title: { en: 'Mangala shlokas', te: 'మంగళ శ్లోకాలు' }, text: 'Recite the auspicious verses.', mantra: 'యః శివో నామరూపాభ్యాం యా దేవీ సర్వమంగళా ।\nతయోః సంస్మరణాత్పుంసాం సర్వతో జయమంగళమ్ ॥\nలాభస్తేషాం జయస్తేషాం కుతస్తేషాం పరాభవః ।\nయేషామిందీవరశ్యామో హృదయస్థో జనార్దనః ॥\nఆపదామపహర్తారం దాతారం సర్వసంపదాం ।\nలోకాభిరామం శ్రీరామం భూయో భూయో నమామ్యహమ్ ॥\nసర్వమంగళ మాంగళ్యే శివే సర్వార్థ సాధికే ।\nశరణ్యే త్ర్యంబకే దేవి నారాయణి నమోస్తుతే ॥' },
      { title: { en: 'Akshata samarpana', te: 'అక్షత సమర్పణ' }, text: 'Offer akshatas with each name.', mantra: 'ఓం శ్రీలక్ష్మీనారాయణాభ్యాం నమః ।\nఓం ఉమామహేశ్వరాభ్యాం నమః ।\nఓం వాణీ హిరణ్యగర్భాభ్యాం నమః ।\nఓం శచీపురందరాభ్యాం నమః ।\nఓం అరుంధతీ వసిష్ఠాభ్యాం నమః ।\nఓం సీతారామాభ్యాం నమః ॥\nనమః సర్వేభ్యో మహాజనేభ్యః ।\nఅయం ముహూర్తః సుముహూర్తోస్తు ॥' },
      { title: { en: 'Bhushuddhi', te: 'భూశుద్ధి' }, text: 'Throw a few akshatas behind you (అక్షతలను వెనుకకు వేయాలి).', mantra: 'ఉత్తిష్ఠంతు భూతపిశాచాః ఏతే భూమిభారకాః ।\nఏతేషామవిరోధేన బ్రహ్మకర్మ సమారభే ॥' },
      { title: { en: 'Pranayamam', te: 'ప్రాణాయామం' }, text: 'Breathe in, hold and breathe out while saying the mantra mentally.', mantra: 'ఓం భూః । ఓం భువః । ఓం సువః । ఓం మహః । ఓం జనః । ఓం తపః । ఓం సత్యమ్ ॥\nఓం తత్సవితుర్వరేణ్యం భర్గో దేవస్య ధీమహి ।\nధియో యో నః ప్రచోదయాత్ ॥\nఓమాపో జ్యోతీరసోఽమృతం బ్రహ్మ ।\nభూర్భువస్సువరోమ్ ॥' },
      { title: { en: 'Shuddhi mantram', te: 'శుద్ధి మంత్రం' }, text: 'Sprinkle water in the four directions (నాలుగు దిక్కులా నీరు చల్లాలి).', mantra: 'అపవిత్రః పవిత్రో వా సర్వావస్థాంగతోఽపి వా ।\nయః స్మరేత్ పుండరీకాక్షం స బాహ్యాభ్యంతరః శుచిః ॥' },
      { title: { en: 'Sankalpam', te: 'సంకల్పం' }, kind: 'sankalpam', preeti: 'శ్రీ పరమేశ్వర', text: 'Take akshatas and water in the right palm and say the sankalpam. The year, ayanam, ritu, masam, paksham, thithi, vaaram and nakshatram are filled in below from today\'s panchangam for your place.' },
      { title: { en: 'Kalasharadhana', te: 'కలశారాధన' }, text: 'Worship the kalasham, then sprinkle its water on yourself and on the pooja items (ఆత్మానం సంప్రోక్ష్య, పూజాద్రవ్యాణి సంప్రోక్ష్య).', mantra: 'అదౌ నిర్విఘ్నపరిసమాప్త్యర్థం శ్రీ మహాగణపతిపూజార్థం తదంగ కలశారాధనం కరిష్యే ॥\nకలశస్య ముఖే విష్ణుః కంఠే రుద్రః సమాశ్రితః ।\nమూలే తత్ర స్థితో బ్రహ్మా మధ్యే మాతృగణాః స్మృతాః ॥\nకుక్షౌ తు సాగరాః సర్వే సప్తద్వీపా వసుంధరా ।\nఋగ్వేదోఽథ యజుర్వేదః సామవేదోఽథర్వణః ॥\nఅంగైశ్చ సహితాః సర్వే కలశాంబు సమాశ్రితాః ।\nగంగే చ యమునే చైవ గోదావరి సరస్వతి ।\nనర్మదే సింధు కావేరి జలేఽస్మిన్ సన్నిధిం కురు ॥\nఆత్మానం సంప్రోక్ష్య । పూజాద్రవ్యాణి సంప్రోక్ష్య ॥' },
      ...upacharas('your ishta devata', { namavali: 'ganesha-ashtottaram', nama: 'Ganapathi\'s names first; then your ishta devata\'s from your pooja book' }).slice(6, 23),
    ],
    short: { steps: [] },
    stotras: ['ganesha-ashtottaram', 'mantra-pushpam'],
    note: 'The opening (Ganapathi dhyanam through Kalasharadhana) follows your family\'s pooja text; the offerings after it are the app\'s standard shodashopachara for your ishta devata.',
  },
  {
    id: 'varalakshmi', image: 'varalakshmi',
    title: { en: 'Varalakshmi Vratham', te: 'శ్రీ వరలక్ష్మీ వ్రతం' }, deity: { en: 'Sri Varalakshmi Devi', te: 'శ్రీ వరలక్ష్మీ దేవి' },
    when: { en: 'The second Friday of Shravana masam, or the Friday before Shravana Purnima. If that day is not possible, it can be done on a later Friday of the month.', te: 'శ్రావణమాసంలో రెండవ శుక్రవారం లేదా పౌర్ణమికి ముందు వచ్చే శుక్రవారం రోజున వరలక్ష్మీ వ్రతాన్ని ఆచరిస్తారు. ఆ రోజు వీలుకాకపోతే తరువాతి శుక్రవారాల్లో కూడా ఈ వ్రతం చేయవచ్చు.' },
    next: (from, place) => varalakshmi(from, place),
    samagri: [
      { en: 'Turmeric', te: 'పసుపు' }, { en: 'Kumkum', te: 'కుంకుమ' }, { en: 'Sandal paste', te: 'గంధం' },
      { en: 'Loose flowers', te: 'విడి పూలు' }, { en: 'Flower garlands', te: 'పూలమాలలు' },
      { en: 'Betel leaves', te: 'తమలపాకులు' }, { en: '30 betel nuts', te: '30 వక్కలు' }, { en: 'Dates', te: 'ఖర్జూరాలు' },
      { en: 'Agarbatti', te: 'అగరుబత్తులు' }, { en: 'Camphor', te: 'కర్పూరం' }, { en: 'Small coins', te: 'చిల్లర నాణేలు' },
      { en: 'White cloth', te: 'తెల్లని వస్త్రం' }, { en: 'Blouse piece', te: 'రవికె/బ్లౌజ్ పీస్' }, { en: 'Mango leaves', te: 'మామిడి ఆకులు' },
      { en: 'Five kinds of fruit', te: 'ఐదు రకాల పండ్లు' }, { en: 'Picture or idol of Ammavaru', te: 'అమ్మవారి ఫోటో లేదా విగ్రహం' },
      { en: 'Kalasham', te: 'కలశం' }, { en: 'Coconuts', te: 'కొబ్బరికాయలు' }, { en: 'Nomu thread (turmeric thread) for the thoram', te: 'నోముదారం (పసుపు దారం)' },
      { en: 'Home-made naivedyam', te: 'ఇంట్లో తయారు చేసిన నైవేద్యాలు' }, { en: 'Rice', te: 'బియ్యం' },
      { en: 'Panchamrutam (milk, curd, ghee, honey, sugar)', te: 'పంచామృత ద్రవ్యాలు' },
      { en: 'Lamp stands (kundulu)', te: 'దీపపు కుందులు' }, { en: 'Wicks', te: 'ఒత్తులు' }, { en: 'Ghee', te: 'నెయ్యి' },
    ],
    naivedyam: [{ en: 'Home-made naivedyam', te: 'ఇంట్లో తయారు చేసిన నైవేద్యాలు' }, { en: 'Paramannam / payasam, pulihora, garelu, bobbatlu', te: 'పరమాన్నం / పాయసం, పులిహోర, గారెలు, బొబ్బట్లు' }, { en: 'Five kinds of fruit', te: 'ఐదు రకాల పండ్లు' }],
    steps: [
      { title: { en: 'Preparation', te: 'వ్రతం చేసే విధానం' }, text: 'Wake early, bathe including the hair, and clean the house. Set up a mandapam in the pooja room and draw a muggu with rice flour. Place the kalasham on the mandapam and install Ammavaru\'s picture or idol. Keep the turmeric Ganapathi, the thorams, akshatas and pooja items ready beforehand. — వ్రతదినాన ఉదయాన్నే లేచి తలస్నానం చేసి, ఇంటిని శుభ్రపరచుకోవాలి. పూజా మందిరంలో ఒక మండపం ఏర్పాటు చేసి, బియ్యపు పిండితో ముగ్గు వేయాలి. మండపంపై కలశాన్ని స్థాపించి, అమ్మవారి ఫోటో లేదా విగ్రహాన్ని ప్రతిష్ఠించాలి. పసుపు గణపతి, తోరాలు, అక్షతలు, పూజా ద్రవ్యాలను ముందుగానే సిద్ధం చేసుకోవాలి.' },
      { title: { en: 'Making the thoram', te: 'తోరం తయారీ' }, text: 'Take white thread of five or nine strands and rub it with turmeric. Tie five or nine flowers on it and make five or nine knots. Keep the thoram near the peetham, worship it with turmeric, kumkum, akshatas and flowers, and keep it ready. — తెల్లని దారాన్ని ఐదు లేదా తొమ్మిది పోగులుగా తీసుకుని పసుపు రాయాలి. దానికి ఐదు లేదా తొమ్మిది పూలు కట్టి, ఐదు లేదా తొమ్మిది ముడులు వేయాలి. తోరాన్ని పీఠం వద్ద ఉంచి పసుపు, కుంకుమ, అక్షతలు, పూలతో పూజించి సిద్ధంగా ఉంచుకోవాలి.' },
      VARA_STD[1], VARA_STD[3], VARA_STD[4],
      { title: { en: 'Ganapathi pooja', te: 'గణపతి పూజ' }, text: 'Worship the turmeric Ganapathi first so the vratham completes without obstacles. Offer akshatas or flowers at each of the sixteen names.', mantra: 'అదౌ నిర్విఘ్నేన వ్రత పరిసమాప్త్యర్థం\nశ్రీ మహాగణపతి పూజాం కరిష్యే।\nవక్రతుండ మహాకాయ\nకోటి సూర్య సమప్రభ ।\nనిర్విఘ్నం కురుమే దేవ\nసర్వకార్యేషు సర్వదా ॥\nఆగచ్ఛ వరసిద్ధి వినాయక\nఅంబికా ప్రియనందన ।\nపూజాం గృహాణ సుముఖ\nనమస్తే గణనాయక ॥\n\nగణపతి షోడశ నామావళి\nఓం సుముఖాయ నమః ।\nఓం ఏకదంతాయ నమః ।\nఓం కపిలాయ నమః ।\nఓం గజకర్ణకాయ నమః ।\nఓం లంబోదరాయ నమః ।\nఓం వికటాయ నమః ।\nఓం విఘ్నరాజాయ నమః ।\nఓం గణాధిపాయ నమః ।\nఓం ధూమకేతవే నమః ।\nఓం వక్రతుండాయ నమః ।\nఓం గణాధ్యక్షాయ నమః ।\nఓం ఫాలచంద్రాయ నమః ।\nఓం గజాననాయ నమః ।\nఓం శూర్పకర్ణాయ నమః ।\nఓం హేరంబాయ నమః ।\nఓం స్కందపూర్వజాయ నమః ॥\nఓం శ్రీ మహాగణాధిపతయే నమః ॥' },
      { title: { en: 'Kalasha pooja', te: 'కలశ పూజ' }, text: 'Put gandham, akshatas and a flower in the kalasham, cover it with the right palm and invoke the sacred rivers into the water. Sprinkle a little on yourself and the pooja items.', mantra: 'కలశస్య ముఖే విష్ణుః\nకంఠే రుద్రః సమాశ్రితః ।\nమూలే తత్ర స్థితో బ్రహ్మా\nమధ్యే మాతృగణాః స్మృతాః ॥\nకుక్షౌ తు సాగరాః సర్వే\nసప్తద్వీపా వసుంధరా ।\nఋగ్వేదోఽథ యజుర్వేదః\nసామవేదోఽథర్వణః ॥\nఅంగైశ్చ సహితాః సర్వే\nకలశాంబు సమాశ్రితాః ।\nగంగే చ యమునే చైవ\nగోదావరి సరస్వతి ॥\nనర్మదే సింధు కావేరి\nజలేఽస్మిన్ సన్నిధిం కురు ॥' },
      { title: { en: 'Dhyanam', te: 'ధ్యానం' }, text: 'Close your eyes and meditate on Varalakshmi Devi.', mantra: 'పద్మాసనే పద్మకరే\nసర్వలోకైకపూజితే ।\nనారాయణప్రియే దేవి\nసుప్రీతా భవ సర్వదా ॥\nక్షీరోదార్ణవ సంభూతే\nకమలే కమలాలయే ।\nసుస్థిరా భవ మే గేహే\nసురాసుర నమస్కృతే ॥' },
      { title: { en: 'Avahanam', te: 'ఆవాహనం' }, text: 'Holding akshatas and a flower, invite Ammavaru into the kalasham and image, and offer them.', mantra: 'సర్వమంగళ మాంగళ్యే\nవిష్ణు వక్షఃస్థలాలయే ।\nఆవాహయామి దేవి త్వాం\nసుప్రీతా భవ సర్వదా ॥\nశ్రీ వరలక్ష్మీ దేవతాయై నమః\nఆవాహయామి ॥' },
      { title: { en: 'Asanam', te: 'ఆసనం' }, text: 'Offer akshatas as a seat.', mantra: 'సూర్యాయుత నిభస్ఫూర్తే\nస్ఫురద్రత్న విభూషితే ।\nసింహాసనం ఇదం దేవి\nగృహాణ సురపూజితే ॥\nశ్రీ వరలక్ష్మీ దేవతాయై నమః\nఆసనం సమర్పయామి ॥' },
      { title: { en: 'Padyam', te: 'పాద్యం' }, text: 'Offer a few drops of water at the feet, pouring it into the plate.', mantra: 'సువాసిత జలం రమ్యం\nసర్వతీర్థ సముద్భవం ।\nపాద్యం గృహాణ దేవి త్వం\nసర్వదేవ నమస్కృతే ॥\nశ్రీ వరలక్ష్మీ దేవతాయై నమః\nపాద్యం సమర్పయామి ॥' },
      { title: { en: 'Arghyam', te: 'అర్ఘ్యం' }, text: 'Offer water mixed with gandham and flowers for the hands.', mantra: 'శుద్ధోదకం చ పాత్రస్థం\nగంధపుష్పాది మిశ్రితం ।\nఅర్ఘ్యం దాస్యామి తే దేవి\nగృహాణ సురపూజితే ॥\nశ్రీ వరలక్ష్మీ దేవతాయై నమః\nఅర్ఘ్యం సమర్పయామి ॥' },
      { title: { en: 'Achamaniyam', te: 'ఆచమనీయం' }, text: 'Offer water to sip.', mantra: 'సువర్ణకలశానీతం\nచందనాగరు సంయుతం ।\nగృహాణాచమనం దేవి\nమయాదత్తం శుభప్రదే ॥\nశ్రీ వరలక్ష్మీ దేవతాయై నమః\nఆచమనీయం సమర్పయామి ॥' },
      { title: { en: 'Panchamruta snanam', te: 'పంచామృత స్నానం' }, text: 'Bathe Ammavaru (or sprinkle, for a picture) with milk, curd, ghee, honey and sugar.', mantra: 'పయో దధి ఘృతోపేతం\nశర్కరా మధు సంయుతం ।\nపంచామృతస్నానమిదం\nగృహాణ కమలాలయే ॥\nశ్రీ వరలక్ష్మీ దేవతాయై నమః\nపంచామృత స్నానం సమర్పయామి ॥' },
      { title: { en: 'Shuddhodaka snanam', te: 'శుద్ధోదక స్నానం' }, text: 'Bathe with clean water, then wipe dry.', mantra: 'గంగాజలం మయానీతం\nమహాదేవ శిరఃస్థితం ।\nశుద్ధోదకమిదం స్నానం\nగృహాణ విధుసోదరి ॥\nశ్రీ వరలక్ష్మీ దేవతాయై నమః\nశుద్ధోదక స్నానం సమర్పయామి ॥' },
      { title: { en: 'Vastram', te: 'వస్త్రం' }, text: 'Offer the cloth and blouse piece (or akshatas in their place).', mantra: 'సురార్చితాంఘ్రియుగళే\nదుకూల వసనప్రియే ।\nవస్త్రయుగ్మం ప్రదాస్యామి\nగృహాణ హరివల్లభే ॥\nశ్రీ వరలక్ష్మీ దేవతాయై నమః\nవస్త్రయుగ్మం సమర్పయామి ॥' },
      { title: { en: 'Abharanam', te: 'ఆభరణం' }, text: 'Offer ornaments (or akshatas in their place).', mantra: 'కేయూర కంకణైర్దివ్యైః\nహార నూపుర మేఖలాః ।\nవిభూషణాన్యమూల్యాని\nగృహాణ ఋషిపూజితే ॥\nశ్రీ వరలక్ష్మీ దేవతాయై నమః\nఆభరణాని సమర్పయామి ॥' },
      { title: { en: 'Upaveetam', te: 'ఉపవీతం' }, text: 'Offer the mangalyam / upaveetam.', mantra: 'తప్తహేమకృతం దేవి\nమాంగల్యం మంగళప్రదం ।\nమయా సమర్పితం దేవి\nగృహాణ త్వం శుభప్రదే ॥\nశ్రీ వరలక్ష్మీ దేవతాయై నమః\nఉపవీతం సమర్పయామి ॥' },
      ...VARA_STD.slice(11, 20),
      { title: { en: 'Thoram bandhanam', te: 'తోర బంధనం' }, text: 'Offer akshatas to the worshipped thoram and tie it on the right wrist (or ask an elder to tie it).', mantra: 'బధ్నామి దక్షిణే హస్తే నవసూత్రం శుభప్రదం ।\nపుత్రపౌత్రాభివృద్ధిం చ సౌభాగ్యం దేహి మే రమే ॥' },
      { title: { en: 'Vratha katha', te: 'వ్రత కథ' }, text: 'Everyone listens with akshatas in hand while the katha is read from your vratha kalpam book. In brief: one night Lakshmi Devi appeared in a dream to Charumathi, a devoted wife, and taught her this vratham. By performing it, it is believed, one gains wealth, grain, prosperity, saubhagyam, children, health and the fulfilment of every wish. After the katha, put the akshatas on your head.' },
      { title: { en: 'Vayanam', te: 'వాయనం' }, text: 'Offer tambulam with fruit, turmeric-kumkum and a blouse piece to married women (muthaiduvulu) as vayanam, and take their blessings.' },
      ...VARA_STD.slice(20, 23),
    ],
    short: { steps: [] },
    stotras: ['lakshmi-ashtottaram', 'mahalakshmi-ashtakam', 'mantra-pushpam'],
    note: 'Varalakshmi vratha mahima: according to the Puranas, Lakshmi Devi appeared one night in a dream to Charumathi, a devoted wife, and taught her this vratham. Performing it is believed to bring wealth, grain, prosperity, saubhagyam, children, health and the fulfilment of every wish. Everything up to Upaveetam follows your family\'s vratham text; achamanam, pranayamam, sankalpam and the offerings after Upaveetam are the app\'s standard ones.',
  },
  {
    id: 'ganapathi', image: 'ganapathi',
    title: { en: 'Ganapathi Pooja', te: 'గణపతి పూజ' }, deity: { en: 'Lord Ganapathi', te: 'శ్రీ గణపతి' },
    when: { en: 'Before any new beginning; daily; on Vinayaka Chavithi (Bhadrapada Shukla Chaturthi) and Sankashti Chaturthi.', te: 'ఏ శుభకార్యానికైనా ముందు; ప్రతిరోజూ; వినాయక చవితి, సంకష్ట చతుర్థి రోజుల్లో.' },
    next: (from, place) => [...festival('vinayaka-chavithi', 'Vinayaka Chavithi')(from, place).slice(0, 1), ...observancesInRange(from, addDays(from, 40), place).filter((o) => o.id === 'sankashti').slice(0, 1).map((o) => ({ date: o.date, label: 'Sankashti Chaturthi' }))],
    samagri: [
      { en: 'Ganapathi idol (clay for Chavithi) or image', te: 'గణపతి విగ్రహం (చవితికి మట్టి విగ్రహం) లేదా పటం' },
      { en: 'Turmeric, kumkum, sandal paste', te: 'పసుపు, కుంకుమ, గంధం' }, { en: 'Akshatas (rice with turmeric)', te: 'అక్షతలు' },
      { en: 'Flowers, garland, durva (garika) grass', te: 'పూలు, మాల, గరిక' },
      { en: 'Patri — 21 kinds of leaves for Chavithi', te: 'పత్రి — చవితికి 21 రకాల ఆకులు' },
      { en: 'Deepam, ghee/oil, wicks, camphor, agarbatti', te: 'దీపం, నెయ్యి/నూనె, వత్తులు, కర్పూరం, అగరబత్తి' },
      { en: 'Betel leaves, nuts, coconut, bananas', te: 'తమలపాకులు, వక్కలు, కొబ్బరికాయ, అరటిపండ్లు' },
      { en: 'Bell, kalasham, uddharini & plate', te: 'గంట, కలశం, ఉద్ధరిణి & పళ్ళెం' },
    ],
    naivedyam: [{ en: 'Kudumulu / modakam', te: 'కుడుములు / మోదకాలు' }, { en: 'Undrallu, vadapappu, panakam', te: 'ఉండ్రాళ్ళు, వడపప్పు, పానకం' }, { en: 'Fruits and jaggery', te: 'పండ్లు, బెల్లం' }],
    steps: [
      ...upacharas('Ganapathi', { dhyanam: MANTRA.vakratunda, nama: 'with durva grass if available; on Chavithi, offer the 21 patri leaves one by one', namavali: 'ganesha-ashtottaram' }),
      { title: { en: 'Vinayaka Chavithi katha', te: 'వినాయక వ్రత కథ' }, text: 'On Chavithi, read or listen to the Vinayaka vratha katha (including the Syamantakamani story) and take akshatas on the head afterwards. Traditionally the moon is not looked at on Chavithi night.' },
    ],
    short: { mantra: MANTRA.vakratunda, offer: 'flowers, garika (durva) and kumkum', chant: 'Chant "ఓం గం గణపతయే నమః" 11 or 108 times, or read Ganesha Pancharatnam.' },
    stotras: ['ganesha-ashtottaram', 'ganesha-pancharatnam', 'mantra-pushpam'],
  },
  {
    id: 'lakshmi', image: 'lakshmi',
    title: { en: 'Lakshmi Pooja', te: 'లక్ష్మీ పూజ' }, deity: { en: 'Goddess Mahalakshmi', te: 'శ్రీ మహాలక్ష్మి' },
    when: { en: 'Fridays; Deepavali evening (Amavasya, pradosha kalam); Varalakshmi Vratam (the Friday before Shravana Purnima).', te: 'శుక్రవారాలు; దీపావళి సాయంత్రం; వరలక్ష్మీ వ్రతం (శ్రావణ పౌర్ణమి ముందు శుక్రవారం).' },
    next: (from, place) => [
      { date: nextWeekday(from, 5), label: 'Friday' },
      ...festival('deepavali', 'Deepavali Lakshmi Pooja')(from, place).slice(0, 1),
      ...varalakshmi(from, place),
    ],
    samagri: [
      { en: 'Lakshmi image or idol; kalasham with coconut and mango leaves', te: 'లక్ష్మీ పటం/విగ్రహం; కొబ్బరికాయ, మామిడాకులతో కలశం' },
      { en: 'Turmeric, kumkum, sandal, akshatas', te: 'పసుపు, కుంకుమ, గంధం, అక్షతలు' },
      { en: 'Lotus or red flowers, garland', te: 'తామర లేదా ఎర్రని పూలు, మాల' },
      { en: 'New cloth / blouse piece, bangles, nalla pusalu', te: 'కొత్త వస్త్రం / రవికెల గుడ్డ, గాజులు, నల్లపూసలు' },
      { en: 'Coins or gold/silver for the kalasham', te: 'కలశంలో నాణేలు లేదా బంగారం/వెండి' },
      { en: 'Deepams (rows of diyas on Deepavali), camphor, agarbatti', te: 'దీపాలు (దీపావళికి వరుస దీపాలు), కర్పూరం, అగరబత్తి' },
      { en: 'Thoram (sacred thread with 9 knots) for Varalakshmi Vratam', te: 'వరలక్ష్మీ వ్రతానికి తోరం (9 ముడుల దారం)' },
      { en: 'Betel leaves, nuts, fruits, coconut', te: 'తమలపాకులు, వక్కలు, పండ్లు, కొబ్బరికాయ' },
    ],
    naivedyam: [{ en: 'Paramannam / payasam', te: 'పరమాన్నం / పాయసం' }, { en: 'Pulihora, garelu, bobbatlu', te: 'పులిహోర, గారెలు, బొబ్బట్లు' }, { en: 'Nine kinds of pindivantalu (Varalakshmi)', te: 'తొమ్మిది రకాల పిండివంటలు (వరలక్ష్మీ వ్రతం)' }],
    steps: [
      ...upacharas('Mahalakshmi', { dhyanam: MANTRA.sarvamangala, nama: 'kumkum or lotus petals', namavali: 'lakshmi-ashtottaram' }),
      { title: { en: 'Thoram & vratha katha (Varalakshmi Vratam)', te: 'తోరం & వ్రత కథ' }, text: 'On Varalakshmi Vratam, worship the thoram, tie it on the right wrist, read the vratha katha (the story of Charumathi), and offer tambulam to married women (vayanam).' },
    ],
    short: { mantra: 'ఓం శ్రీం మహాలక్ష్మ్యై నమః', offer: 'lotus or red flowers, turmeric and kumkum', chant: 'Read the Mahalakshmi Ashtakam (8 verses) or chant the mantra 108 times.' },
    stotras: ['lakshmi-ashtottaram', 'mahalakshmi-ashtakam', 'lalitha-sahasranamam', 'mantra-pushpam'],
  },
  {
    id: 'ugadi', image: 'ugadi',
    title: { en: 'Ugadi Pooja', te: 'ఉగాది పూజ' }, deity: { en: 'Ishta devata & the new year', te: 'ఇష్టదేవత & నూతన సంవత్సరం' },
    when: { en: 'Ugadi — Chaitra Shukla Pratipada, the Telugu New Year, in the morning.', te: 'ఉగాది — చైత్ర శుద్ధ పాడ్యమి, ఉదయం.' },
    // Each region keeps the new year under its own name; Tamil and Kerala use solar dates (see regional customs).
    next: (from, place, tradition) => {
      const t = tradition ?? 'te';
      const [id, label] = ({
        mr: ['gudi-padwa', 'Gudi Padwa'], north: ['nav-samvatsar', 'Nav Samvatsar'], ta: ['puthandu', 'Puthandu'], ml: ['vishu', 'Vishu'],
        gu: ['bestu-varas', 'Bestu Varas'], bn: ['poila-boishakh', 'Poila Boishakh'], or: ['pana-sankranti', 'Pana Sankranti'],
      } as const)[t as 'mr'] ?? ['ugadi', 'Ugadi'];
      return festival(id, label)(from, place, t);
    },
    samagri: [
      { en: 'Mango leaf thoranams for the doorway', te: 'గుమ్మానికి మామిడాకుల తోరణాలు' },
      { en: 'Oil and shikakai/sunnipindi for abhyanga snanam', te: 'అభ్యంగన స్నానానికి నూనె, సున్నిపిండి' },
      { en: 'New clothes', te: 'కొత్త బట్టలు' },
      { en: 'Ugadi pachadi ingredients: neem flowers, new jaggery, tamarind, raw mango, salt, green chilli or pepper', te: 'ఉగాది పచ్చడికి: వేపపూత, కొత్త బెల్లం, చింతపండు, మామిడి ముక్కలు, ఉప్పు, పచ్చిమిర్చి/మిరియాలు' },
      { en: 'The new year Panchangam', te: 'కొత్త సంవత్సర పంచాంగం' },
      { en: 'Flowers, turmeric, kumkum, akshatas, deepam, camphor', te: 'పూలు, పసుపు, కుంకుమ, అక్షతలు, దీపం, కర్పూరం' },
    ],
    naivedyam: [{ en: 'Ugadi pachadi (six tastes: sweet, sour, salt, bitter, pungent, astringent)', te: 'ఉగాది పచ్చడి (షడ్రుచులు)' }, { en: 'Bobbatlu / pulihora', te: 'బొబ్బట్లు / పులిహోర' }],
    steps: [
      { title: { en: 'Abhyanga snanam', te: 'అభ్యంగన స్నానం' }, text: 'Wake early, apply oil and take a head bath; wear new clothes. Decorate the entrance with mango thoranams and muggulu.' },
      ...upacharas('your ishta devata').slice(1, 6),
      { title: { en: 'Pooja to the ishta devata', te: 'ఇష్టదేవతా పూజ' }, text: 'Perform pooja to the family deity with flowers, deepam and dhoopam, following the steps of any household pooja.' },
      { title: { en: 'Ugadi pachadi', te: 'ఉగాది పచ్చడి' }, text: 'Mix the six tastes — they stand for the joys and challenges of the year ahead, to be received with balance. Offer it as naivedyam first, then everyone takes a little before breakfast.' },
      { title: { en: 'Panchanga shravanam', te: 'పంచాంగ శ్రవణం' }, text: 'Read or listen to the new year\'s panchangam — the samvatsaram name, rulers of the year, and rasi phalalu. The year name for your location is on the Home screen.' },
      { title: { en: 'Blessings', te: 'ఆశీర్వాదం' }, text: 'Seek blessings of elders and visit the temple.' },
    ],
    short: { offer: 'flowers and the Ugadi pachadi', extra: [{ title: { en: 'Ugadi pachadi', te: 'ఉగాది పచ్చడి' }, text: 'After naivedyam, everyone tastes the six-taste pachadi before breakfast.' }], chant: 'Read the new year\'s panchangam (Panchanga shravanam) with the family.' },
    stotras: ['mantra-pushpam'],
    byTradition: NEW_YEAR_BY_REGION,
  },
  {
    id: 'ayyappa', image: 'ayyappa',
    title: { en: 'Ayyappa Pooja', te: 'అయ్యప్ప పూజ' }, deity: { en: 'Lord Ayyappa (Dharma Shasta)', te: 'శ్రీ అయ్యప్ప స్వామి' },
    when: { en: 'During the 41-day Mandala season from Vrischika Sankranti (mid-November), daily evening pooja and bhajan; Makaravilakku at Makara Sankranti.', te: 'వృశ్చిక సంక్రాంతి నుండి 41 రోజుల మండల కాలంలో ప్రతి సాయంత్రం పూజ, భజన; మకర సంక్రాంతికి మకరవిళక్కు.' },
    next: (from, place) => {
      const s = mandalaStart(from, place);
      if (!s) return [];
      const mk = observancesInRange(addDays(s, 30), addDays(s, 80), place).find((o) => o.id === 'makara-sankranti');
      return [{ date: s, label: 'Mandala season begins' }, { date: addDays(s, 40), label: 'Mandala Pooja (41st day)' }, ...(mk ? [{ date: mk.date, label: 'Makaravilakku' }] : [])];
    },
    samagri: [
      { en: 'Ayyappa image, decorated with flowers', te: 'అయ్యప్ప స్వామి పటం, పూలతో అలంకరణ' },
      { en: 'Black/blue/saffron dhoti and the Ayyappa mala (for those taking deeksha)', te: 'నలుపు/నీలం/కాషాయ వస్త్రాలు, అయ్యప్ప మాల (దీక్షకు)' },
      { en: 'Vibhuti, sandal, kumkum', te: 'విభూతి, గంధం, కుంకుమ' },
      { en: 'Ghee lamp, camphor, agarbatti', te: 'నేతి దీపం, కర్పూరం, అగరబత్తి' },
      { en: 'Coconut; ghee-filled coconut (neyyabhishekam) and irumudi for the pilgrimage', te: 'కొబ్బరికాయ; యాత్రకు నేతి కొబ్బరికాయ, ఇరుముడి' },
      { en: 'Flowers, tulasi, betel leaves, fruits', te: 'పూలు, తులసి, తమలపాకులు, పండ్లు' },
    ],
    naivedyam: [{ en: 'Aravana payasam (rice, jaggery, ghee)', te: 'అరవణ పాయసం' }, { en: 'Appam, panakam, fruits', te: 'అప్పం, పానకం, పండ్లు' }],
    steps: [
      ...upacharas('Ayyappa Swamy', {
        nama: 'Ayyappa\'s own names first; then, as Ayyappa is Hariharaputra (son of Shiva and Vishnu), the Shiva, Venkateswara and Lakshmi Ashtottarams — offer as many as time allows. Say "స్వామియే శరణం అయ్యప్ప" at the end',
        namavali: ['ayyappa-ashtottaram', 'shiva-ashtottaram', 'venkateswara-ashtottaram', 'lakshmi-ashtottaram'],
      }).map((st) => (st.title.en.startsWith('Ganapathi')
        ? { ...st, text: `${st.text} In the Ayyappa pooja, Ganapathi is worshipped first with his 108 names.`, namavalis: ['ganesha-ashtottaram'] }
        : st)),
      { title: { en: 'Sharanu ghosha & bhajan', te: 'శరణు ఘోష & భజన' }, text: 'The guru swamy or leader calls each line and everyone answers "శరణం అయ్యప్ప" together, loudly and with devotion. Tap each line to keep your place; then sing bhajans.', namavalis: ['ayyappa-sharanu-ghosha'] },
      { title: { en: 'Harivarasanam', te: 'హరివరాసనం' }, text: 'End the evening pooja by singing Harivarasanam, as at Sabarimala when the temple closes each night. Lights are dimmed one by one as it is sung.', stotra: 'harivarasanam' },
      { title: { en: 'Deeksha discipline (for swamis)', te: 'దీక్షా నియమాలు' }, text: 'Those wearing the mala traditionally keep the 41-day vratham: simple satvic food, celibacy, sleeping on the floor, no footwear, bath twice daily, and addressing everyone as "Swamy". Follow your guru swamy\'s guidance.' },
    ],
    short: {
      mantra: 'స్వామియే శరణం అయ్యప్ప', offer: 'flowers, tulasi and vibhuti',
      chant: 'Offer a flower at each of Ayyappa\'s 108 names below (tap to keep count), then call the sharanu ghosha — everyone answers "శరణం అయ్యప్ప".',
      prayerNames: ['ganesha-ashtottaram'], chantNames: ['ayyappa-ashtottaram', 'ayyappa-sharanu-ghosha'],
      closing: [{ title: { en: 'Harivarasanam', te: 'హరివరాసనం' }, text: 'Close by singing Harivarasanam, the lullaby sung to Swamy at Sabarimala each night.', stotra: 'harivarasanam' }],
    },
    stotras: ['ayyappa-ashtottaram', 'ayyappa-sharanu-ghosha', 'harivarasanam', 'ganesha-ashtottaram', 'shiva-ashtottaram', 'venkateswara-ashtottaram', 'lakshmi-ashtottaram'],
  },
  {
    id: 'lalitha', image: 'lalitha',
    title: { en: 'Lalitha Sahasranama Parayanam', te: 'లలితా సహస్రనామ పారాయణ' }, deity: { en: 'Sri Lalitha Tripurasundari', te: 'శ్రీ లలితా త్రిపురసుందరి' },
    when: { en: 'Fridays, Purnima, Navaratri, and daily for many families; often in the evening.', te: 'శుక్రవారాలు, పౌర్ణమి, నవరాత్రులు; చాలా కుటుంబాల్లో ప్రతిరోజూ, సాయంత్రం.' },
    next: (from, place) => [
      { date: nextWeekday(from, 5), label: 'Friday' },
      ...observancesInRange(from, addDays(from, 35), place).filter((o) => o.id === 'purnima').slice(0, 1).map((o) => ({ date: o.date, label: 'Purnima' })),
    ],
    samagri: [
      { en: 'Image of Lalitha / Sri Chakra, or a lamp as the deity', te: 'లలితా దేవి పటం / శ్రీచక్రం, లేదా దీపమే అమ్మవారిగా' },
      { en: 'Kumkum for archana (kumkumarchana)', te: 'కుంకుమార్చనకు కుంకుమ' },
      { en: 'Red flowers, deepam, agarbatti', te: 'ఎర్రని పూలు, దీపం, అగరబత్తి' },
    ],
    naivedyam: [{ en: 'Payasam, fruits, or jaggery', te: 'పాయసం, పండ్లు లేదా బెల్లం' }],
    steps: [
      ...upacharas('Sri Lalitha').slice(0, 6),
      { title: { en: 'Nyasam & Dhyanam', te: 'న్యాసం & ధ్యానం' }, text: 'Recite the nyasam (asya sri lalitha sahasranama stotra mala…) and the dhyana shlokas from the stotram, visualising the Mother as described, then invite her with akshatas.', mantra: 'శ్రీ లలితా పరమేశ్వర్యై నమః — ధ్యాయామి, ఆవాహయామి' },
      ...upacharas('Sri Lalitha').slice(7, 12),
      { title: { en: 'Pancha pooja', te: 'పంచపూజ' }, text: 'As given at the start of the stotram, offer gandham (లం), pushpam (హం), dhoopam (యం), deepam (రం) and naivedyam (వం) mentally or with the items.' },
      { title: { en: 'Parayanam & kumkumarchana', te: 'పారాయణ & కుంకుమార్చన' }, text: 'Recite all 183 verses (about 25–30 minutes) from the Stotrams tab. For kumkumarchana, offer a pinch of kumkum at each of the 1000 names; the kumkum is later worn as prasadam by married women. Finish with the phala shruti (uttara bhagam).' },
      ...upacharas('Sri Lalitha').slice(13, 23),
    ],
    short: { mantra: MANTRA.sarvamangala, offer: 'red flowers and kumkum', chant: 'Recite the dhyanam and the first ten verses — or the full Sahasranamam (about 25 minutes) on Fridays.' },
    stotras: ['lalitha-sahasranamam'],
  },
  {
    id: 'vishnu', image: 'vishnu',
    title: { en: 'Vishnu Sahasranama Parayanam', te: 'విష్ణు సహస్రనామ పారాయణ' }, deity: { en: 'Lord Vishnu', te: 'శ్రీ మహావిష్ణువు' },
    when: { en: 'Ekadashi, Thursdays and Saturdays, Vaikunta Ekadashi, Kartika masam; daily for many families.', te: 'ఏకాదశి, గురు/శనివారాలు, వైకుంఠ ఏకాదశి, కార్తీక మాసం; చాలా కుటుంబాల్లో ప్రతిరోజూ.' },
    next: (from, place) => [
      ...observancesInRange(from, addDays(from, 20), place).filter((o) => o.id === 'ekadashi').slice(0, 1).map((o) => ({ date: o.date, label: 'Ekadashi' })),
      { date: nextWeekday(from, 4), label: 'Thursday' },
    ],
    samagri: [
      { en: 'Image of Vishnu / Venkateswara / Krishna', te: 'విష్ణువు / వేంకటేశ్వరుడు / కృష్ణుడి పటం' },
      { en: 'Tulasi leaves (essential)', te: 'తులసి ఆకులు (తప్పనిసరి)' },
      { en: 'Flowers, sandal, deepam, agarbatti', te: 'పూలు, గంధం, దీపం, అగరబత్తి' },
    ],
    naivedyam: [{ en: 'Pongali / chakkera pongali, fruits, tulasi water', te: 'పొంగలి / చక్కెర పొంగలి, పండ్లు, తులసి తీర్థం' }],
    steps: [
      ...upacharas('Sri Maha Vishnu').slice(0, 6),
      { title: { en: 'Purva peethika, Nyasam & Dhyanam', te: 'పూర్వపీఠిక, న్యాసం & ధ్యానం' }, text: 'Begin the stotram with the purva peethika (Shuklambaradharam…, the dialogue of Yudhishthira and Bhishma), the nyasam and the dhyana shlokas (Kshirodanvat pradeshe…, Shantakaram…), then invite the Lord with akshatas.', mantra: 'శ్రీ మహావిష్ణవే నమః — ధ్యాయామి, ఆవాహయామి' },
      ...upacharas('Sri Maha Vishnu').slice(7, 12),
      { title: { en: 'Parayanam with tulasi archana', te: 'పారాయణ & తులసీ అర్చన' }, text: 'Recite the 108 verses of the thousand names (about 25 minutes) from the Stotrams tab, offering a tulasi leaf with each verse. The "1000 names & meanings" view helps follow the meaning. Complete with the uttara peethika (phala shruti).' },
      ...upacharas('Sri Maha Vishnu').slice(13, 23),
    ],
    short: { mantra: 'ఓం నమో నారాయణాయ', offer: 'tulasi leaves and flowers', chant: 'Recite the dhyanam and the first ten verses — or the full Sahasranamam (about 25 minutes) on Ekadashi.' },
    stotras: ['vishnu-sahasranamam', 'venkateswara-ashtottaram'],
  },
  {
    id: 'satyanarayana', image: 'vishnu',
    title: { en: 'Satyanarayana Vratham', te: 'సత్యనారాయణ స్వామి వ్రతం' }, deity: { en: 'Lord Satyanarayana (Vishnu)', te: 'శ్రీ సత్యనారాయణ స్వామి' },
    when: { en: 'Purnima evenings (most common), Ekadashi, Sankranti, and after a housewarming, wedding, birthday or any wish fulfilled. Usually in the evening with family and friends.', te: 'పౌర్ణమి సాయంత్రం (ఎక్కువగా), ఏకాదశి, సంక్రాంతి; గృహప్రవేశం, వివాహం, పుట్టినరోజు లేదా కోరిక నెరవేరినప్పుడు. సాయంత్రం కుటుంబంతో.' },
    next: (from, place) => [
      ...observancesInRange(from, addDays(from, 35), place).filter((o) => o.id === 'purnima').slice(0, 1).map((o) => ({ date: o.date, label: 'Purnima' })),
      ...festival('kartika-purnima', 'Kartika Purnima')(from, place).slice(0, 1),
    ],
    samagri: [
      { en: 'Satyanarayana Swamy image; a peetham with a new cloth', te: 'సత్యనారాయణ స్వామి పటం; కొత్త వస్త్రం పరిచిన పీఠం' },
      { en: 'Kalasham with water, mango leaves and a coconut', te: 'నీరు, మామిడాకులు, కొబ్బరికాయతో కలశం' },
      { en: 'Banana stems or leaves to decorate the mandapam', te: 'మండపానికి అరటి పిలకలు / ఆకులు' },
      { en: 'Rice for the navagraha and dikpalaka seats; wheat or rice to spread under the kalasham', te: 'నవగ్రహ, దిక్పాలకుల కోసం బియ్యం; కలశం కింద గోధుమలు లేదా బియ్యం' },
      { en: 'Turmeric, kumkum, sandal, akshatas, flowers, tulasi', te: 'పసుపు, కుంకుమ, గంధం, అక్షతలు, పూలు, తులసి' },
      { en: 'Panchamrutam: milk, curd, ghee, honey, sugar', te: 'పంచామృతం: పాలు, పెరుగు, నెయ్యి, తేనె, పంచదార' },
      { en: 'Betel leaves, nuts, bananas, fruits, dakshina', te: 'తమలపాకులు, వక్కలు, అరటిపండ్లు, పండ్లు, దక్షిణ' },
      { en: 'Deepam, camphor, agarbatti, bell', te: 'దీపం, కర్పూరం, అగరబత్తి, గంట' },
      { en: 'Prasadam ingredients in "sapadam" (1¼) measures: rava (sooji), sugar, ghee, milk, bananas, cardamom', te: 'ప్రసాదానికి సపాదం (1¼) కొలతలతో: రవ్వ, పంచదార, నెయ్యి, పాలు, అరటిపండ్లు, యాలకులు' },
    ],
    naivedyam: [{ en: 'Satyanarayana prasadam (rava kesari with banana, made in 1¼ measures)', te: 'సత్యనారాయణ స్వామి ప్రసాదం (సపాద భక్ష్యం — రవ్వ, అరటిపండు)' }, { en: 'Bananas, panchamrutam, fruits', te: 'అరటిపండ్లు, పంచామృతం, పండ్లు' }],
    steps: [
      { title: { en: 'Prepare the mandapam', te: 'మండప సిద్ధత' }, text: 'Clean the place, draw muggulu, set up the peetham with a new cloth and banana-stem decorations, spread rice or wheat, and place the kalasham with mango leaves and coconut. Keep the Satyanarayana Swamy image behind it.' },
      ...upacharas('Satyanarayana Swamy').slice(1, 5),
      { title: { en: 'Kalasha pooja', te: 'కలశ పూజ' }, text: 'Worship the kalasham with turmeric, kumkum and flowers, praying that the sacred rivers be present in its water; sprinkle that water on the pooja items and on yourself.' },
      { title: { en: 'Navagraha & Ashta Dikpalaka pooja', te: 'నవగ్రహ & అష్టదిక్పాలక పూజ' }, text: 'Invite the nine grahas and the guardians of the eight directions on small heaps of rice around the kalasham and offer akshatas, kumkum and flowers to each.' },
      ...upacharas('Satyanarayana Swamy').slice(6, 13),
      { title: { en: 'Vratha katha (5 adhyayas)', te: 'వ్రత కథ (5 అధ్యాయాలు)' }, text: 'Everyone listens with akshatas in hand while the five chapters are read from your vratha kalpam book. In brief: (1) Narada asks Lord Vishnu how people can be freed from suffering, and the Lord teaches this vratham. (2) A poor Brahmin of Kashi and then a woodcutter perform it and prosper. (3) The merchant Sadhu vows to perform it if blessed with a child; a daughter, Kalavati, is born, but he keeps postponing the vow and meets hardship. (4) Released and returning home rich, he lies to the Lord (disguised as a sannyasi) about his cargo, loses it, repents, and performs the vratham. (5) Kalavati rushes to meet her husband without taking the prasadam, and King Tungadhwaja disregards prasadam offered by cowherds; both suffer until they return with devotion. The lesson: keep your vows and never neglect the Lord\'s prasadam. After each chapter, offer akshatas to the Swamy.' },
      ...upacharas('Satyanarayana Swamy').slice(13, 20),
      { title: { en: 'Prasadam for everyone', te: 'అందరికీ ప్రసాదం' }, text: 'Distribute the prasadam to every guest — as the katha teaches, no one should leave without taking it. Close with kshamapana.', mantra: MANTRA.kshamapana },
    ],
    short: { mantra: 'ఓం నమో భగవతే వాసుదేవాయ', offer: 'tulasi, flowers and bananas', extra: [{ title: { en: 'Katha (brief)', te: 'కథ (సంక్షిప్తంగా)' }, text: 'Read the short summary of the five chapters from the Detailed tab, holding akshatas.' }], chant: 'Offer the sapada prasadam and share it with everyone present.' },
    stotras: ['vishnu-sahasranamam', 'mantra-pushpam'],
    note: 'The full vratha katha is read from your family\'s Satyanarayana vratha kalpam book; a purohit often conducts the vratham.',
  },
  {
    id: 'hanuman', image: 'hanuman',
    title: { en: 'Hanuman Pooja & Chalisa', te: 'హనుమాన్ పూజ & చాలీసా' }, deity: { en: 'Lord Hanuman (Anjaneya)', te: 'శ్రీ ఆంజనేయ స్వామి' },
    when: { en: 'Tuesdays and Saturdays; Hanuman Jayanti (Vaishakha Bahula Dashami in Telugu states, Chaitra Purnima in the North); during the 41-day Hanuman deeksha.', te: 'మంగళ, శనివారాలు; హనుమాన్ జయంతి (తెలుగు రాష్ట్రాల్లో వైశాఖ బహుళ దశమి); 41 రోజుల హనుమాన్ దీక్షలో.' },
    next: (from, place, tradition) => [
      { date: nextWeekday(from, 2), label: 'Tuesday' },
      { date: nextWeekday(from, 6), label: 'Saturday' },
      ...festival('hanuman-jayanti', 'Hanuman Jayanti')(from, place, tradition ?? 'te').slice(0, 1),
    ],
    samagri: [
      { en: 'Hanuman image or idol', te: 'ఆంజనేయ స్వామి పటం / విగ్రహం' },
      { en: 'Sindhooram (orange vermilion) mixed with sesame oil', te: 'నువ్వుల నూనెతో కలిపిన సింధూరం' },
      { en: 'Betel-leaf garland (tamalapaku mala) and red flowers', te: 'తమలపాకుల మాల, ఎర్రని పూలు' },
      { en: 'Sesame-oil deepam, camphor, agarbatti', te: 'నువ్వుల నూనె దీపం, కర్పూరం, అగరబత్తి' },
      { en: 'Bananas, jaggery and roasted chana', te: 'అరటిపండ్లు, బెల్లం, వేయించిన శనగలు' },
    ],
    naivedyam: [{ en: 'Bananas, jaggery with chana (bellam-senagalu)', te: 'అరటిపండ్లు, బెల్లం-శనగలు' }, { en: 'Vada mala or appalu on special days', te: 'ప్రత్యేక రోజుల్లో వడమాల / అప్పాలు' }],
    steps: [
      ...upacharas('Sri Anjaneya Swamy').slice(0, 12),
      { title: { en: 'Sindhoora archana', te: 'సింధూర అర్చన' }, text: 'Apply sindhooram to the idol or offer a pinch at each name, and adorn with the betel-leaf garland — both are especially dear to Hanuman.' },
      { title: { en: 'Hanuman Chalisa', te: 'హనుమాన్ చాలీసా' }, text: 'Recite the Hanuman Chalisa — once daily, or 11 or 108 times on Tuesdays, Saturdays and Hanuman Jayanti. The Chalisa itself says whoever recites it a hundred times is freed from bonds.' },
      ...upacharas('Sri Anjaneya Swamy').slice(13, 23),
    ],
    short: { mantra: 'శ్రీ రామ జయ రామ జయ జయ రామ', offer: 'sindhooram, a betel-leaf garland and red flowers', chant: 'Recite the Hanuman Chalisa once (about 8 minutes).' },
    stotras: ['hanuman-chalisa'],
  },
  {
    id: 'vehicle', image: 'vehicle',
    title: { en: 'Vehicle Pooja', te: 'వాహన పూజ' }, deity: { en: 'Ganapathi & your ishta devata', te: 'గణపతి & ఇష్టదేవత' },
    when: { en: 'When you take delivery of a new car, bike or scooter (choose a good muhurtam), and every year on Ayudha Pooja (Maha Navami) or Vijayadashami.', te: 'కొత్త కారు/బైక్ తీసుకున్నప్పుడు (మంచి ముహూర్తంలో), ప్రతి సంవత్సరం ఆయుధ పూజ (మహర్నవమి) లేదా విజయదశమి రోజున.' },
    next: (from, place) => [
      ...festival('maha-navami', 'Ayudha Pooja (Maha Navami)')(from, place).slice(0, 1),
      ...festival('vijayadashami', 'Vijayadashami')(from, place).slice(0, 1),
    ],
    action: { label: { en: 'Find a muhurtam for a new vehicle', te: 'కొత్త వాహనానికి ముహూర్తం కనుగొనండి' }, activity: 'vehicle' },
    samagri: [
      { en: 'Turmeric, kumkum, sandal paste, akshatas', te: 'పసుపు, కుంకుమ, గంధం, అక్షతలు' },
      { en: 'Flower garland for the vehicle and mango leaves', te: 'వాహనానికి పూలమాల, మామిడాకులు' },
      { en: 'Coconut to break, and 4 lemons for the wheels', te: 'కొట్టడానికి కొబ్బరికాయ, చక్రాల కింద 4 నిమ్మకాయలు' },
      { en: 'Camphor (in a plate), agarbatti, a small deepam', te: 'పళ్ళెంలో కర్పూరం, అగరబత్తి, చిన్న దీపం' },
      { en: 'Bananas, betel leaves, nuts; sweets to share', te: 'అరటిపండ్లు, తమలపాకులు, వక్కలు; పంచడానికి స్వీట్లు' },
      { en: 'A small Ganapathi or deity image for the dashboard (optional)', te: 'డ్యాష్‌బోర్డ్‌కు చిన్న గణపతి / దేవుడి బొమ్మ (ఐచ్ఛికం)' },
    ],
    naivedyam: [{ en: 'Bananas, coconut, jaggery or sweets', te: 'అరటిపండ్లు, కొబ్బరి, బెల్లం లేదా స్వీట్లు' }],
    steps: [
      { title: { en: 'Clean the vehicle', te: 'వాహనం శుభ్రం' }, text: 'Wash the vehicle and park it facing east (or towards the road) in a clean place; for Ayudha Pooja, also clean your tools, books and work equipment and keep them beside it. Keep the pooja plate ready.' },
      ...upacharas('Ganapathi').slice(1, 2),
      { title: { en: 'Ganapathi prarthana', te: 'గణపతి ప్రార్థన' }, text: 'Pray to Ganapathi for safe journeys and freedom from obstacles, offering akshatas and a flower to a turmeric Ganapathi or picture.', mantra: MANTRA.vakratunda },
      ...upacharas('Ganapathi').slice(3, 5).map((st) => (st.kind === 'sankalpam' ? { ...st, preeti: 'శ్రీ మహాగణాధిపతి సహిత వాహన దేవతా', text: 'Take akshatas and water in the right palm and say the sankalpam (filled in below with today\'s panchangam), resolving that every journey in this vehicle be safe.' } : st)),
      { title: { en: 'Decorate & apply turmeric-kumkum', te: 'అలంకరణ & పసుపు-కుంకుమ' }, text: 'Draw a swastika or "శ్రీ" with turmeric and kumkum on the bonnet or handlebar, dot turmeric and kumkum on each wheel and on the steering/handle, and tie the garland and mango leaves at the front.', mantra: 'శ్రీ మహాగణాధిపతయే నమః — గంధాన్ ధారయామి, హరిద్రా కుంకుమం సమర్పయామి, పుష్పైః పూజయామి' },
      { title: { en: 'Ganesha archana (optional)', te: 'గణేశ అష్టోత్తర పూజ (ఐచ్ఛికం)' }, text: 'If time allows, offer akshatas or flowers to Ganapathi at each of his 108 names.', namavalis: ['ganesha-ashtottaram'] },
      { title: { en: 'Dhoopam, deepam & naivedyam', te: 'ధూపం, దీపం & నైవేద్యం' }, text: 'Show agarbatti and the deepam to the vehicle and offer bananas and coconut as naivedyam.', mantra: `${MANTRA.deepam}\nశ్రీ మహాగణాధిపతయే నమః — ధూపమాఘ్రాపయామి, దీపం దర్శయామి, నైవేద్యం సమర్పయామి` },
      { title: { en: 'Harathi', te: 'హారతి' }, text: 'Light camphor in a plate and show harathi around the vehicle. Keep the flame well away from the fuel tank and engine, and never light camphor inside the vehicle.' },
      { title: { en: 'Coconut & lemons', te: 'కొబ్బరికాయ & నిమ్మకాయలు' }, text: 'Break the coconut on the ground in front of the vehicle (away from people and glass). Place a lemon under each wheel and drive forward slowly over them — a traditional way to begin the first journey.' },
      { title: { en: 'First drive', te: 'మొదటి ప్రయాణం' }, text: 'Many families drive first to a nearby temple. Share the sweets with family and neighbours.' },
      ...upacharas('Ganapathi').slice(20, 21),
    ],
    short: { steps: [] },
    stotras: ['ganesha-ashtottaram', 'ganesha-pancharatnam', 'hanuman-chalisa'],
  },
  {
    // Dates are personal: the pooja page lists the family's own birthdays (from their events) instead.
    id: 'birthday', image: 'birthday',
    title: { en: 'Birthday Pooja', te: 'పుట్టినరోజు పూజ' }, deity: { en: 'Ganapathi & your ishta devata', te: 'గణపతి & ఇష్టదేవత' },
    when: { en: 'On the birthday — by the calendar date, or on the Janma Nakshatra day (the birth star) in the birth month, as your family keeps it. A time to thank God for another year, pray for health, wisdom and peace, and receive the blessings of parents, elders and the family deity.', te: 'పుట్టినరోజున — తేదీ ప్రకారం గానీ, పుట్టిన మాసంలో జన్మ నక్షత్రం రోజున గానీ, మీ కుటుంబ ఆచారం ప్రకారం. మరో సంవత్సరం ఇచ్చినందుకు భగవంతునికి కృతజ్ఞత, ఆరోగ్యం, జ్ఞానం, శాంతి కోసం ప్రార్థన, తల్లిదండ్రులు, పెద్దలు, కులదైవం ఆశీర్వాదం పొందే రోజు.' },
    next: () => [],
    samagri: [
      { en: 'Ganapathi or chosen deity image', te: 'గణపతి లేదా ఇష్టదేవత పటం' },
      { en: 'Clean puja cloth and a small altar', te: 'శుభ్రమైన పూజా వస్త్రం, చిన్న పీఠం' },
      { en: 'Brass or other suitable lamp, cotton wicks and oil or ghee', te: 'ఇత్తడి లేదా తగిన దీపం, వత్తులు, నూనె లేదా నెయ్యి' },
      { en: 'Turmeric, kumkum, sandalwood paste', te: 'పసుపు, కుంకుమ, గంధం' },
      { en: 'Flowers, and tulasi or bilva leaves as appropriate to the deity', te: 'పూలు; దేవతను బట్టి తులసి లేదా మారేడు దళాలు' },
      { en: 'Akshata (rice mixed with turmeric, according to custom)', te: 'అక్షతలు (ఆచారం ప్రకారం పసుపు కలిపిన బియ్యం)' },
      { en: 'Water in a clean vessel; kalash materials if used', te: 'శుభ్రమైన పాత్రలో నీరు; కలశం పెడితే దానికి కావలసినవి' },
      { en: 'Fruits, coconut, and a simple naivedyam', te: 'పండ్లు, కొబ్బరికాయ, సులభమైన నైవేద్యం' },
      { en: 'Incense, camphor, and aarti plate', te: 'అగరబత్తి, కర్పూరం, హారతి పళ్ళెం' },
      { en: 'New or clean clothing for the person being blessed', te: 'పుట్టినరోజు వారికి కొత్త లేదా శుభ్రమైన బట్టలు' },
    ],
    naivedyam: [{ en: 'Fruits, coconut, and a simple naivedyam your family makes', te: 'పండ్లు, కొబ్బరికాయ, మీ ఇంట్లో చేసే సులభమైన నైవేద్యం' }],
    steps: [
      { title: { en: 'Cleanse and prepare', te: 'శుద్ధి & సిద్ధత' }, text: 'Clean the puja area, arrange the deity\'s image, place the offerings, and light the lamp. The person celebrating the birthday may bathe and wear clean clothes.' },
      { title: { en: 'Ganapathi prayer', te: 'గణపతి ప్రార్థన' }, text: 'Begin with a prayer to Lord Ganapathi for the smooth completion of the worship. A commonly recited mantra is "Om Gam Ganapataye Namah".', mantra: 'ఓం గం గణపతయే నమః' },
      { title: { en: 'Sankalpam', te: 'సంకల్పం' }, kind: 'sankalpam', preeti: 'శ్రీ మహాగణాధిపతి', text: 'State the date, place, the person\'s name, and the intention to perform birthday or birth-star worship for well-being and spiritual growth. The panchangam part is filled in below for today and your place. A formal Vedic sankalpam has more calendrical and lineage details — use a version prepared for your family\'s tradition rather than improvising Sanskrit wording.' },
      { title: { en: 'Worship the chosen deity', te: 'ఇష్టదేవత పూజ' }, text: 'Offer flowers, akshata, incense and naivedyam according to the deity\'s tradition. Recite the deity\'s namavali, ashtottaram, or a familiar stotram (see Stotrams below).' },
      { title: { en: 'Janma Nakshatra prayer', te: 'జన్మ నక్షత్ర ప్రార్థన' }, text: 'Remember the person\'s birth star and pray for health, long life, knowledge and peace. A family may recite a suitable nakshatra prayer, or arrange a priest-led nakshatra shanti if customary. Many families also recite the Mrityunjaya mantra for health and long life.', mantra: MANTRA.mrityunjaya },
      { title: { en: 'Naivedyam and mangalarati', te: 'నైవేద్యం & మంగళహారతి' }, text: 'Offer the prepared food, perform aarti, and conclude with a prayer of gratitude.' },
      { title: { en: 'Receive blessings', te: 'ఆశీర్వాదం' }, text: 'Offer respects to parents and elders, distribute prasadam, and consider an act of charity or feeding others.' },
    ],
    short: {
      steps: [
        { title: { en: 'Deepam', te: 'దీపారాధన' }, text: 'After the birthday person has bathed, light the lamp and incense before Ganapathi or your family deity.' },
        { title: { en: 'Ganapathi prayer', te: 'గణపతి ప్రార్థన' }, text: 'Fold your hands and pray that the worship goes without obstacles.', mantra: 'ఓం గం గణపతయే నమః' },
        { title: { en: 'Prayer for the year ahead', te: 'కొత్త సంవత్సరం కోసం ప్రార్థన' }, text: 'Offer flowers and akshata, remember the person\'s birth star, and pray for health, long life, knowledge and peace.' },
        { title: { en: 'Aarti & blessings', te: 'హారతి & ఆశీర్వాదం' }, text: 'Offer fruit or a sweet, show aarti, then bow to parents and elders for their blessings and share the prasadam.' },
      ],
    },
    stotras: ['ganesha-ashtottaram', 'ganesha-pancharatnam', 'vishnu-sahasranamam', 'lalitha-sahasranamam'],
    note: 'Birthday or Janma Nakshatra? The calendar birthday is for gratitude, family prayers and blessings; the Janma Nakshatra day is worship aligned with the birth star; a Nakshatra shanti is a more specific ritual when prescribed or customary; and an Ayushya Homam is a priest-led longevity homam, commonly done for children or at selected milestones. A nakshatra shanti or Ayushya Homam is not automatically required every birthday — it depends on your family\'s tradition and the observance.',
  },
  {
    // Dates are personal: the pooja page lists the family's own wedding anniversaries instead.
    id: 'anniversary', image: 'vishnu',
    title: { en: 'Wedding Anniversary Pooja', te: 'వివాహ వార్షికోత్సవ పూజ' }, deity: { en: 'Lakshmi-Narayana, Uma-Maheshwara or your family deity', te: 'లక్ష్మీనారాయణులు, ఉమామహేశ్వరులు లేదా కులదైవం' },
    when: { en: 'On the wedding anniversary — by the calendar date or the wedding thithi, as your family keeps it. A time to pray for harmony, affection and mutual respect between husband and wife, give thanks for the family\'s life together, and seek blessings for children, elders and the household.', te: 'వివాహ వార్షికోత్సవం రోజున — తేదీ ప్రకారం గానీ, వివాహ తిథి ప్రకారం గానీ, మీ కుటుంబ ఆచారం ప్రకారం. దంపతుల మధ్య సామరస్యం, ప్రేమ, పరస్పర గౌరవం కోసం ప్రార్థన, కలిసి గడిపిన జీవితానికి కృతజ్ఞత, పిల్లలు, పెద్దలు, ఇంటి క్షేమం కోసం ఆశీర్వాదం కోరే రోజు.' },
    next: () => [],
    samagri: [
      { en: 'Image of Lakshmi-Narayana, Uma-Maheshwara, or the family deity', te: 'లక్ష్మీనారాయణులు, ఉమామహేశ్వరులు లేదా కులదైవం పటం' },
      { en: 'Clean altar cloth and puja vessels', te: 'శుభ్రమైన పీఠం వస్త్రం, పూజా పాత్రలు' },
      { en: 'Brass lamp, wicks, and oil or ghee', te: 'ఇత్తడి దీపం, వత్తులు, నూనె లేదా నెయ్యి' },
      { en: 'Turmeric, kumkum, sandalwood paste, and akshata', te: 'పసుపు, కుంకుమ, గంధం, అక్షతలు' },
      { en: 'Fresh flowers and deity-appropriate leaves', te: 'తాజా పూలు, దేవతకు తగిన దళాలు' },
      { en: 'Fruits, coconut, and naivedyam', te: 'పండ్లు, కొబ్బరికాయ, నైవేద్యం' },
      { en: 'Incense and aarti plate', te: 'అగరబత్తి, హారతి పళ్ళెం' },
      { en: 'Two flower garlands, if the couple wishes to exchange them', te: 'దంపతులు మార్చుకోవాలనుకుంటే రెండు పూలమాలలు' },
      { en: 'Optional: betel leaves, betel nuts, and traditional auspicious offerings', te: 'ఐచ్ఛికం: తమలపాకులు, వక్కలు, సంప్రదాయ మంగళ ద్రవ్యాలు' },
    ],
    naivedyam: [{ en: 'Fruits, coconut, and a naivedyam your family makes', te: 'పండ్లు, కొబ్బరికాయ, మీ ఇంట్లో చేసే నైవేద్యం' }],
    steps: [
      { title: { en: 'Prepare the altar', te: 'పీఠం సిద్ధం' }, text: 'Clean the worship area, arrange the chosen deity\'s image, light the lamp, and place the offerings. The couple may wear traditional or clean festive clothes.' },
      { title: { en: 'Ganapathi prayer', te: 'గణపతి ప్రార్థన' }, text: 'Begin by invoking Lord Ganapathi.', mantra: 'ఓం గం గణపతయే నమః' },
      { title: { en: 'Sankalpam', te: 'సంకల్పం' }, kind: 'sankalpam', preeti: 'శ్రీ లక్ష్మీనారాయణ', text: 'State the couple\'s names, the date, and the intention to offer prayers for marital harmony, health, family welfare and continued companionship. The panchangam part is filled in below for today and your place. If you use a formal Vedic sankalpam, follow your family\'s regional and priestly tradition.' },
      { title: { en: 'Worship Lakshmi-Narayana or Uma-Maheshwara', te: 'లక్ష్మీనారాయణ / ఉమామహేశ్వర పూజ' }, text: 'Offer flowers, akshata, incense and naivedyam. Recite a familiar Vishnu or Shiva stotram, or the chosen deity\'s ashtottaram (see Stotrams below). Follow the deity\'s usual offering customs.' },
      { title: { en: 'Couple\'s prayer', te: 'దంపతుల ప్రార్థన' }, text: 'Together, the husband and wife may offer flowers and pray for patience, trust, respect, good health, and the strength to support each other through life\'s challenges. Optionally exchange flower garlands as a personal symbolic gesture; this is not a mandatory part of a standard home pooja.' },
      { title: { en: 'Naivedyam and mangalarati', te: 'నైవేద్యం & మంగళహారతి' }, text: 'Offer food, perform aarti, and pray for the well-being of the whole family.' },
      { title: { en: 'Prasadam and charity', te: 'ప్రసాదం & దానం' }, text: 'Share prasadam with family members and, if you wish, make a donation or offer food to others as an expression of gratitude.' },
    ],
    short: {
      steps: [
        { title: { en: 'Deepam', te: 'దీపారాధన' }, text: 'Light the lamp and incense before Lakshmi-Narayana, Uma-Maheshwara or your family deity.' },
        { title: { en: 'Ganapathi prayer', te: 'గణపతి ప్రార్థన' }, text: 'Fold your hands and pray that the worship goes without obstacles.', mantra: 'ఓం గం గణపతయే నమః' },
        { title: { en: 'Couple\'s prayer', te: 'దంపతుల ప్రార్థన' }, text: 'Together, offer flowers and akshata and pray for patience, trust, respect and good health for each other and the family.' },
        { title: { en: 'Aarti & prasadam', te: 'హారతి & ప్రసాదం' }, text: 'Offer fruit or a sweet, show aarti, and share the prasadam with the family.' },
      ],
    },
    stotras: ['vishnu-sahasranamam', 'lalitha-sahasranamam', 'shiva-ashtottaram', 'lakshmi-ashtottaram'],
    note: 'Special anniversaries: every year, a simple Lakshmi-Narayana or family-deity pooja; on milestone anniversaries, a special archana or priest-led worship according to family custom. Shashtipoorthi (the 60th-year milestone), Bhimaratha Shanti (observed in some communities around age 70) and Sahasra Chandra Darshanam (about 1,000 full moons) are age- or tradition-specific milestones, not rituals required on every wedding anniversary — confirm their dates and procedures with a knowledgeable priest.',
  },
  {
    id: 'purnima-amavasya', image: 'purnima-amavasya',
    title: { en: 'Purnima & Amavasya Worship', te: 'పౌర్ణమి & అమావాస్య పూజ' }, deity: { en: 'Vishnu, Shiva, Lakshmi or your family deity', te: 'విష్ణువు, శివుడు, లక్ష్మీదేవి లేదా కులదైవం' },
    when: { en: 'Every Purnima (full moon). Common observances: Satyanarayana Swamy Vratham; Lakshmi or Vishnu worship; Shiva worship and stotra recitation; Chandra prayer in traditions that keep it; a fast or dietary vrata by personal custom; charity and sharing prasadam. Satyanarayana Vratham is a well-known family observance, but it is not compulsory on every Purnima.', te: 'ప్రతి పౌర్ణమి. సాధారణ ఆచారాలు: సత్యనారాయణ స్వామి వ్రతం; లక్ష్మీ లేదా విష్ణు పూజ; శివ పూజ, స్తోత్ర పారాయణ; ఆచారం ఉన్నవారికి చంద్ర ప్రార్థన; వ్యక్తిగత ఆచారం ప్రకారం ఉపవాసం లేదా వ్రతం; దానం, ప్రసాద వితరణ. సత్యనారాయణ వ్రతం ప్రసిద్ధమైన కుటుంబ ఆచారం, కానీ ప్రతి పౌర్ణమికీ తప్పనిసరి కాదు.' },
    next: (from, place) => [...monthly('purnima', 'Purnima')(from, place), ...monthly('amavasya', 'Amavasya')(from, place)],
    samagri: [
      { en: 'Image of Satyanarayana Swamy, Vishnu, Shiva, or chosen deity', te: 'సత్యనారాయణ స్వామి, విష్ణు, శివ లేదా ఇష్టదేవత పటం' },
      { en: 'Clean altar cloth and puja vessels', te: 'శుభ్రమైన పీఠం వస్త్రం, పూజా పాత్రలు' },
      { en: 'Brass lamp, oil or ghee, and wicks', te: 'ఇత్తడి దీపం, నూనె లేదా నెయ్యి, వత్తులు' },
      { en: 'Flowers, turmeric, kumkum, sandalwood paste, and akshata', te: 'పూలు, పసుపు, కుంకుమ, గంధం, అక్షతలు' },
      { en: 'Fruits and coconut', te: 'పండ్లు, కొబ్బరికాయ' },
      { en: 'Tulasi leaves for Vishnu worship, where appropriate', te: 'విష్ణు పూజకు తులసి దళాలు (తగిన చోట)' },
      { en: 'Water vessel and kalash materials if used', te: 'నీటి పాత్ర; కలశం పెడితే దానికి కావలసినవి' },
      { en: 'Naivedyam suited to the chosen vrata', te: 'చేసే వ్రతానికి తగిన నైవేద్యం' },
      { en: 'Incense and aarti plate', te: 'అగరబత్తి, హారతి పళ్ళెం' },
      { en: 'Optional: ingredients for the traditional Satyanarayana prasadam', te: 'ఐచ్ఛికం: సత్యనారాయణ ప్రసాదానికి కావలసిన సామగ్రి' },
    ],
    naivedyam: [{ en: 'Naivedyam suited to the chosen vrata; fruits and coconut', te: 'వ్రతానికి తగిన నైవేద్యం; పండ్లు, కొబ్బరికాయ' }],
    steps: [
      { title: { en: 'Preparation and sankalpam', te: 'సిద్ధత & సంకల్పం' }, kind: 'sankalpam', preeti: 'శ్రీ పరమేశ్వర', text: 'Clean the worship area, bathe if convenient, light the lamp, and state your intention to observe Purnima worship. The panchangam part of the sankalpam is filled in below for today and your place.' },
      { title: { en: 'Ganapathi prayer', te: 'గణపతి ప్రార్థన' }, text: 'Recite "Om Gam Ganapataye Namah" or your family\'s customary opening prayer.', mantra: 'ఓం గం గణపతయే నమః' },
      { title: { en: 'Worship the chosen deity', te: 'ఇష్టదేవత పూజ' }, text: 'Perform a simple upachara pooja with flowers, akshata, incense and naivedyam. For Satyanarayana Vratham, follow the prescribed katha and ritual sequence of your tradition — the Satyanarayana Vratham guide in this app has the full sequence.' },
      { title: { en: 'Parayanam and prayer', te: 'పారాయణ & ప్రార్థన' }, text: 'Recite the relevant stotram, Vishnu Sahasranamam, or the Satyanarayana katha if you are observing that vrata (see Stotrams below).' },
      { title: { en: 'Naivedyam and aarti', te: 'నైవేద్యం & హారతి' }, text: 'Offer the prepared food, perform aarti, pray for peace and well-being, and distribute prasadam.' },
    ],
    short: {
      steps: [
        { title: { en: 'Deepam', te: 'దీపారాధన' }, text: 'After bathing, light the lamp and incense before your chosen deity.' },
        { title: { en: 'Ganapathi prayer', te: 'గణపతి ప్రార్థన' }, text: 'Fold your hands and pray that the worship goes without obstacles.', mantra: 'ఓం గం గణపతయే నమః' },
        { title: { en: 'Offering & parayanam', te: 'సమర్పణ & పారాయణ' }, text: 'Offer flowers and akshata, and recite a stotram you know, such as Vishnu Sahasranamam.' },
        { title: { en: 'Naivedyam & aarti', te: 'నైవేద్యం & హారతి' }, text: 'Offer fruit or naivedyam, show aarti, and share the prasadam.' },
      ],
    },
    stotras: ['vishnu-sahasranamam', 'lakshmi-ashtottaram', 'shiva-ashtottaram', 'lalitha-sahasranamam'],
    note: 'Fasting is optional unless you are following a specific vrata that prescribes it. Anyone who is pregnant, unwell, taking medication, or otherwise needs regular meals should adapt the observance safely. Purnima emphasises devotion, vrata, prayer and gratitude; ritual details depend on the vrata and regional custom.',
    variants: [
      { id: 'purnima', label: { en: 'Purnima (full moon)', te: 'పౌర్ణమి' }, guide: {} },
      {
        id: 'amavasya', label: { en: 'Amavasya (new moon)', te: 'అమావాస్య' },
        guide: {
          when: { en: 'Every Amavasya (new moon). It is kept differently among families: daily worship of the family deity; remembrance of and prayers for departed ancestors (Pitrus); tarpanam as prescribed by the family\'s tradition; charity, feeding others and acts of remembrance; or Shiva, Vishnu or other deity worship by custom.', te: 'ప్రతి అమావాస్య. కుటుంబాన్ని బట్టి ఆచారం మారుతుంది: కులదైవ పూజ; పితృ స్మరణ, పెద్దల కోసం ప్రార్థన; కుటుంబ సంప్రదాయం ప్రకారం తర్పణం; దానం, అన్నదానం, స్మరణ; లేదా ఆచారం ప్రకారం శివ, విష్ణు లేదా ఇతర దేవతా పూజ.' },
          samagri: [
            { en: 'Chosen deity image and clean altar', te: 'ఇష్టదేవత పటం, శుభ్రమైన పీఠం' },
            { en: 'Brass lamp, wicks, and oil or ghee', te: 'ఇత్తడి దీపం, వత్తులు, నూనె లేదా నెయ్యి' },
            { en: 'Flowers, turmeric, kumkum, and akshata as appropriate', te: 'తగినట్లు పూలు, పసుపు, కుంకుమ, అక్షతలు' },
            { en: 'Clean water and a suitable vessel', te: 'శుభ్రమైన నీరు, తగిన పాత్ర' },
            { en: 'Fruits or simple naivedyam', te: 'పండ్లు లేదా సులభమైన నైవేద్యం' },
            { en: 'Incense and aarti plate', te: 'అగరబత్తి, హారతి పళ్ళెం' },
            { en: 'Optional: items specifically prescribed by the family\'s priest for Pitru observances', te: 'ఐచ్ఛికం: పితృ కార్యాలకు మీ పురోహితులు చెప్పిన వస్తువులు' },
            { en: 'Optional: food or donations for charitable giving', te: 'ఐచ్ఛికం: దానానికి ఆహారం లేదా విరాళం' },
          ],
          naivedyam: [{ en: 'Fruits or a simple naivedyam', te: 'పండ్లు లేదా సులభమైన నైవేద్యం' }],
          steps: [
            { title: { en: 'Clean and prepare', te: 'శుద్ధి & సిద్ధత' }, text: 'Clean the altar and arrange the deity\'s image, lamp, flowers and offerings.' },
            { title: { en: 'Begin with prayer', te: 'ప్రార్థనతో ప్రారంభం' }, kind: 'sankalpam', preeti: 'శ్రీ పరమేశ్వర', text: 'Offer a prayer to Ganapathi or the family\'s chosen deity and state the intention to observe Amavasya. The panchangam part of the sankalpam is filled in below for today and your place.', mantra: 'ఓం గం గణపతయే నమః' },
            { title: { en: 'Remember the ancestors', te: 'పితృ స్మరణ' }, text: 'Silently remember departed family members, express gratitude for their lives, and pray for their peace. If your family observes formal Pitru rituals, follow the prescribed procedure and guidance — this simple prayer is not the same as a formal tarpanam. The Pinda Pradanam (Shraddha) guide in this app covers the formal rite.' },
            { title: { en: 'Perform deity worship', te: 'దేవతా పూజ' }, text: 'Offer flowers, akshata and other appropriate offerings. Recite a familiar prayer or stotram according to your family\'s tradition.' },
            { title: { en: 'Offer naivedyam and conclude', te: 'నైవేద్యం & ముగింపు' }, text: 'Offer food, perform aarti, and conclude with a prayer for family welfare. Charity or feeding others may be included if you wish.' },
          ],
          short: {
            steps: [
              { title: { en: 'Deepam', te: 'దీపారాధన' }, text: 'Light the lamp and incense before your family deity.' },
              { title: { en: 'Remember the ancestors', te: 'పితృ స్మరణ' }, text: 'Silently remember departed family members with gratitude and pray for their peace.' },
              { title: { en: 'Prayer', te: 'ప్రార్థన' }, text: 'Offer flowers and akshata and recite a familiar prayer or stotram.', mantra: 'ఓం గం గణపతయే నమః' },
              { title: { en: 'Naivedyam & aarti', te: 'నైవేద్యం & హారతి' }, text: 'Offer fruit or naivedyam, show aarti, and pray for the family\'s welfare. Give food or charity if you wish.' },
            ],
          },
          stotras: ['shiva-ashtottaram', 'vishnu-sahasranamam'],
          note: 'Pitru tarpanam has specific procedures and rules in many traditions; a simple home prayer is not the same as a formal tarpanam. Fasting on Amavasya is optional or tradition-specific. Amavasya emphasises ancestor remembrance, prayer and charity, and its rites depend especially on family and ancestral custom.',
        },
      },
    ],
  },
  {
    id: 'shiva', image: 'shiva',
    title: { en: 'Shiva Pooja & Abhishekam', te: 'శివ పూజ & అభిషేకం' }, deity: { en: 'Lord Shiva', te: 'శ్రీ పరమేశ్వరుడు' },
    when: { en: 'Mondays (especially in Kartika masam), Pradosham evenings, Masa Shivaratri, and Maha Shivaratri night.', te: 'సోమవారాలు (ముఖ్యంగా కార్తీక మాసంలో), ప్రదోషం, మాస శివరాత్రి, మహా శివరాత్రి.' },
    next: (from, place) => [{ date: nextWeekday(from, 1), label: 'Monday' }, ...monthly('pradosham', 'Pradosham')(from, place), ...festival('maha-shivaratri', 'Maha Shivaratri')(from, place).slice(0, 1)],
    samagri: [
      { en: 'Shiva lingam or image', te: 'శివలింగం లేదా పటం' }, { en: 'Water, milk, curd, honey, ghee for abhishekam', te: 'అభిషేకానికి నీరు, పాలు, పెరుగు, తేనె, నెయ్యి' },
      { en: 'Bilva (maredu) leaves — essential', te: 'మారేడు దళాలు — తప్పనిసరి' }, { en: 'Vibhuti, sandal, white flowers, akshatas', te: 'విభూతి, గంధం, తెల్లని పూలు, అక్షతలు' },
      { en: 'Deepam, camphor, agarbatti, bell', te: 'దీపం, కర్పూరం, అగరబత్తి, గంట' },
    ],
    naivedyam: [{ en: 'Fruits, milk, panchamrutam', te: 'పండ్లు, పాలు, పంచామృతం' }, { en: 'Pongali or curd rice', te: 'పొంగలి లేదా దద్ధ్యోదనం' }],
    steps: [
      ...upacharas('Lord Shiva', { dhyanam: MANTRA.panchakshari }).slice(0, 9),
      { title: { en: 'Abhishekam', te: 'అభిషేకం' }, text: 'Pour water slowly over the lingam chanting "Om Namah Shivaya", then milk, curd, honey, ghee and sugar (panchamrutam), and finally clean water. Families who know it recite Rudram (Namakam–Chamakam) during abhishekam.', mantra: MANTRA.panchakshari },
      ...upacharas('Lord Shiva').slice(10, 12),
      { title: { en: 'Bilva archana', te: 'బిల్వార్చన' }, text: 'Offer a bilva leaf (three-leaf sprig, stem towards you) at each of the 108 names below — bilva is dearest to Him. Tulasi is not offered to Shiva. Tap each name as you offer to keep count.', mantra: 'శ్రీ ఉమామహేశ్వర స్వామినే నమః — అష్టోత్తర శతనామ పూజాం సమర్పయామి', namavalis: ['shiva-ashtottaram'] },
      ...upacharas('Lord Shiva').slice(13, 23),
    ],
    short: { mantra: MANTRA.panchakshari, offer: 'water or milk abhishekam, bilva leaves and vibhuti', chant: 'Chant "Om Namah Shivaya" 108 times, or the Maha Mrityunjaya mantra 11 times.', extra: [{ title: { en: 'Mrityunjaya mantra', te: 'మృత్యుంజయ మంత్రం' }, text: 'Many families add this prayer for health and long life.', mantra: MANTRA.mrityunjaya }] },
    stotras: ['shiva-ashtottaram', 'mantra-pushpam'],
  },
  {
    id: 'durga', image: 'durga',
    title: { en: 'Durga Pooja & Navaratri', te: 'దుర్గా పూజ & దసరా నవరాత్రులు' }, deity: { en: 'Goddess Durga', te: 'శ్రీ దుర్గాదేవి' },
    when: { en: 'Devi Navaratri (Ashvayuja Shukla Pratipada to Navami) — the Goddess is decorated in a different alankaram each day; also Tuesdays and Fridays.', te: 'శరన్నవరాత్రులు (ఆశ్వయుజ శుద్ధ పాడ్యమి నుండి నవమి) — రోజుకో అలంకారం; మంగళ, శుక్రవారాలు.' },
    next: (from, place) => [...festival('navaratri', 'Navaratri begins')(from, place).slice(0, 1), ...festival('maha-navami', 'Maha Navami')(from, place).slice(0, 1), ...festival('vijayadashami', 'Vijayadashami')(from, place).slice(0, 1)],
    samagri: [
      { en: 'Durga image; kalasham for Navaratri (kalasha sthapana on day 1)', te: 'దుర్గాదేవి పటం; నవరాత్రి కలశ స్థాపన' }, { en: 'Red flowers, kumkum, turmeric, akshatas', te: 'ఎర్రని పూలు, కుంకుమ, పసుపు, అక్షతలు' },
      { en: 'Saree or blouse piece, bangles, nalla pusalu', te: 'చీర / రవికెల గుడ్డ, గాజులు, నల్లపూసలు' }, { en: 'Akhanda deepam (lamp kept lit through Navaratri), camphor', te: 'అఖండ దీపం, కర్పూరం' },
      { en: 'Bommala koluvu dolls (if your family keeps one)', te: 'బొమ్మల కొలువు (ఆచారం ఉంటే)' },
    ],
    naivedyam: [{ en: 'A different naivedyam each day: pulihora, chitrannam, payasam, garelu, kesari…', te: 'రోజుకో నైవేద్యం: పులిహోర, చిత్రాన్నం, పాయసం, గారెలు, కేసరి…' }],
    steps: [
      ...upacharas('Goddess Durga', { dhyanam: MANTRA.sarvamangala }).slice(0, 5),
      { title: { en: 'Kalasha sthapana (day 1)', te: 'కలశ స్థాపన (మొదటి రోజు)' }, text: 'On the first day of Navaratri, install the kalasham with water, mango leaves and coconut, and light the akhanda deepam to be kept burning for nine days.' },
      ...upacharas('Goddess Durga', { dhyanam: MANTRA.sarvamangala }).slice(6, 23),
      { title: { en: 'Daily alankaram & kumkumarchana', te: 'అలంకారం & కుంకుమార్చన' }, text: 'Decorate the Goddess in that day\'s alankaram (as at Vijayawada Kanaka Durga temple), perform kumkumarchana, and invite married women for tambulam on Fridays.' },
      { title: { en: 'Maha Navami & Vijayadashami', te: 'మహర్నవమి & విజయదశమి' }, text: 'On Maha Navami perform Ayudha Pooja for tools and vehicles; on Vijayadashami do the final pooja, exchange jammi (shami) leaves with elders, and immerse or move the kalasham.' },
    ],
    short: { mantra: MANTRA.sarvamangala, offer: 'red flowers and kumkum', chant: 'Chant "ఓం దుం దుర్గాయై నమః" 108 times, or Lalitha Sahasranamam in Navaratri.' },
    stotras: ['lalitha-sahasranamam', 'mantra-pushpam'],
  },
  {
    id: 'saraswati', image: 'saraswati',
    title: { en: 'Saraswati Pooja', te: 'సరస్వతీ పూజ' }, deity: { en: 'Goddess Saraswati', te: 'శ్రీ సరస్వతీదేవి' },
    when: { en: 'Moola nakshatra day of Navaratri (Telugu custom), Vasant Panchami (Sri Panchami), before exams and at Aksharabhyasam.', te: 'నవరాత్రుల్లో మూలా నక్షత్రం రోజు, శ్రీ పంచమి, పరీక్షల ముందు, అక్షరాభ్యాసం.' },
    next: (from, place) => [...moolaInNavaratri(from, place), ...festival('vasant-panchami', 'Vasant Panchami')(from, place).slice(0, 1)],
    action: { label: { en: 'Find a muhurtam for Aksharabhyasam', te: 'అక్షరాభ్యాసానికి ముహూర్తం' }, activity: 'aksharabhyasam' },
    samagri: [
      { en: 'Saraswati image; books, pens, instruments to be blessed', te: 'సరస్వతీదేవి పటం; పుస్తకాలు, కలాలు, వాయిద్యాలు' }, { en: 'White flowers, sandal, akshatas', te: 'తెల్లని పూలు, గంధం, అక్షతలు' },
      { en: 'Slate and rice for Aksharabhyasam (for children)', te: 'అక్షరాభ్యాసానికి పలక, బియ్యం' }, { en: 'Deepam, camphor, agarbatti', te: 'దీపం, కర్పూరం, అగరబత్తి' },
    ],
    naivedyam: [{ en: 'Payasam, curd rice, fruits', te: 'పాయసం, దద్ధ్యోదనం, పండ్లు' }],
    steps: [
      ...upacharas('Goddess Saraswati', { dhyanam: MANTRA.saraswati }).slice(0, 6),
      { title: { en: 'Keep books & instruments', te: 'పుస్తకాలు ఉంచడం' }, text: 'Place books, pens and musical instruments before the Goddess and apply turmeric-kumkum to them; they are not used until the next morning (on Vijayadashami in Navaratri).' },
      ...upacharas('Goddess Saraswati', { dhyanam: MANTRA.saraswati }).slice(6, 23),
      { title: { en: 'Aksharabhyasam (for children)', te: 'అక్షరాభ్యాసం' }, text: 'Guide the child\'s finger to write "ఓం" and "అ" in rice or on a slate, with the Saraswati prayer.' },
    ],
    short: { mantra: MANTRA.saraswati, offer: 'white flowers and sandal, with books placed before her', chant: 'Chant "ఓం ఐం సరస్వత్యై నమః" 108 times before studies.' },
    stotras: ['mantra-pushpam'],
  },
  {
    id: 'subrahmanya', image: 'kartikeya',
    title: { en: 'Subrahmanya Swamy Pooja', te: 'సుబ్రహ్మణ్య స్వామి పూజ' }, deity: { en: 'Lord Subrahmanya (Kartikeya, Murugan)', te: 'శ్రీ సుబ్రహ్మణ్యేశ్వర స్వామి' },
    when: { en: 'Subrahmanya Shashthi (Margashira Shukla Shashthi), monthly Shukla Shashthi, and Tuesdays.', te: 'సుబ్రహ్మణ్య షష్ఠి (మార్గశిర శుద్ధ షష్ఠి), ప్రతి నెల శుద్ధ షష్ఠి, మంగళవారాలు.' },
    // Tamil Nadu and Kerala keep Skanda Sashti and Thaipusam; the Telugu and Kannada calendars keep Subrahmanya Shashthi.
    next: (from, place, tradition) => [{ date: nextWeekday(from, 2), label: 'Tuesday' }, ...(tradition === 'ta' || tradition === 'ml'
      ? [...festival('skanda-sashti', 'Skanda Sashti')(from, place, tradition).slice(0, 1), ...festival('thaipusam', 'Thaipusam')(from, place, tradition).slice(0, 1)]
      : festival('subrahmanya-shashthi', 'Subrahmanya Shashthi')(from, place, tradition).slice(0, 1))],
    samagri: [
      { en: 'Subrahmanya image or serpent (naga) idol', te: 'సుబ్రహ్మణ్య స్వామి పటం / నాగ ప్రతిమ' }, { en: 'Red flowers, kumkum, vibhuti', te: 'ఎర్రని పూలు, కుంకుమ, విభూతి' },
      { en: 'Milk for abhishekam (at an anthill/naga idol on Shashthi)', te: 'అభిషేకానికి పాలు (షష్ఠికి పుట్టలో)' }, { en: 'Deepam, camphor, agarbatti', te: 'దీపం, కర్పూరం, అగరబత్తి' },
    ],
    naivedyam: [{ en: 'Panchamrutam, bananas, chalimidi', te: 'పంచామృతం, అరటిపండ్లు, చలిమిడి' }],
    steps: [
      ...upacharas('Lord Subrahmanya', { dhyanam: 'ఓం శరవణభవ' }),
      { title: { en: 'Shashthi vratham', te: 'షష్ఠి వ్రతం' }, text: 'On Subrahmanya Shashthi, many families fast till evening, offer milk at an anthill or naga idol, and feed a young boy (Brahmachari) as Swamy\'s form.' },
    ],
    short: { mantra: 'ఓం శరవణభవ', offer: 'red flowers, kumkum and vibhuti', chant: 'Chant "ఓం శరవణభవ" 108 times.' },
    stotras: ['mantra-pushpam'],
  },
  {
    id: 'rama', image: 'rama',
    title: { en: 'Sri Rama Pooja', te: 'శ్రీ రామ పూజ' }, deity: { en: 'Lord Sri Rama (with Sita, Lakshmana, Hanuman)', te: 'శ్రీ సీతారామ లక్ష్మణ హనుమత్ సమేత శ్రీ రామచంద్రుడు' },
    when: { en: 'Sri Rama Navami (Chaitra Shukla Navami, at midday) with Sita Rama Kalyanam; daily Rama nama.', te: 'శ్రీ రామ నవమి (చైత్ర శుద్ధ నవమి, మధ్యాహ్నం) — సీతారామ కళ్యాణం; నిత్య రామనామం.' },
    next: festival('rama-navami', 'Sri Rama Navami'),
    samagri: [
      { en: 'Sita Rama picture (Rama Parivar)', te: 'సీతారాముల పటం (శ్రీరామ పట్టాభిషేకం)' }, { en: 'Tulasi, flowers, akshatas with turmeric', te: 'తులసి, పూలు, పసుపు అక్షతలు' },
      { en: 'For the Kalyanam: mangalasutram, talambralu (turmeric rice), new clothes', te: 'కళ్యాణానికి: మంగళసూత్రం, తలంబ్రాలు, కొత్త వస్త్రాలు' }, { en: 'Deepam, camphor, agarbatti', te: 'దీపం, కర్పూరం, అగరబత్తి' },
    ],
    naivedyam: [{ en: 'Panakam, vadapappu (soaked moong dal), neer majjiga', te: 'పానకం, వడపప్పు, నీర్ మజ్జిగ' }],
    steps: [
      ...upacharas('Sri Rama', { dhyanam: MANTRA.rama }),
      { title: { en: 'Sita Rama Kalyanam', te: 'సీతారామ కళ్యాణం' }, text: 'On Rama Navami, many homes and temples celebrate the divine wedding at midday, ending with talambralu; then share panakam and vadapappu.' },
    ],
    short: { mantra: MANTRA.rama, offer: 'tulasi and flowers', chant: 'Chant "శ్రీ రామ జయ రామ జయ జయ రామ" 108 times.' },
    stotras: ['hanuman-chalisa', 'vishnu-sahasranamam'],
  },
  {
    id: 'krishna', image: 'krishna',
    title: { en: 'Sri Krishna Pooja', te: 'శ్రీ కృష్ణ పూజ' }, deity: { en: 'Lord Sri Krishna', te: 'శ్రీ కృష్ణ పరమాత్మ' },
    when: { en: 'Sri Krishna Janmashtami at midnight (Nishita kalam), and Ekadashi; many keep a fast until midnight.', te: 'శ్రీ కృష్ణాష్టమి అర్ధరాత్రి (నిశీథ కాలం), ఏకాదశి; అర్ధరాత్రి వరకు ఉపవాసం.' },
    // Kerala keeps Ashtami Rohini in the solar month Chingam.
    next: (from, place, tradition) => (tradition === 'ml' ? festival('ashtami-rohini', 'Ashtami Rohini') : festival('janmashtami', 'Sri Krishna Janmashtami'))(from, place, tradition),
    samagri: [
      { en: 'Bala Krishna idol and a small cradle (uyyala)', te: 'బాలకృష్ణుడి విగ్రహం, ఉయ్యాల' }, { en: 'Tulasi, flowers, peacock feather', te: 'తులసి, పూలు, నెమలి పింఛం' },
      { en: 'Rice flour for little footprints from the door', te: 'గుమ్మం నుండి చిన్ని పాదాలకు బియ్యప్పిండి' }, { en: 'Butter, milk, curd for naivedyam', te: 'నైవేద్యానికి వెన్న, పాలు, పెరుగు' },
    ],
    naivedyam: [{ en: 'Butter and sugar (venna), atukulu (poha), milk sweets, fruits', te: 'వెన్న, అటుకులు, పాల స్వీట్లు, పండ్లు' }],
    steps: [
      { title: { en: 'Decorate', te: 'అలంకరణ' }, text: 'Draw little footprints with rice flour from the doorway to the pooja room, as if Bala Krishna is walking in, and decorate the cradle.' },
      ...upacharas('Sri Krishna', { dhyanam: MANTRA.krishna }).slice(1, 23),
      { title: { en: 'Midnight birth & uyyala', te: 'అర్ధరాత్రి జననం & ఉయ్యాల' }, text: 'At midnight, bathe the idol in milk, place it in the cradle and rock it while singing, then offer butter and break the fast with prasadam. Uttaradi (Uriyadi / Utti kottadam) follows the next day in many places.' },
    ],
    short: { mantra: MANTRA.krishna, offer: 'tulasi, flowers and butter', chant: 'Chant "హరే కృష్ణ హరే కృష్ణ కృష్ణ కృష్ణ హరే హరే, హరే రామ హరే రామ రామ రామ హరే హరే" or the shloka 108 times.' },
    stotras: ['vishnu-sahasranamam'],
  },
  {
    id: 'thiruppavai', image: 'andal',
    title: { en: 'Thiruppavai (Dhanurmasam)', te: 'తిరుప్పావై (ధనుర్మాస వ్రతం)' }, deity: { en: 'Sri Krishna & Andal (Goda Devi)', te: 'శ్రీ కృష్ణుడు & గోదాదేవి (ఆండాళ్)' },
    when: { en: 'Every morning of Dhanurmasam (Margazhi, mid-December to Bhogi) before sunrise — one of Andal\'s 30 pasurams for each day. Koodaravalli on the 27th day; Goda Kalyanam on Bhogi.', te: 'ధనుర్మాసం (మార్గళి) నెల రోజులు ప్రతి తెల్లవారుజామున — రోజుకో తిరుప్పావై పాశురం. 27వ రోజు కూడారై, భోగి రోజు గోదా కళ్యాణం.' },
    next: dhanurmasam,
    samagri: [
      { en: 'Picture or idol of Sri Krishna (or Sri Ranganatha) and Andal', te: 'శ్రీ కృష్ణుడు (లేదా శ్రీ రంగనాథుడు), గోదాదేవి పటం / విగ్రహం' },
      { en: 'Tulasi, flowers and a garland for Andal', te: 'తులసి, పూలు, గోదాదేవికి పూలమాల' },
      { en: 'A Thiruppavai book (30 pasurams, in Tamil or in Telugu script)', te: 'తిరుప్పావై పుస్తకం (30 పాశురాలు)' },
      { en: 'Rice flour or colours for the morning kolam / muggu (gobbemmalu with pumpkin flowers in Telugu homes)', te: 'ముగ్గు పిండి / రంగులు (గొబ్బెమ్మలు, గుమ్మడి పూలు)' },
      { en: 'Ghee lamp, agarbatti, camphor', te: 'నేతి దీపం, అగరబత్తి, కర్పూరం' },
      { en: 'Rice, moong dal, ghee, pepper, cumin, cashews (and jaggery for the sweet pongal)', te: 'బియ్యం, పెసరపప్పు, నెయ్యి, మిరియాలు, జీలకర్ర, జీడిపప్పు (చక్కెర పొంగలికి బెల్లం)' },
    ],
    naivedyam: [{ en: 'Ven pongal (katte pongali) or sakkarai (chakkera) pongali, offered before sunrise', te: 'కట్టె పొంగలి లేదా చక్కెర పొంగలి (సూర్యోదయానికి ముందే)' }, { en: 'On Koodaravalli (day 27): akkaravadisal — sweet pongal cooked in milk and rich with ghee', te: 'కూడారై (27వ రోజు): అక్కారవడిసల్ — పాలు, నెయ్యితో చక్కెర పొంగలి' }],
    steps: [
      { title: { en: 'Wake before dawn & kolam', te: 'బ్రాహ్మీ ముహూర్తం & ముగ్గు' }, text: 'Rise in the Brahma muhurtam and bathe. Draw a kolam / muggu at the doorstep — through this month Telugu homes place gobbemmalu (cow-dung cones with pumpkin flowers) on it.' },
      ...upacharas('Sri Krishna', { dhyanam: MANTRA.krishna }).slice(1, 15),
      { title: { en: 'The day\'s pasuram', te: 'ఆనాటి పాశురం' }, text: 'Recite the thaniyans (the opening verses in praise of Andal), then, before naivedyam, the pasuram for the day (the full text is under Stotrams): pasuram 1 on the first day of Dhanurmasam through pasuram 30 on the last — the date chips above show today\'s number. Families who know all 30 sing them every day. At Tirumala, Thiruppavai is sung in place of the Suprabhatam this month.' },
      ...upacharas('Sri Krishna', { dhyanam: MANTRA.krishna }).slice(15, 23),
      { title: { en: 'Koodaravalli (day 27)', te: 'కూడారై (27వ రోజు)' }, text: 'On the 27th day, named after its pasuram, offer akkaravadisal — sweet pongal cooked in milk with plenty of ghee — and share it with family and neighbours.' },
      { title: { en: 'Goda Kalyanam on Bhogi', te: 'భోగి రోజు గోదా కళ్యాణం' }, text: 'The month closes on Bhogi with the wedding of Andal and Sri Ranganatha, held in temples and in many homes with the pasurams of Vaaranam Aayiram.' },
    ],
    short: { mantra: MANTRA.krishna, offer: 'tulasi and flowers to Sri Krishna and Andal', chant: 'Recite the day\'s Thiruppavai pasuram (the date chips above show its number; the text is under Stotrams), then offer pongal.' },
    stotras: ['thiruppavai', 'vishnu-sahasranamam'],
    note: 'The pasurams are in Tamil, by Andal — the full text is under Stotrams, in your script. Srivaishnava families follow their acharya\'s order of recitation.',
  },
  {
    id: 'surya', image: 'surya',
    title: { en: 'Surya Namaskaram & Pooja', te: 'సూర్య నమస్కారం & పూజ' }, deity: { en: 'Lord Surya', te: 'శ్రీ సూర్య భగవానుడు' },
    when: { en: 'Every morning at sunrise, Sundays, Ratha Saptami and Makara Sankranti.', te: 'ప్రతి ఉదయం సూర్యోదయానికి, ఆదివారాలు, రథ సప్తమి, మకర సంక్రాంతి.' },
    next: (from, place) => [{ date: nextWeekday(from, 0), label: 'Sunday' }, ...festival('ratha-saptami', 'Ratha Saptami')(from, place).slice(0, 1), ...festival('makara-sankranti', 'Makara Sankranti')(from, place).slice(0, 1)],
    samagri: [
      { en: 'A copper vessel (chembu) of water with red flowers and akshatas', te: 'ఎర్రని పూలు, అక్షతలతో రాగి చెంబు నీరు' }, { en: 'Red sandal, kumkum', te: 'ఎర్ర చందనం, కుంకుమ' },
      { en: 'Jilledu (arka) leaves for Ratha Saptami bath', te: 'రథ సప్తమి స్నానానికి జిల్లేడు ఆకులు' }, { en: 'Deepam, agarbatti', te: 'దీపం, అగరబత్తి' },
    ],
    naivedyam: [{ en: 'Paramannam (cooked in the sun / on Ratha Saptami), wheat or jaggery sweets', te: 'పరమాన్నం, గోధుమ / బెల్లం తీపి' }],
    steps: [
      { title: { en: 'Bath at sunrise', te: 'సూర్యోదయ స్నానం' }, text: 'Bathe before sunrise; on Ratha Saptami place seven jilledu leaves on the head and shoulders while bathing.' },
      ...upacharas('Lord Surya').slice(1, 5),
      { title: { en: 'Arghyam', te: 'అర్ఘ్యం' }, text: 'Facing the rising sun, pour water from the copper vessel in a steady stream, watching the sun through the water, three times.', mantra: MANTRA.surya },
      { title: { en: 'Surya Namaskarams', te: 'సూర్య నమస్కారాలు' }, text: 'Do 12 (or 3) Surya namaskarams, one with each name of Surya (Om Mitraya Namaha, Om Ravaye Namaha…).' },
      ...upacharas('Lord Surya').slice(11, 23),
    ],
    short: { steps: [
      { title: { en: 'Arghyam at sunrise', te: 'సూర్యోదయ అర్ఘ్యం' }, text: 'After bathing, offer water to the rising sun from a copper vessel three times.', mantra: MANTRA.surya },
      { title: { en: 'Namaskaram', te: 'నమస్కారం' }, text: 'Do 3 or 12 Surya namaskarams, or simply bow and pray for health and clarity.' },
    ] },
    stotras: ['mantra-pushpam'],
  },
  {
    id: 'navagraha', image: 'shani',
    title: { en: 'Shani & Navagraha Pooja', te: 'శని & నవగ్రహ పూజ' }, deity: { en: 'Lord Shani and the nine grahas', te: 'శనైశ్చరుడు & నవగ్రహాలు' },
    when: { en: 'Saturdays, Shani Trayodashi (a Saturday with Trayodashi), and during Sade Sati or Ashtama Shani (see your Horoscope tab).', te: 'శనివారాలు, శని త్రయోదశి, ఏలినాటి శని / అష్టమ శని సమయంలో (జాతకం ట్యాబ్ చూడండి).' },
    next: (from, place) => [{ date: nextWeekday(from, 6), label: 'Saturday' }, ...shaniTrayodashi(from, place)],
    samagri: [
      { en: 'Sesame oil (for Shani tailabhishekam) and a sesame-oil lamp', te: 'నువ్వుల నూనె (తైలాభిషేకం), నువ్వుల నూనె దీపం' }, { en: 'Black sesame (nuvvulu), blue/black cloth', te: 'నల్ల నువ్వులు, నీలం / నలుపు వస్త్రం' },
      { en: 'Navadhanyalu (nine grains) for navagraha pooja', te: 'నవగ్రహ పూజకు నవధాన్యాలు' }, { en: 'Blue flowers (shankupushpam), agarbatti', te: 'శంఖు పుష్పాలు, అగరబత్తి' },
    ],
    naivedyam: [{ en: 'Nuvvula undalu (sesame-jaggery), black urad dal vada', te: 'నువ్వుల ఉండలు, మినప గారెలు' }],
    steps: [
      ...upacharas('Lord Shani').slice(0, 6),
      { title: { en: 'Tailabhishekam', te: 'తైలాభిషేకం' }, text: 'At a temple or before a Shani image, pour sesame oil while chanting the Shani prayer, and offer black sesame and a blue cloth.', mantra: MANTRA.shani },
      { title: { en: 'Navagraha pradakshina', te: 'నవగ్రహ ప్రదక్షిణ' }, text: 'At the temple navagraha mandapam, go around nine times (or 3) clockwise without touching the idols; offer the nine grains, one for each graha.' },
      ...upacharas('Lord Shani').slice(13, 23),
      { title: { en: 'Seva', te: 'సేవ' }, text: 'Shani is pleased by service: helping elders, workers and the needy, or feeding crows and the poor on Saturdays.' },
    ],
    short: { mantra: MANTRA.shani, offer: 'a sesame-oil lamp and black sesame', chant: 'Chant "ఓం శం శనైశ్చరాయ నమః" 108 times, or recite the Hanuman Chalisa (Hanuman protects from Shani\'s trials).' },
    stotras: ['hanuman-chalisa'],
  },
  {
    id: 'narasimha', image: 'narasimha',
    title: { en: 'Lakshmi Narasimha Pooja', te: 'లక్ష్మీ నృసింహ పూజ' }, deity: { en: 'Lord Narasimha', te: 'శ్రీ లక్ష్మీ నృసింహ స్వామి' },
    when: { en: 'Narasimha Jayanti (Vaishakha Shukla Chaturdashi, at dusk), Swati nakshatra days, and Saturdays (Yadagirigutta, Simhachalam, Ahobilam traditions).', te: 'నృసింహ జయంతి (వైశాఖ శుద్ధ చతుర్దశి, సంధ్యా సమయం), స్వాతి నక్షత్రం, శనివారాలు.' },
    next: (from, place) => [...festival('narasimha-jayanti', 'Narasimha Jayanti')(from, place).slice(0, 1), { date: nextWeekday(from, 6), label: 'Saturday' }],
    samagri: [
      { en: 'Lakshmi Narasimha image', te: 'లక్ష్మీ నృసింహ స్వామి పటం' }, { en: 'Tulasi, red and yellow flowers, sandal', te: 'తులసి, ఎర్రని / పసుపు పూలు, గంధం' },
      { en: 'Panakam ingredients (jaggery, pepper, cardamom, water)', te: 'పానకానికి బెల్లం, మిరియాలు, యాలకులు' }, { en: 'Deepam, camphor', te: 'దీపం, కర్పూరం' },
    ],
    naivedyam: [{ en: 'Panakam (Narasimha\'s favourite, as at Mangalagiri), vadapappu, fruits', te: 'పానకం, వడపప్పు, పండ్లు' }],
    steps: [
      ...upacharas('Lord Narasimha', { dhyanam: MANTRA.narasimha }),
      { title: { en: 'Pradosha pooja on Jayanti', te: 'జయంతి సంధ్యా పూజ' }, text: 'Narasimha appeared at dusk, so the Jayanti pooja is done in the evening; many fast until then and offer panakam.' },
    ],
    short: { mantra: MANTRA.narasimha, offer: 'tulasi and flowers', chant: 'Chant the Narasimha mantra 11 times and offer panakam.' },
    stotras: ['vishnu-sahasranamam'],
  },
  {
    id: 'dattatreya', image: 'dattatreya',
    title: { en: 'Dattatreya Pooja', te: 'దత్తాత్రేయ పూజ' }, deity: { en: 'Lord Dattatreya (Guru)', te: 'శ్రీ దత్తాత్రేయ స్వామి' },
    when: { en: 'Thursdays (Guruvaram), Datta Jayanti (Margashira Purnima), and Guru Purnima.', te: 'గురువారాలు, దత్త జయంతి (మార్గశిర పౌర్ణమి), గురు పౌర్ణమి.' },
    next: (from, place) => [{ date: nextWeekday(from, 4), label: 'Thursday' }, ...festival('datta-jayanti', 'Datta Jayanti')(from, place).slice(0, 1), ...festival('guru-purnima', 'Guru Purnima')(from, place).slice(0, 1)],
    samagri: [
      { en: 'Dattatreya image (with the cow and four dogs)', te: 'దత్తాత్రేయ స్వామి పటం' }, { en: 'Yellow flowers, tulasi, sandal, akshatas', te: 'పసుపు పూలు, తులసి, గంధం, అక్షతలు' },
      { en: 'Ghee lamp, camphor, agarbatti', te: 'నేతి దీపం, కర్పూరం, అగరబత్తి' },
    ],
    naivedyam: [{ en: 'Chana dal and jaggery, bananas, milk', te: 'శనగపప్పు బెల్లం, అరటిపండ్లు, పాలు' }],
    steps: [
      ...upacharas('Lord Dattatreya'),
      { title: { en: 'Guru charitra & seva', te: 'గురు చరిత్ర & సేవ' }, text: 'Read a chapter of Sri Guru Charitra on Thursdays, honour your teachers, and feed a cow or a dog — both are associated with Dattatreya.' },
    ],
    short: { mantra: 'దిగంబరా దిగంబరా శ్రీపాద వల్లభ దిగంబరా', offer: 'yellow flowers and tulasi', chant: 'Sing "Digambara Digambara Sripada Vallabha Digambara" or chant "ఓం శ్రీ గురు దత్తాయ నమః" 108 times.' },
    stotras: ['mantra-pushpam'],
  },
  {
    id: 'kubera', image: 'kubera',
    title: { en: 'Kubera Lakshmi Pooja', te: 'కుబేర లక్ష్మీ పూజ' }, deity: { en: 'Lord Kubera with Goddess Lakshmi', te: 'శ్రీ కుబేరుడు & శ్రీ మహాలక్ష్మి' },
    when: { en: 'Dhana Trayodashi (Dhanteras) and Deepavali evening; also Fridays or Thursdays for prosperity, and when opening a new account book or business.', te: 'ధన త్రయోదశి, దీపావళి సాయంత్రం; శుక్ర / గురువారాలు, కొత్త వ్యాపారం / ఖాతా పుస్తకం ప్రారంభం.' },
    next: (from, place) => [...festival('dhanteras', 'Dhana Trayodashi')(from, place).slice(0, 1), ...festival('deepavali', 'Deepavali Lakshmi Kubera Pooja')(from, place).slice(0, 1)],
    action: { label: { en: 'Find a muhurtam to start a business', te: 'వ్యాపార ప్రారంభానికి ముహూర్తం' }, activity: 'business' },
    samagri: [
      { en: 'Kubera and Lakshmi images; Kubera yantra if you have one', te: 'కుబేర, లక్ష్మీ పటాలు; కుబేర యంత్రం (ఉంటే)' }, { en: 'Coins, cash box or account book (kept in pooja)', te: 'నాణేలు, పెట్టె లేదా ఖాతా పుస్తకం' },
      { en: 'Yellow and red flowers, kumkum, turmeric, akshatas', te: 'పసుపు / ఎర్రని పూలు, కుంకుమ, పసుపు, అక్షతలు' }, { en: 'Rows of deepams, camphor', te: 'వరుస దీపాలు, కర్పూరం' },
    ],
    naivedyam: [{ en: 'Payasam, sweets, fruits, dry fruits', te: 'పాయసం, స్వీట్లు, పండ్లు, డ్రై ఫ్రూట్స్' }],
    steps: [
      ...upacharas('Kubera and Lakshmi', { dhyanam: MANTRA.sarvamangala }).slice(0, 12),
      { title: { en: 'Lakshmi archana', te: 'లక్ష్మీ అష్టోత్తర పూజ' }, text: 'Offer kumkum or flowers at each of Mahalakshmi\'s 108 names. Tap each name as you offer to keep count.', mantra: 'శ్రీ మహాలక్ష్మ్యై నమః — అష్టోత్తర శతనామ పూజాం సమర్పయామి', namavalis: ['lakshmi-ashtottaram'] },
      { title: { en: 'Pooja of wealth', te: 'ధన పూజ' }, text: 'Apply turmeric-kumkum to the coins, cash box or new account book, write "శ్రీ" on its first page, and keep them before the deities.' },
      { title: { en: 'Kubera mantra', te: 'కుబేర మంత్రం' }, text: 'Chant the Kubera mantra 108 times with akshatas or flowers.', mantra: 'ఓం యక్షాయ కుబేరాయ వైశ్రవణాయ ధనధాన్యాధిపతయే\\nధనధాన్య సమృద్ధిం మే దేహి దాపయ స్వాహా' },
      ...upacharas('Kubera and Lakshmi').slice(13, 23),
    ],
    short: { mantra: 'ఓం కుబేరాయ నమః', offer: 'flowers and kumkum, with coins or your cash box placed before the images', chant: 'Chant the Kubera mantra 108 times; light a lamp at the entrance in the evening.' },
    stotras: ['lakshmi-ashtottaram', 'mahalakshmi-ashtakam', 'mantra-pushpam'],
  },
  {
    id: 'venkateswara', image: 'venkateswara',
    title: { en: 'Sri Venkateswara Pooja', te: 'శ్రీ వేంకటేశ్వర స్వామి పూజ' }, deity: { en: 'Lord Venkateswara (Srinivasa, Balaji)', te: 'శ్రీ వేంకటేశ్వర స్వామి (శ్రీనివాసుడు)' },
    when: { en: 'Saturdays (especially in Shravana and Bhadrapada masams), Ekadashi, Shravana nakshatra days, and Vaikunta Ekadashi; before and after a Tirumala visit.', te: 'శనివారాలు (ముఖ్యంగా శ్రావణ, భాద్రపద మాసాల్లో), ఏకాదశి, శ్రవణా నక్షత్రం, వైకుంఠ ఏకాదశి; తిరుమల యాత్రకు ముందు, తరువాత.' },
    next: (from, place) => [{ date: nextWeekday(from, 6), label: 'Saturday' }, ...monthly('ekadashi', 'Ekadashi', 20)(from, place)],
    samagri: [
      { en: 'Venkateswara picture (with Padmavathi and Alamelu Manga, if you have it)', te: 'శ్రీ వేంకటేశ్వర స్వామి పటం (పద్మావతి, అలమేలు మంగతో)' },
      { en: 'Tulasi garland and loose tulasi leaves', te: 'తులసి మాల, తులసి దళాలు' }, { en: 'Namam (thiruman and srichurnam), flowers, sandal, akshatas', te: 'నామం (తిరుమణి, శ్రీచూర్ణం), పూలు, గంధం, అక్షతలు' },
      { en: 'Ghee lamp, camphor, agarbatti', te: 'నేతి దీపం, కర్పూరం, అగరబత్తి' }, { en: 'Coins and a saffron cloth for mudupu (vow offering)', te: 'ముడుపు కట్టడానికి నాణేలు, కాషాయ వస్త్రం' },
    ],
    naivedyam: [{ en: 'Chakkera pongali, pulihora, daddojanam, laddu or vada', te: 'చక్కెర పొంగలి, పులిహోర, దద్ధ్యోదనం, లడ్డు లేదా వడ' }],
    steps: [
      ...upacharas('Sri Venkateswara Swamy', { dhyanam: 'ఓం నమో వేంకటేశాయ', nama: 'tulasi leaves are best', namavali: 'venkateswara-ashtottaram' }),
      { title: { en: 'Govinda namalu', te: 'గోవింద నామాలు' }, text: 'Sing the Govinda namalu together — each line ends with "Govinda".', mantra: 'శ్రీనివాసా గోవిందా శ్రీ వేంకటేశా గోవిందా\nభక్తవత్సల గోవిందా భాగవతప్రియ గోవిందా\nగోవిందా హరి గోవిందా వేంకటరమణా గోవిందా' },
      { title: { en: 'Mudupu (vow offering)', te: 'ముడుపు' }, text: 'Families making a vow tie coins in a saffron cloth with turmeric, keep it before the Swamy, and offer it in the Tirumala hundi on their next visit.' },
    ],
    short: { mantra: 'ఓం నమో వేంకటేశాయ', offer: 'tulasi leaves and flowers', chant: 'Recite the 108 names (Stotrams tab) or sing the Govinda namalu.' },
    stotras: ['venkateswara-ashtottaram', 'vishnu-sahasranamam'],
  },
  {
    id: 'pinda', image: 'pinda',
    title: { en: 'Pinda Pradanam (Shraddha)', te: 'పిండ ప్రదానం (శ్రాద్ధం)' }, deity: { en: 'Pitrus — the family\'s ancestors', te: 'పితృదేవతలు' },
    when: { en: 'On each ancestor\'s annual Shraddha (the death thithi, in the Aparahna — afternoon — period), during Mahalaya Paksha (Bhadrapada Bahula Paksha), on Mahalaya Amavasya, and at holy places such as Gaya, Kashi and Prayag. Monthly Amavasya tarpanam is the simpler form.', te: 'ప్రతి సంవత్సరం పెద్దల తిథి నాడు (అపరాహ్ణ కాలంలో), మహాలయ పక్షంలో (భాద్రపద బహుళ పక్షం), మహాలయ అమావాస్య నాడు, గయ, కాశీ, ప్రయాగ వంటి క్షేత్రాల్లో. ప్రతి అమావాస్య తర్పణం సంక్షిప్త రూపం.' },
    next: (from, place) => [
      ...festival('pitru-paksha', 'Mahalaya Paksha begins')(from, place).slice(0, 1),
      ...festival('mahalaya-amavasya', 'Mahalaya Amavasya')(from, place).slice(0, 1),
      ...monthly('amavasya', 'Amavasya (tarpanam)')(from, place),
    ],
    samagri: [
      { en: 'Darbha (kusha) grass, and a darbha pavitram (ring) for the right ring finger', te: 'దర్భలు, కుడి ఉంగరపు వేలికి దర్భ పవిత్రం' },
      { en: 'Black sesame (nalla nuvvulu) — essential', te: 'నల్ల నువ్వులు — తప్పనిసరి' },
      { en: 'Cooked rice for the pindas, with ghee, honey or milk, and black sesame mixed in', te: 'పిండాలకు అన్నం, నెయ్యి, తేనె లేదా పాలు, నల్ల నువ్వులు' },
      { en: 'Banana leaves or darbha to place the pindas on', te: 'పిండాలు ఉంచడానికి అరటి ఆకులు / దర్భలు' },
      { en: 'Water in a vessel (copper or silver; avoid iron), a plate and uddharini', te: 'పాత్రలో నీరు (రాగి / వెండి; ఇనుము వద్దు), పళ్ళెం, ఉద్ధరిణి' },
      { en: 'White flowers, tulasi, sandal, a ghee lamp, agarbatti', te: 'తెల్లని పూలు, తులసి, గంధం, నేతి దీపం, అగరబత్తి' },
      { en: 'Swayampakam (rice, dal, vegetables, ghee) and dakshina for the Brahmana / purohit', te: 'బ్రాహ్మణునికి స్వయంపాకం (బియ్యం, పప్పు, కూరగాయలు, నెయ్యి), దక్షిణ' },
      { en: 'Dhoti and uttariyam (upper cloth) for the karta', te: 'కర్తకు పంచె, ఉత్తరీయం' },
    ],
    naivedyam: [{ en: 'Simple satvic food without onion or garlic — the ancestor\'s favourite dishes are traditionally included', te: 'ఉల్లి, వెల్లుల్లి లేని సాత్విక భోజనం — పెద్దలకు ఇష్టమైన వంటలు చేయడం ఆచారం' }],
    steps: [
      { title: { en: 'Who performs it & preparation', te: 'కర్త & సిద్ధత' }, text: 'The karta — traditionally the son, or the nearest eligible family member — performs it, usually guided by a purohit. Bathe, wear a washed dhoti and uttariyam, and do not eat before the rite. Prepare satvic food without onion or garlic. The rite is done in the Aparahna (afternoon) period of the death thithi; see your family\'s Shraddha dates below.' },
      ...upacharas('Sri Maha Vishnu').slice(1, 2),
      { title: { en: 'Pavitram & pranayamam', te: 'పవిత్ర ధారణ & ప్రాణాయామం' }, text: 'Wear the darbha pavitram on the right ring finger, sit on a darbha asanam, and do pranayamam.', mantra: MANTRA.pranayamam },
      {
        title: { en: 'Sankalpam (Shraddha)', te: 'సంకల్పం (శ్రాద్ధం)' }, kind: 'sankalpam', preeti: 'శ్రీ పరమేశ్వర',
        text: 'Turn the yajnopavitam (sacred thread) to the right shoulder — prachinaviti — as is done for all pitru karyas, and face south. Take water and black sesame in the right palm and say the sankalpam, adding the names, gotram and relation of the ancestors as your purohit guides. Leave the water in the plate.',
        sankalpaEnding: ['ప్రాచీనావీతీ — అస్మత్ పితృ పితామహ ప్రపితామహానాం (మాతామహాదీనాం చ)', 'అక్షయ తృప్త్యర్థం, పిండ ప్రదాన పూర్వక శ్రాద్ధం కరిష్యే ॥'],
      },
      { title: { en: 'Avahanam of the pitrus', te: 'పితృ ఆవాహనం' }, text: 'Spread darbha with the tips pointing south and invite the three generations — father (Vasu rupa), grandfather (Rudra rupa) and great-grandfather (Aditya rupa) — and, as per family custom, the maternal side, offering black sesame onto the darbha.' },
      { title: { en: 'Tila tarpanam', te: 'తిల తర్పణం' }, text: 'For each ancestor, pour water mixed with black sesame from the right palm over the base of the thumb (pitru tirtha) onto the darbha, three times, saying their gotram and name. For father, grandfather and great-grandfather, say Vasu, Rudra and Aditya rupan respectively.', mantra: '______ గోత్రాన్ ______ శర్మణః వసురూపాన్ పితౄన్ స్వధా నమస్తర్పయామి (3 సార్లు)\n______ గోత్రాన్ ______ శర్మణః రుద్రరూపాన్ పితామహాన్ స్వధా నమస్తర్పయామి\n______ గోత్రాన్ ______ శర్మణః ఆదిత్యరూపాన్ ప్రపితామహాన్ స్వధా నమస్తర్పయామి' },
      { title: { en: 'Preparing the pindas', te: 'పిండాల తయారీ' }, text: 'Mix the cooked rice with ghee, honey or milk and black sesame, and shape round pindas — usually three for the paternal generations (and three more for the maternal side, if offered). Keep them on banana leaf or darbha.' },
      { title: { en: 'Pinda pradanam', te: 'పిండ ప్రదానం' }, text: 'Facing south, place one pinda on the darbha for each ancestor while saying their name with "స్వధా". Offer water, black sesame, sandal, white flowers and tulasi to the pindas, show the lamp and agarbatti, and pray for the ancestors\' peace.', mantra: '______ గోత్రస్య ______ శర్మణః వసురూపస్య ఏష పిండః స్వధా' },
      { title: { en: 'Brahmana bhojanam / swayampakam', te: 'బ్రాహ్మణ భోజనం / స్వయంపాకం' }, text: 'Offer food, or swayampakam (uncooked provisions), with dakshina to the purohit or a Brahmana, who is honoured as the representative of the pitrus. Families who cannot do this give food to the needy.' },
      { title: { en: 'Pinda visarjanam', te: 'పిండ విసర్జనం' }, text: 'The pindas are given to crows (seen as messengers of the pitrus), to a cow, or immersed in flowing water. Many families wait for a crow to accept the offering.' },
      { title: { en: 'Pradakshina & kshamapana', te: 'ప్రదక్షిణ & క్షమాపణ' }, text: 'Turn the sacred thread back to the left shoulder (upaviti), do pradakshina and namaskaram, and ask forgiveness for any mistakes. The family eats only after the purohit and the crows have been fed.', mantra: MANTRA.kshamapana },
    ],
    short: { steps: [
      { title: { en: 'Prepare', te: 'సిద్ధత' }, text: 'Bathe, wear clean clothes, face south, and keep water, black sesame and darbha (or just water and sesame) ready. This simple form is the monthly Amavasya tarpanam, or what families do when a full Shraddha with a purohit is not possible.' },
      { title: { en: 'Tila tarpanam', te: 'తిల తర్పణం' }, text: 'With the sacred thread on the right shoulder (if worn), pour water with black sesame from the right palm over the base of the thumb, three times for each ancestor, remembering their name and gotram.', mantra: '______ గోత్రాన్ ______ శర్మణః వసురూపాన్ పితౄన్ స్వధా నమస్తర్పయామి (3 సార్లు)' },
      { title: { en: 'Food for crows & the needy', te: 'కాకులకు & అవసరమైనవారికి అన్నం' }, text: 'Place a small ball of rice with black sesame for the crows, and give food or provisions to someone in need in the ancestors\' name.' },
      { title: { en: 'Lamp & prayer', te: 'దీపం & ప్రార్థన' }, text: 'Light a lamp facing south, pray for the ancestors\' peace, and ask their blessings for the family.' },
    ] },
    stotras: ['vishnu-sahasranamam'],
    note: 'Customs differ widely between families and regions (number of pindas, maternal side, Sapindikarana, the first-year rites). For the annual Shraddha, follow your purohit\'s and elders\' guidance.',
  },
];

// Varalakshmi vratham's short form: Ganapathi, sankalpam, dhyanam and avahanam, the names, the thoram, harathi.
{
  const v = POOJAS.find((p) => p.id === 'varalakshmi')!;
  const keep = ['Ganapathi pooja', 'Sankalpam', 'Dhyanam', 'Avahanam'];
  v.short.steps = [
    ...v.steps.filter((st) => keep.includes(st.title.en)),
    { title: { en: 'Offering', te: 'సమర్పణ' }, text: 'Offer kumkum or flowers at each of Lakshmi Devi\'s 108 names (tap each to keep count).', namavalis: ['lakshmi-ashtottaram'] },
    v.steps.find((st) => st.title.en === 'Thoram bandhanam')!,
    { title: { en: 'Naivedyam & harathi', te: 'నైవేద్యం & హారతి' }, text: 'Offer the naivedyam and fruit, then show camphor harathi. Give vayanam to married women if you can.' },
    { title: { en: 'Namaskaram', te: 'నమస్కారం' }, text: 'Bow down, ask forgiveness for any shortcomings, and take the prasadam.', mantra: MANTRA.kshamapana },
  ];
}

// Nithya pooja's short form: the essentials of the opening, then offering, harathi and namaskaram.
{
  const n = POOJAS.find((p) => p.id === 'nithya')!;
  const keep = ['Ganapathi dhyanam', 'Deeparadhana', 'Achamanam', 'Mangala shlokas', 'Sankalpam'];
  n.short.steps = [
    ...n.steps.filter((st) => keep.includes(st.title.en)),
    { title: { en: 'Offering', te: 'సమర్పణ' }, text: 'Offer flowers, turmeric-kumkum and akshatas to your ishta devata, chanting their name.' },
    { title: { en: 'Naivedyam & harathi', te: 'నైవేద్యం & హారతి' }, text: 'Offer fruit, jaggery or a sweet, then show camphor harathi with the ekaharathi.' },
    { title: { en: 'Namaskaram', te: 'నమస్కారం' }, text: 'Bow down, ask forgiveness for any shortcomings, and take the prasadam.', mantra: MANTRA.kshamapana },
  ];
}

// The vehicle pooja's short form is the core of its detailed steps.
{
  const v = POOJAS.find((p) => p.id === 'vehicle')!;
  const core = ['Ganapathi prarthana', 'Decorate & apply turmeric-kumkum', 'Harathi', 'Coconut & lemons'];
  v.short.steps = v.steps.filter((st) => core.includes(st.title.en));
}

export const POOJA_NOTE = 'Steps follow common Telugu household practice. Family customs, sampradayam and your purohit\'s guidance come first.';
export const REGIONAL_POOJA_NOTE = 'Steps follow the common household practice of your region. Family customs, sampradayam and your purohit\'s guidance come first.';
