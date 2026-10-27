// Converts Sanskrit written in Telugu script (stotrams, namavalis, mantras) into the other Indian
// scripts the app supports. Kannada, Devanagari and Malayalam share Telugu's Unicode layout, so
// letters map one to one by offset. Tamil script has one letter for each group of four stops
// (ka/kha/ga/gha), so the common stotram-book convention is used: superscript ²³⁴ after the
// syllable marks the aspirated and voiced sounds (க² = kha, க³ = ga, க⁴ = gha).
// Only for Sanskrit text: Telugu-language words (song lyrics, Telugu names) are not converted.

export type Script = 'telugu' | 'kannada' | 'devanagari' | 'malayalam' | 'tamil' | 'bengali' | 'gujarati' | 'odia' | 'gurmukhi';

const TE_START = 0x0c00, TE_END = 0x0c7f;
const OFFSET: Record<Exclude<Script, 'telugu' | 'tamil'>, number> = {
  kannada: 0x0c80 - TE_START,
  devanagari: 0x0900 - TE_START,
  malayalam: 0x0d00 - TE_START,
  bengali: 0x0980 - TE_START,
  gujarati: 0x0a80 - TE_START,
  odia: 0x0b00 - TE_START,
  gurmukhi: 0x0a00 - TE_START,
};

// Sanskrit has only long e/o; Telugu writes them as ే/ో, but where a short ె/ొ appears it is meant
// as the same sound. The northern and eastern scripts have no short e/o, so it becomes the long one.
const LONG_EO: Record<string, string> = { 'ె': 'ే', 'ొ': 'ో', 'ఎ': 'ఏ', 'ఒ': 'ఓ' };
// Letters a script lacks, written the way its own stotram books write them (still in Telugu, mapped after).
const MISSING: Partial<Record<Script, Record<string, string>>> = {
  // Bengali has one letter for ba and va, and no ḷa.
  bengali: { 'వ': 'బ', 'ళ': 'ల', 'ఱ': 'ర', 'ఴ': 'ల' },
  gujarati: { 'ఱ': 'ర', 'ఴ': 'ళ' },
  // Odia books write Sanskrit va with ବ.
  odia: { 'వ': 'బ', 'ఱ': 'ర', 'ఴ': 'ళ' },
  // Gurmukhi (Punjabi names only): ś and ṣ are both ਸ਼, ṛ is ri.
  gurmukhi: { 'ష': 'శ', 'ఱ': 'ర', 'ఴ': 'ళ', 'ఋ': 'రి', 'ౠ': 'రీ', 'ఌ': 'లి', 'ౢ': '్లి', 'ఽ': '' },
};
const GURMUKHI_SIGN: Record<string, string> = { 'ృ': '੍ਰਿ', 'ౄ': '੍ਰੀ', 'శ': 'ਸ਼', 'ళ': 'ਲ਼' };

function byOffset(text: string, script: keyof typeof OFFSET): string {
  const off = OFFSET[script];
  const northern = script !== 'kannada' && script !== 'malayalam';
  const missing = MISSING[script];
  let out = '';
  for (const raw of text) {
    if (script === 'kannada' && raw === 'ఴ') { out += 'ೞ'; continue; }
    let chunk = northern ? LONG_EO[raw] ?? raw : raw;
    if (missing?.[chunk] !== undefined) chunk = missing[chunk];
    for (const ch of chunk) {
      if (script === 'gurmukhi' && GURMUKHI_SIGN[ch]) { out += GURMUKHI_SIGN[ch]; continue; }
      const c = ch.codePointAt(0)!;
      if (c >= 0x0c66 && c <= 0x0c6f) {
        // Digits: native for most scripts, Western for Malayalam (as used in print today).
        out += script === 'malayalam' ? String(c - 0x0c66) : String.fromCodePoint(c + off);
      } else out += c >= TE_START && c <= TE_END ? String.fromCodePoint(c + off) : ch;
    }
  }
  return out;
}

const TA_CONSONANT: Record<string, [string, string]> = {
  'క': ['க', ''], 'ఖ': ['க', '²'], 'గ': ['க', '³'], 'ఘ': ['க', '⁴'], 'ఙ': ['ங', ''],
  'చ': ['ச', ''], 'ఛ': ['ச', '²'], 'జ': ['ஜ', ''], 'ఝ': ['ஜ', '²'], 'ఞ': ['ஞ', ''],
  'ట': ['ட', ''], 'ఠ': ['ட', '²'], 'డ': ['ட', '³'], 'ఢ': ['ட', '⁴'], 'ణ': ['ண', ''],
  'త': ['த', ''], 'థ': ['த', '²'], 'ద': ['த', '³'], 'ధ': ['த', '⁴'],
  'ప': ['ப', ''], 'ఫ': ['ப', '²'], 'బ': ['ப', '³'], 'భ': ['ப', '⁴'], 'మ': ['ம', ''],
  'య': ['ய', ''], 'ర': ['ர', ''], 'ఱ': ['ற', ''], 'ఴ': ['ழ', ''], 'ల': ['ல', ''], 'ళ': ['ள', ''], 'వ': ['வ', ''],
  'శ': ['ஶ', ''], 'ష': ['ஷ', ''], 'స': ['ஸ', ''], 'హ': ['ஹ', ''],
};
const TA_VOWEL: Record<string, string> = {
  'అ': 'அ', 'ఆ': 'ஆ', 'ఇ': 'இ', 'ఈ': 'ஈ', 'ఉ': 'உ', 'ఊ': 'ஊ', 'ఋ': 'ரு', 'ౠ': 'ரூ',
  'ఎ': 'எ', 'ఏ': 'ஏ', 'ఐ': 'ஐ', 'ఒ': 'ஒ', 'ఓ': 'ஓ', 'ఔ': 'ஔ',
};
const TA_SIGN: Record<string, string> = {
  'ా': 'ா', 'ి': 'ி', 'ీ': 'ீ', 'ు': 'ு', 'ూ': 'ூ', 'ృ': '்ரு', 'ౄ': '்ரூ',
  'ె': 'ெ', 'ే': 'ே', 'ై': 'ை', 'ొ': 'ொ', 'ో': 'ோ', 'ౌ': 'ௌ', '్': '்',
};
const TA_OTHER: Record<string, string> = { 'ం': 'ம்', 'ఁ': 'ம்', 'ః': ':', 'ఽ': 'ऽ' };

const isTeluguLetter = (ch: string | undefined) => !!ch && /[\u0C00-\u0C7F]/.test(ch);
const DENTALS = new Set(['త', 'థ', 'ద', 'ధ']);
const NASAL_BEFORE: Record<string, string> = Object.fromEntries([
  ...['క', 'ఖ', 'గ', 'ఘ'].map((c) => [c, 'ங்']),
  ...['చ', 'ఛ', 'జ', 'ఝ'].map((c) => [c, 'ஞ்']),
  ...['ట', 'ఠ', 'డ', 'ఢ'].map((c) => [c, 'ண்']),
  ...['త', 'థ', 'ద', 'ధ'].map((c) => [c, 'ந்']),
  ...['ప', 'ఫ', 'బ', 'భ'].map((c) => [c, 'ம்']),
]);

function toTamil(text: string): string {
  let out = '';
  let pendingSup = '';
  const flush = () => { out += pendingSup; pendingSup = ''; };
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    // Tamil writes dental ந at the start of a word and before த; alveolar ன everywhere else.
    if (ch === 'న') {
      flush();
      const wordStart = !isTeluguLetter(chars[i - 1]);
      const beforeDental = chars[i + 1] === '్' && DENTALS.has(chars[i + 2]);
      out += wordStart || beforeDental ? 'ந' : 'ன';
      continue;
    }
    // Anusvara before a stop is read as that stop's own nasal (అనంత → அனந்த).
    if (ch === 'ం' && NASAL_BEFORE[chars[i + 1]]) { flush(); out += NASAL_BEFORE[chars[i + 1]]; continue; }
    const cons = TA_CONSONANT[ch];
    if (cons) { flush(); out += cons[0]; pendingSup = cons[1]; continue; }
    const sign = TA_SIGN[ch];
    if (sign) {
      // The superscript goes after the whole syllable, so the vowel sign stays joined to its letter.
      out += sign;
      flush();
      continue;
    }
    flush();
    const c = ch.codePointAt(0)!;
    if (TA_VOWEL[ch]) out += TA_VOWEL[ch];
    else if (TA_OTHER[ch]) out += TA_OTHER[ch];
    else if (c >= 0x0c66 && c <= 0x0c6f) out += String(c - 0x0c66);
    else out += ch;
  }
  flush();
  return out;
}

// Tamil texts (Thiruppavai, Divya Prabandham) printed in Telugu script follow the Tamil-book
// convention: ఴ is ழ, ఱ is ற, ట్ర is ற்ற, and గ/డ/ద/బ/శ/జ are only the softer sounds of
// க/ட/த/ப/ச — so in Tamil script they go back to plain letters, with no ²³⁴ marks.
const TAMIL_TEXT_LETTER: Record<string, string> = { 'గ': 'క', 'డ': 'ట', 'ద': 'త', 'బ': 'ప', 'శ': 'చ', 'జ': 'చ' };

/** Tamil-language text written in Telugu script → the given script. */
export function tamilTextFromTelugu(text: string, script: Script): string {
  if (script === 'telugu') return text;
  if (script === 'tamil') {
    const plain = text.replace(/ట్ర/g, 'ఱ్ఱ').replace(/[గడదబశజ]/g, (c) => TAMIL_TEXT_LETTER[c]);
    return toTamil(plain);
  }
  if (script === 'malayalam') return byOffset(text.replace(/ట్ర/g, 'ఱ్ఱ'), script);
  return byOffset(text, script);
}

/** Sanskrit text in Telugu script → the given script. */
export function fromTelugu(text: string, script: Script): string {
  if (script === 'telugu') return text;
  if (script === 'tamil') return toTamil(text);
  return byOffset(text, script);
}
