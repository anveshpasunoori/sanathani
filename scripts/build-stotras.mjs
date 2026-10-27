// Builds src/data/stotras.json from Telugu Wikisource (public-domain scripture, community
// transcriptions; text CC BY-SA 4.0). Each text is parsed into sections and verses and checked for
// completeness (verse numbering / name counts); the build fails if a check does not pass.
// Run: node scripts/build-stotras.mjs
import { writeFileSync } from 'node:fs';

const UA = { 'User-Agent': 'ThithiReminder-build/0.1 (personal project)' };
const wsUrl = (t) => `https://te.wikisource.org/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}`;
const raw = async (t) => {
  const r = await fetch(`https://te.wikisource.org/w/index.php?title=${encodeURIComponent(t)}&action=raw`, { headers: UA });
  if (!r.ok) throw new Error(`${t}: HTTP ${r.status}`);
  return r.text();
};

const TE_DIGITS = '౦౧౨౩౪౫౬౭౮౯';
const toInt = (s) => Number([...s].map((c) => (TE_DIGITS.includes(c) ? TE_DIGITS.indexOf(c) : c)).join(''));
const NUM_END = /\s*(?:\|\|?|॥)?\s*\(?\s*([0-9౦-౯]{1,3})\s*\)?\s*(?:\|\|?|॥)?\s*$/;

function clean(s) {
  return s
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/__NOTOC__/g, '')
    .replace(/\[\[(?:వర్గం|Category):[^\]]*\]\]/g, '')
    .replace(/\[\[(?:w:)?[^\]|]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[(?:w:)?([^\]]*)\]\]/g, '$1')
    .replace(/<\/?poem>|<br\s*\/?>/g, '')
    .replace(/^'''\s*([^'\n]{1,30}?)\s*'''\s*$/gm, '== $1 ==')
    .replace(/'''/g, '')
    .replace(/‖/g, '||')
    .replace(/\|[ \t]+\|/g, '||')
    .replace(/[ \t]+/g, ' ');
}

/** Split cleaned wikitext into sections of verses; each verse is an array of lines. */
function parseVerses(text, { splitHalves = false } = {}) {
  const sections = [];
  let cur = { title: '', verses: [] };
  let verse = [];
  const flush = () => { if (verse.length) { cur.verses.push(verse); verse = []; } };
  for (let line of clean(text).split('\n')) {
    line = line.trim();
    const h = line.match(/^=+\s*(.+?)\s*=+,?$/) || line.match(/^''\s*(.+?)\s*''\s*[:\-–]*\s*$/)
      || (/^\|\|\s*హరిః ఓం\s*\|\|$/.test(line) && [line, 'స్తోత్రమ్ — హరిః ఓం']) || (/^ఫలశ్రుతి:?$/.test(line) && [line, 'ఫలశ్రుతి']);
    if (h) { flush(); if (cur.verses.length || cur.title) sections.push(cur); cur = { title: h[1].replace(/''/g, '').trim(), verses: [] }; continue; }
    if (!line) { flush(); continue; }
    line = line.replace(/''/g, '');
    const parts = splitHalves ? line.split(/(?<=[^|]\|)(?!\|)\s*(?=\S)/) : [line];
    for (const p of parts) {
      verse.push(p.trim());
      if (NUM_END.test(p) && /[|॥)]|[౦-౯]$/.test(p.trim())) flush();
    }
  }
  flush();
  if (cur.verses.length) sections.push(cur);
  // Where verses are numbered, the source sometimes puts a blank line between the two halves:
  // join unnumbered pieces onto the numbered line that follows. Unnumbered sections (e.g. a
  // phala shruti written one line per paragraph) become a single verse.
  for (const sec of sections) {
    const numbered = sec.verses.filter((v) => NUM_END.test(v[v.length - 1])).length;
    if (numbered >= 2) {
      const merged = [];
      let pending = [];
      for (const v of sec.verses) {
        pending.push(...v);
        if (NUM_END.test(v[v.length - 1])) { merged.push(pending); pending = []; }
      }
      if (pending.length) merged.push(pending);
      sec.verses = merged;
    } else if (/ఫల/.test(sec.title) && numbered === 0 && sec.verses.length > 1 && sec.verses.every((v) => v.length === 1)) {
      sec.verses = [sec.verses.flat()];
    }
  }
  return sections.filter((s) => s.verses.length);
}

const verseNumbers = (sections) => sections.flatMap((s) => s.verses.map((v) => v[v.length - 1].match(NUM_END)).filter(Boolean).map((m) => toInt(m[1])));
function expectRun(nums, from, to, label) {
  const set = new Set(nums);
  const missing = [];
  for (let i = from; i <= to; i++) if (!set.has(i)) missing.push(i);
  if (missing.length) throw new Error(`${label}: missing verse numbers ${missing.join(', ')}`);
}

const out = [];

// ---- Vishnu Sahasranamam (Mahabharata, Anushasana Parva) + meanings of the 1000 names ----
{
  const title = 'విష్ణు సహస్రనామ స్తోత్రము';
  const s = await raw(title);
  const poem = s.slice(s.indexOf('<poem>'), s.indexOf('</poem>'));
  const sections = parseVerses(poem);
  const main = poem.slice(poem.indexOf('|| హరిః ఓం ||'), poem.indexOf("''ఉత్తర పీఠిక''"));
  const mainVerses = parseVerses(main).flatMap((x) => x.verses).filter((v) => v.length >= 2);
  if (mainVerses.length < 105 || mainVerses.length > 112) throw new Error(`Vishnu Sahasranamam: expected ~107 main verses, found ${mainVerses.length}`);
  const names = [];
  for (const m of s.slice(s.indexOf('</poem>')).matchAll(/^\s*(\d{1,4})\s*[.)]\s*(.+?)\s*-{1,3}\s*(.+)$/gm)) {
    names.push({ n: Number(m[1]), name: m[2].replace(/''/g, '').trim(), meaning: m[3].replace(/''/g, '').trim() });
  }
  const byNum = new Map(names.map((x) => [x.n, x]));
  expectRun([...byNum.keys()], 1, 1000, 'Vishnu Sahasranamam names');
  out.push({
    id: 'vishnu-sahasranamam', deity: 'vishnu',
    title: { te: 'శ్రీ విష్ణు సహస్రనామ స్తోత్రము', en: 'Sri Vishnu Sahasranamam' },
    about: 'From the Anushasana Parva of the Mahabharata — Bhishma teaches Yudhishthira the thousand names of Vishnu.',
    sections, names: [...byNum.values()].sort((a, b) => a.n - b.n),
    stats: { mainVerses: mainVerses.length, names: byNum.size },
    source: { title, url: wsUrl(title) },
  });
}

// ---- Lalitha Sahasranamam (Brahmanda Purana) ----
{
  const title = 'లలితా సహస్రనామ స్తోత్రము';
  const s = await raw(title);
  const sections = parseVerses(s, { splitHalves: true });
  const stotram = s.slice(s.indexOf('==స్తోత్రము=='), s.indexOf('== శ్రీలలితా సహస్ర నామ స్తోత్ర మాహత్యం'));
  const nums = verseNumbers(parseVerses(stotram, { splitHalves: true }));
  expectRun(nums, 1, 182, 'Lalitha Sahasranamam');
  out.push({
    id: 'lalitha-sahasranamam', deity: 'devi',
    title: { te: 'శ్రీ లలితా సహస్రనామ స్తోత్రము', en: 'Sri Lalitha Sahasranamam' },
    about: 'From the Brahmanda Purana — Hayagriva teaches Agastya the thousand names of the Divine Mother Lalitha Tripurasundari.',
    sections, stats: { verses: Math.max(...nums) },
    source: { title, url: wsUrl(title) },
  });
}

// ---- Shorter stotrams: [id, page, titles, deity, about, expected numbered verses] ----
const SHORT = [
  ['ganesha-pancharatnam', 'గణేశ పంచరత్న స్తోత్రము', { te: 'శ్రీ గణేశ పంచరత్న స్తోత్రము', en: 'Ganesha Pancharatnam' }, 'ganesha', 'Five "jewel" verses to Ganesha by Adi Shankaracharya (ముదాకరాత్త మోదకం).', 5],
  ['mahalakshmi-ashtakam', 'మహాలక్ష్మ్యష్టకము', { te: 'శ్రీ మహాలక్ష్మ్యష్టకము', en: 'Mahalakshmi Ashtakam' }, 'lakshmi', 'Eight verses of praise to Mahalakshmi, spoken by Indra (from the Padma Purana).', 8],
  ['harivarasanam', 'అయ్యప్ప శయన హారతి', { te: 'హరివరాసనం', en: 'Harivarasanam' }, 'ayyappa', 'The lullaby sung to Lord Ayyappa at Sabarimala when the temple closes each night.', 8],
  ['mantra-pushpam', 'మంత్ర పుష్పము', { te: 'మంత్ర పుష్పము', en: 'Mantra Pushpam' }, 'general', 'Vedic hymn (Taittiriya Aranyaka) offered as the "flower of mantras" at the end of every pooja.', 0],
  // Only Tulsidas's original (Awadhi, in Telugu script); the page's modern Telugu translation is not public domain.
  ['hanuman-chalisa', 'హనుమాన్ చాలీసా', { te: 'శ్రీ హనుమాన్ చాలీసా', en: 'Sri Hanuman Chalisa' }, 'hanuman', 'Forty chaupais in praise of Hanuman by Goswami Tulsidas (16th century), recited on Tuesdays and Saturdays.', 40, ['==హిందీ==', '==తెలుగు==']],
];
for (const [id, title, titles, deity, about, expected, cut] of SHORT) {
  let s = await raw(title);
  if (cut) {
    const a = s.indexOf(cut[0]), b = s.indexOf(cut[1]);
    if (a < 0 || b < 0) throw new Error(`${titles.en}: section markers not found`);
    s = s.slice(a + cut[0].length, b);
  }
  const body = s.includes('<poem>') ? s.slice(s.indexOf('<poem>'), s.includes('</poem>') ? s.indexOf('</poem>') : undefined) : s;
  const sections = parseVerses(body);
  if (expected) expectRun(verseNumbers(sections), 1, expected, titles.en);
  else if (sections.flatMap((x) => x.verses).length < 5) throw new Error(`${titles.en}: too short`);
  out.push({ id, deity, title: titles, about, sections, stats: { verses: sections.reduce((n, x) => n + x.verses.length, 0) }, source: { title, url: wsUrl(title) } });
}

writeFileSync(new URL('../src/data/stotras.json', import.meta.url), JSON.stringify({
  license: 'Texts from Telugu Wikisource (te.wikisource.org), available under CC BY-SA 4.0. The scriptures themselves are in the public domain.',
  fetched: new Date().toISOString().slice(0, 10),
  stotras: out,
}));
for (const t of out) console.log(t.id, JSON.stringify(t.stats));
