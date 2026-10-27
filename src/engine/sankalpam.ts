// Fills the sankalpam with the day's panchangam, as a purohit recites it: samvatsaram, ayanam,
// ritu, masam, paksham, thithi, vaaram, nakshatram, and the place (in India, the direction from
// Srisailam; abroad, the continent as commonly said by Telugu families there).
import { sunSidereal } from './astro';
import { nakshatraName, tithiName } from './names';
import { dayPanchang, type Place } from './panchang';
import type { CivilDate } from './tz';

export const SAMVATSARA_TE = [
  'ప్రభవ', 'విభవ', 'శుక్ల', 'ప్రమోదూత', 'ప్రజోత్పత్తి', 'ఆంగీరస', 'శ్రీముఖ', 'భావ', 'యువ', 'ధాత',
  'ఈశ్వర', 'బహుధాన్య', 'ప్రమాది', 'విక్రమ', 'వృష', 'చిత్రభాను', 'స్వభాను', 'తారణ', 'పార్థివ', 'వ్యయ',
  'సర్వజిత్', 'సర్వధారి', 'విరోధి', 'వికృతి', 'ఖర', 'నందన', 'విజయ', 'జయ', 'మన్మథ', 'దుర్ముఖి',
  'హేవిళంబి', 'విళంబి', 'వికారి', 'శార్వరి', 'ప్లవ', 'శుభకృత్', 'శోభకృత్', 'క్రోధి', 'విశ్వావసు', 'పరాభవ',
  'ప్లవంగ', 'కీలక', 'సౌమ్య', 'సాధారణ', 'విరోధికృత్', 'పరీధావి', 'ప్రమాదీచ', 'ఆనంద', 'రాక్షస', 'నల',
  'పింగళ', 'కాళయుక్తి', 'సిద్ధార్థి', 'రౌద్రి', 'దుర్మతి', 'దుందుభి', 'రుధిరోద్గారి', 'రక్తాక్షి', 'క్రోధన', 'అక్షయ',
];
const MASA = ['చైత్ర', 'వైశాఖ', 'జ్యేష్ఠ', 'ఆషాఢ', 'శ్రావణ', 'భాద్రపద', 'ఆశ్వయుజ', 'కార్తీక', 'మార్గశిర', 'పుష్య', 'మాఘ', 'ఫాల్గుణ'];
const RITU = ['వసంత ఋతౌ', 'గ్రీష్మ ఋతౌ', 'వర్ష ఋతౌ', 'శరదృతౌ', 'హేమంత ఋతౌ', 'శిశిర ఋతౌ'];
const VASARA = ['భానువాసరే', 'ఇందువాసరే', 'భౌమవాసరే', 'సౌమ్యవాసరే', 'గురువాసరే', 'భృగువాసరే', 'స్థిరవాసరే'];
const DIRECTION = ['ఉత్తర', 'ఈశాన్య', 'పూర్వ', 'ఆగ్నేయ', 'దక్షిణ', 'నైరృతి', 'పశ్చిమ', 'వాయవ్య'];
const SRISAILAM = { lat: 16.0722, lon: 78.8682 };

function bearing(fromLat: number, fromLon: number, toLat: number, toLon: number): number {
  const r = Math.PI / 180;
  const y = Math.sin((toLon - fromLon) * r) * Math.cos(toLat * r);
  const x = Math.cos(fromLat * r) * Math.sin(toLat * r) - Math.sin(fromLat * r) * Math.cos(toLat * r) * Math.cos((toLon - fromLon) * r);
  return ((Math.atan2(y, x) / r) + 360) % 360;
}

export interface SankalpamParts {
  place: string;
  samvatsaram: string;
  ayanam: string;
  ritu: string;
  masam: string;
  paksham: string;
  tithi: string;
  vasaram: string;
  nakshatram: string;
  abroad: boolean;
}

export function sankalpamParts(date: CivilDate, place: Place): SankalpamParts {
  const p = dayPanchang(date, place);
  const sun = sunSidereal(p.sunrise);
  const t = p.tithis[0].index;
  const india = place.tz === 'Asia/Kolkata';
  let where: string;
  if (india) {
    const dir = DIRECTION[Math.round(bearing(SRISAILAM.lat, SRISAILAM.lon, place.lat, place.lon) / 45) % 8];
    where = `జంబూద్వీపే, భరతవర్షే, భరతఖండే, మేరోః దక్షిణ దిగ్భాగే, శ్రీశైలస్య ${dir} ప్రదేశే`;
  } else if (place.tz.startsWith('America/')) where = 'అమెరికా ఖండే';
  else if (place.tz.startsWith('Europe/')) where = 'ఐరోపా ఖండే';
  else if (place.tz.startsWith('Australia/') || place.tz === 'Pacific/Auckland') where = 'ఆస్ట్రేలియా ఖండే';
  else if (place.tz.startsWith('Africa/')) where = 'ఆఫ్రికా ఖండే';
  else where = 'జంబూద్వీపే';
  return {
    place: where,
    samvatsaram: `శ్రీ ${SAMVATSARA_TE[p.samvatsara]} నామ సంవత్సరే`,
    ayanam: sun >= 270 || sun < 90 ? 'ఉత్తరాయణే' : 'దక్షిణాయనే',
    ritu: RITU[Math.floor(p.month.index / 2)],
    masam: `${p.month.adhika ? 'అధిక ' : ''}${MASA[p.month.index]} మాసే`,
    paksham: t < 15 ? 'శుక్ల పక్షే' : 'కృష్ణ పక్షే',
    tithi: `${tithiName(t, 'te')} తిథౌ`,
    vasaram: VASARA[p.weekday],
    nakshatram: `${nakshatraName(p.nakshatras[0].index, 'te')} నక్షత్రే`,
    abroad: !india,
  };
}

/** The full sankalpam, with the family's name and gotram filled in where given. `ending` replaces the
 *  closing resolve (e.g. for Shraddha, which is for the ancestors rather than the family's welfare). */
export function sankalpamText(date: CivilDate, place: Place, poojaTe: string, who: { name?: string; gotram?: string } = {}, ending?: string[]): string {
  const s = sankalpamParts(date, place);
  return [
    'మమోపాత్త సమస్త దురితక్షయ ద్వారా శ్రీ పరమేశ్వర ప్రీత్యర్థం,',
    'శుభే శోభనే ముహూర్తే, శ్రీ మహావిష్ణోరాజ్ఞయా ప్రవర్తమానస్య, అద్య బ్రహ్మణః ద్వితీయ పరార్థే,',
    'శ్వేతవరాహ కల్పే, వైవస్వత మన్వంతరే, కలియుగే, ప్రథమ పాదే,',
    `${s.place},`,
    'అస్మిన్ వర్తమాన వ్యావహారిక చాంద్రమానేన',
    `${s.samvatsaram}, ${s.ayanam}, ${s.ritu}, ${s.masam}, ${s.paksham},`,
    `${s.tithi}, ${s.vasaram}, ${s.nakshatram}, శుభయోగే, శుభకరణే,`,
    'ఏవంగుణ విశేషణ విశిష్టాయాం శుభతిథౌ,',
    `శ్రీమాన్ ${who.gotram?.trim() || '______'} గోత్రః, ${who.name?.trim() || '______'} నామధేయః, ధర్మపత్నీ సమేతః,`,
    ...(ending ?? [
      'అస్మాకం సహకుటుంబానాం క్షేమ స్థైర్య విజయ అభయ ఆయురారోగ్య ఐశ్వర్యాభివృద్ధ్యర్థం,',
      'ధర్మార్థ కామ మోక్ష చతుర్విధ ఫల పురుషార్థ సిద్ధ్యర్థం,',
      `${poojaTe} ప్రీత్యర్థం, యావచ్ఛక్తి ధ్యానావాహనాది షోడశోపచార పూజాం కరిష్యే ॥`,
    ]),
  ].join('\n');
}
