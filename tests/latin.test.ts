import { toLatin } from '../src/engine/script';

describe('English letters', () => {
  it('writes Telugu-script Sanskrit the way bhajan books do', () => {
    expect(toLatin('ఓం నమః శివాయ')).toBe('Om namah shivaaya');
    expect(toLatin('శుక్లాంబరధరం విష్ణుం శశివర్ణం చతుర్భుజం')).toBe('Shuklaambaradharam vishnum shashivarnam chaturbhujam');
    expect(toLatin('గోవింద శంకర శంభో')).toBe('Govinda shankara shambho');
    expect(toLatin('లక్ష్మీ జ్ఞాన')).toBe('Lakshmee gnyaana');
    expect(toLatin('అయ్యప్ప స్వామియే శరణం ॥ ౧ ॥')).toBe('Ayyappa svaamiye sharanam ॥ 1 ॥');
    expect(toLatin('కృష్ణ\nరామ')).toBe('Krishna\nRaama');
  });
});
