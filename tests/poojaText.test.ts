import { POOJAS, POOJA_NOTE, poojaForTradition, shortSteps } from '../src/data/poojas';
import { REGIONAL_CUSTOMS } from '../src/data/regionalCustoms';
import { poojaStrings, textKey } from '../src/data/poojaText';

describe('pooja text catalog', () => {
  const strings = new Set(poojaStrings());

  it('collects every step, short step, samagri item and regional custom shown on the pooja screens', () => {
    for (const p of POOJAS) {
      for (const st of [...p.steps, ...shortSteps(p)]) {
        expect(strings.has(st.title.en), `${p.id}: ${st.title.en}`).toBe(true);
        expect(strings.has(st.text), `${p.id}: ${st.text.slice(0, 40)}`).toBe(true);
      }
      p.samagri.forEach((s) => expect(strings.has(s.en)).toBe(true));
    }
    const gujarat = poojaForTradition(POOJAS.find((p) => p.id === 'ugadi')!, 'gu');
    expect(strings.has(gujarat.steps.at(-1)!.text)).toBe(true);
    const custom = Object.values(REGIONAL_CUSTOMS).flatMap((r) => Object.values(r))[0]!;
    expect(strings.has(custom.customs[0].en)).toBe(true);
    expect(strings.has(POOJA_NOTE)).toBe(true);
  });

  it('never sends mantras or Indian-script-only text for translation', () => {
    for (const s of strings) expect(/[A-Za-z]/.test(s)).toBe(true);
    const mantra = POOJAS.flatMap((p) => p.steps).find((st) => st.mantra)!.mantra!;
    expect(strings.has(mantra)).toBe(false);
  });

  it('keys are stable and distinct', () => {
    expect(textKey('Offer flowers.')).toBe(textKey('Offer flowers.'));
    expect(new Set([...strings].map(textKey)).size).toBe(strings.size);
  });
});
