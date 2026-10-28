import { POOJAS } from '../src/data/poojas';
import { sankalpamParts, sankalpamText } from '../src/engine/sankalpam';
import { HYD, NJ } from './fixtures';

describe('sankalpam', () => {
  it('fills in the day for Hyderabad on 25 Oct 2026 (Parabhava, Dakshinayana, Sharad, Ashvayuja, Sunday)', () => {
    const p = sankalpamParts('2026-10-25', HYD);
    expect(p.samvatsaram).toBe('శ్రీ పరాభవ నామ సంవత్సరే');
    expect(p.ayanam).toBe('దక్షిణాయనే');
    expect(p.ritu).toBe('శరదృతౌ');
    expect(p.masam).toBe('ఆశ్వయుజ మాసే');
    expect(p.paksham).toBe('శుక్ల పక్షే');
    expect(p.vasaram).toBe('భానువాసరే');
    expect(p.place).toContain('శ్రీశైలస్య ఉత్తర ప్రదేశే');
    expect(p.abroad).toBe(false);
  });
  it('uses Uttarayana after Makara Sankranti and the continent abroad', () => {
    expect(sankalpamParts('2027-02-10', HYD).ayanam).toBe('ఉత్తరాయణే');
    expect(sankalpamParts('2026-10-25', NJ).place).toBe('అమెరికా ఖండే');
  });
  it('includes the name, gotram and deity', () => {
    const t = sankalpamText('2026-10-25', HYD, 'శ్రీ ఉమామహేశ్వర స్వామి', { name: 'రవి', gotram: 'కౌశిక' });
    expect(t).toContain('కౌశిక గోత్రః');
    expect(t).toContain('రవి నామధేయః');
    expect(t).toContain('శ్రీ ఉమామహేశ్వర స్వామి ప్రీత్యర్థం');
  });
});

describe('detailed poojas', () => {
  it('every detailed pooja has a live sankalpam and the exact words for most steps', () => {
    for (const p of POOJAS) {
      const sk = p.steps.filter((s) => s.kind === 'sankalpam');
      expect(sk.length, p.id).toBe(1);
      expect(sk[0].preeti, p.id).toBeTruthy();
      const withWords = p.steps.filter((s) => s.mantra || s.kind).length;
      // The family-occasion guides leave the words to each family's tradition, apart from the opening prayer and sankalpam.
      const min = ['birthday', 'anniversary', 'purnima-amavasya'].includes(p.id) ? 0.25 : ['vehicle', 'satyanarayana', 'ugadi', 'pinda'].includes(p.id) ? 0.4 : 0.6;
      expect(withWords / p.steps.length, p.id).toBeGreaterThan(min);
      for (const v of p.variants ?? []) if (v.guide.steps) expect(v.guide.steps.filter((s) => s.kind === 'sankalpam').length, `${p.id} ${v.id}`).toBe(1);
    }
  });
  it('full poojas have the complete shodashopachara sequence', () => {
    for (const id of ['ganapathi', 'lakshmi', 'shiva', 'rama', 'lalitha', 'vishnu']) {
      const p = POOJAS.find((x) => x.id === id)!;
      expect(p.steps.length, id).toBeGreaterThanOrEqual(20);
      const words = p.steps.map((s) => s.mantra ?? '').join(' ');
      for (const w of ['ఆసనం', 'పాద్యం', 'నైవేద్యం', 'తాంబూలం', 'నీరాజనం', 'ప్రదక్షిణ']) expect(words, `${id}: ${w}`).toContain(w);
    }
  });
  it('goddesses get haridra-kumkuma and mangalyam, gods get yajnopavitam', () => {
    const words = (id: string) => POOJAS.find((x) => x.id === id)!.steps.map((s) => s.mantra ?? '').join(' ');
    expect(words('lakshmi')).toContain('మాంగళ్య సూత్రం');
    expect(words('lakshmi')).not.toContain('యజ్ఞోపవీతం');
    expect(words('shiva')).toContain('యజ్ఞోపవీతం');
  });
});

describe('shraddha sankalpam', () => {
  it('replaces the welfare resolve with the ancestors\' one', () => {
    const t = sankalpamText('2026-10-25', HYD, 'శ్రీ పరమేశ్వర', {}, ['అక్షయ తృప్త్యర్థం, పిండ ప్రదాన పూర్వక శ్రాద్ధం కరిష్యే ॥']);
    expect(t).toContain('శ్రాద్ధం కరిష్యే');
    expect(t).not.toContain('షోడశోపచార పూజాం');
    expect(t).not.toContain('ఐశ్వర్యాభివృద్ధ్యర్థం');
  });
});
