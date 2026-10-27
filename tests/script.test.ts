import { fromTelugu, tamilTextFromTelugu } from '../src/engine/script';

describe('script conversion (Sanskrit in Telugu script)', () => {
  it('maps to Devanagari letter for letter', () => {
    expect(fromTelugu('గణేశాయ నమః', 'devanagari')).toBe('गणेशाय नमः');
    expect(fromTelugu('శ్రీకృష్ణ', 'devanagari')).toBe('श्रीकृष्ण');
    // Telugu short e/o become the Sanskrit long ones.
    expect(fromTelugu('దెవ', 'devanagari')).toBe('देव');
  });

  it('maps to Kannada and Malayalam', () => {
    expect(fromTelugu('గణేశాయ నమః', 'kannada')).toBe('ಗಣೇಶಾಯ ನಮಃ');
    expect(fromTelugu('గణేశాయ నమః', 'malayalam')).toBe('ഗണേശായ നമഃ');
  });

  it('marks voiced and aspirated sounds in Tamil after the whole syllable', () => {
    expect(fromTelugu('గణేశాయ', 'tamil')).toBe('க³ணேஶாய');
    expect(fromTelugu('భగవాన్', 'tamil')).toBe('ப⁴க³வான்');
    expect(fromTelugu('బుద్ధి', 'tamil')).toBe('பு³த்³தி⁴');
    expect(fromTelugu('కృష్ణ', 'tamil')).toBe('க்ருஷ்ண');
    expect(fromTelugu('నమః', 'tamil')).toBe('நம:');
    expect(fromTelugu('మనసా', 'tamil')).toBe('மனஸா');
    expect(fromTelugu('అనంత', 'tamil')).toBe('அனந்த');
    expect(fromTelugu('నంద', 'tamil')).toBe('நந்த³');
    expect(fromTelugu('సన్తు', 'tamil')).toBe('ஸந்து');
    expect(fromTelugu('శంకర', 'tamil')).toBe('ஶங்கர');
    expect(fromTelugu('సంసార', 'tamil')).toBe('ஸம்ஸார');
    expect(fromTelugu('శాంతిః', 'tamil')).toBe('ஶாந்தி:');
  });

  it('digits: native in Kannada/Devanagari, Western in Tamil/Malayalam', () => {
    expect(fromTelugu('॥ ౧౨ ॥', 'devanagari')).toBe('॥ १२ ॥');
    expect(fromTelugu('॥ ౧౨ ॥', 'kannada')).toBe('॥ ೧೨ ॥');
    expect(fromTelugu('॥ ౧౨ ॥', 'tamil')).toBe('॥ 12 ॥');
    expect(fromTelugu('॥ ౧౨ ॥', 'malayalam')).toBe('॥ 12 ॥');
  });

  it('leaves Telugu and non-Telugu text alone', () => {
    expect(fromTelugu('గణేశ', 'telugu')).toBe('గణేశ');
    expect(fromTelugu('Om 108', 'devanagari')).toBe('Om 108');
  });
});

describe('Tamil texts in Telugu script', () => {
  it('go back to plain Tamil spelling, without chanting marks', () => {
    expect(tamilTextFromTelugu('మార్గఴి త్తింగళ్ మది నిఱైంద నన్నాళాల్', 'tamil')).toBe('மார்கழி த்திங்கள் மதி நிறைந்த நன்னாளால்');
    expect(tamilTextFromTelugu('కూర్ వేల్ కొడుందొఴిలన్ నందగోబన్ కుమరన్', 'tamil')).toBe('கூர் வேல் கொடுந்தொழிலன் நந்தகோபன் குமரன்');
    expect(tamilTextFromTelugu('ఊట్రం ఉడైయాయ్', 'tamil')).toBe('ஊற்றம் உடையாய்');
  });
  it('write ழ in the other scripts too', () => {
    expect(tamilTextFromTelugu('ఆఴి', 'kannada')).toBe('ಆೞಿ');
    expect(tamilTextFromTelugu('ఆఴి', 'malayalam')).toBe('ആഴി');
    expect(tamilTextFromTelugu('ఆఴి', 'devanagari')).toBe('आऴि');
  });
});

describe('Bengali, Gujarati, Odia and Gurmukhi', () => {
  it('maps letter for letter, with each script\'s own spelling of missing letters', () => {
    expect(fromTelugu('గణేశాయ నమః', 'bengali')).toBe('গণেশায় নমঃ'.replace('য়', 'য'));
    expect(fromTelugu('శ్రీ విష్ణవే నమః', 'bengali')).toBe('শ্রী বিষ্ণবে নমঃ');
    expect(fromTelugu('గణేశాయ నమః', 'gujarati')).toBe('ગણેશાય નમઃ');
    expect(fromTelugu('శ్రీ విష్ణవే నమః', 'odia')).toBe('ଶ୍ରୀ ବିଷ୍ଣବେ ନମଃ');
    expect(fromTelugu('దెవ', 'gujarati')).toBe('દેવ');
    expect(fromTelugu('శివ', 'gurmukhi')).toBe('ਸ਼ਿਵ');
    expect(fromTelugu('కృష్ణ', 'gurmukhi')).toBe('ਕ੍ਰਿਸ਼੍ਣ');
  });

  it('never produces unassigned characters for any stotram', async () => {
    const stotras = (await import('../src/data/stotras.json')).default as unknown;
    const text = JSON.stringify(stotras);
    for (const script of ['bengali', 'gujarati', 'odia', 'gurmukhi'] as const) {
      const out = fromTelugu(text, script);
      expect(out.match(/\p{Cn}/gu), script).toBeNull();
      expect(out.match(/[ఀ-౿]/g), script).toBeNull();
    }
  });
});
