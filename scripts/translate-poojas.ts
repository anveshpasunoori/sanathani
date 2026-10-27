// Translates the pooja guides (steps, samagri, timings, regional customs) into the app's languages
// with Claude, once, on this Mac; the app then reads the bundled catalogs (no key goes into the app).
// Usage:
//   npm run translate-poojas                       every language that still has untranslated text
//   npm run translate-poojas -- --lang te,hi       only these languages
//   npm run translate-poojas -- --dry              only count strings and characters
//   npm run translate-poojas -- --model claude-sonnet-5-5   a different model
// Needs ANTHROPIC_API_KEY (in the environment or .env.local) or an `ant auth login` profile.
// Safe to stop and run again: finished batches are saved, and only missing strings are sent.
// Output: src/data/poojaText/<lang>.json — English hash → translation.
import Anthropic from '@anthropic-ai/sdk';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { Lang } from '../src/engine/names';
import { poojaStrings, textKey, type PoojaCatalog } from '../src/data/poojaText';

const LANGUAGES: Record<Exclude<Lang, 'en'>, string> = {
  te: 'Telugu (as spoken in Andhra Pradesh and Telangana)',
  kn: 'Kannada',
  ta: 'Tamil',
  ml: 'Malayalam',
  hi: 'Hindi',
  mr: 'Marathi',
  bn: 'Bengali',
  gu: 'Gujarati',
  pa: 'Punjabi in Gurmukhi script',
  raj: 'Rajasthani (Marwari) in Devanagari script',
  or: 'Odia',
  bho: 'Bhojpuri in Devanagari script',
};

const args = process.argv.slice(2);
const arg = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const langs = (arg('lang')?.split(',') ?? Object.keys(LANGUAGES)) as Array<keyof typeof LANGUAGES>;
const model = arg('model') ?? 'claude-opus-5-5';
const dry = args.includes('--dry');
const BATCH_CHARS = 5000;
const PARALLEL = 3;

// The SDK reads ANTHROPIC_API_KEY (or an `ant auth login` profile); .env.local is the project's place for keys.
if (!process.env.ANTHROPIC_API_KEY && existsSync('.env.local')) {
  const key = readFileSync('.env.local', 'utf8').match(/^ANTHROPIC_API_KEY=(.*)$/m)?.[1]?.trim();
  if (key) process.env.ANTHROPIC_API_KEY = key;
}

const system = (language: string) => `You translate a Hindu family app's pooja guides from English into ${language}.
Readers are ordinary families following the steps at home, so write the way a respected elder or family purohit from that region would explain them: clear, warm, simple everyday words, not literary or bureaucratic language.
- Use the names this region's homes use for pooja items, offerings, festivals and deities (for example the local word for akshatas, kumkum or naivedyam), written in the target script.
- Sanskrit terms for the upacharas and rites (Achamanam, Pranayamam, Sankalpam, Avahanam, Neerajanam…) stay as those terms, written in the target script.
- Leave unchanged anything already written in an Indian script (quoted Telugu or Sanskrit lines), emoji, numbers, and placeholders in braces such as {name}.
- Keep the meaning exact: do not add, drop, soften or explain instructions. Keep short labels short.
Return every id with its translation.`;

const schema = {
  type: 'object',
  properties: {
    translations: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, text: { type: 'string' } },
        required: ['id', 'text'],
        additionalProperties: false,
      },
    },
  },
  required: ['translations'],
  additionalProperties: false,
} as const;

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();

function batches(items: Array<{ id: string; en: string }>) {
  const out: Array<typeof items> = [];
  let cur: typeof items = [], size = 0;
  for (const it of items) {
    if (cur.length && size + it.en.length > BATCH_CHARS) { out.push(cur); cur = []; size = 0; }
    cur.push(it); size += it.en.length;
  }
  if (cur.length) out.push(cur);
  return out;
}

async function translate(client: Anthropic, language: string, items: Array<{ id: string; en: string }>): Promise<PoojaCatalog> {
  const stream = client.beta.messages.stream({
    model,
    max_tokens: 64000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
    cache_control: { type: 'ephemeral' },
    system: system(language),
    messages: [{ role: 'user', content: JSON.stringify(items.map(({ id, en }) => ({ id, text: en }))) }],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === 'refusal') throw new Error(`declined (${message.stop_details?.category ?? 'no category'})`);
  if (message.stop_reason === 'max_tokens') throw new Error('ran out of output tokens');
  const text = message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
  const { translations } = JSON.parse(text) as { translations: Array<{ id: string; text: string }> };
  const byId = new Map(items.map((it) => [it.id, it.en]));
  const out: PoojaCatalog = {};
  for (const { id, text: tr } of translations) {
    const en = byId.get(id);
    // A translation that lost a placeholder would show a broken line; leave that one in English.
    if (en && tr.trim() && placeholders(tr) === placeholders(en)) out[id] = tr.trim();
  }
  return out;
}

async function main() {
  const strings = poojaStrings();
  const all = new Map(strings.map((en) => [textKey(en), en]));
  console.log(`${all.size} pooja strings, ${strings.reduce((n, s) => n + s.length, 0).toLocaleString()} characters of English.`);
  const client = new Anthropic();
  mkdirSync('src/data/poojaText', { recursive: true });

  for (const lang of langs) {
    const language = LANGUAGES[lang];
    if (!language) throw new Error(`Unknown language "${lang}".`);
    const file = `src/data/poojaText/${lang}.json`;
    const old: PoojaCatalog = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
    // Keep only strings still in the app, so the catalog doesn't carry stale steps.
    const catalog: PoojaCatalog = Object.fromEntries(Object.entries(old).filter(([k]) => all.has(k)));
    const todo = [...all].filter(([k]) => !catalog[k]).map(([id, en]) => ({ id, en }));
    const chars = todo.reduce((n, t) => n + t.en.length, 0);
    console.log(`${lang}: ${todo.length} to translate (${chars.toLocaleString()} chars).`);
    if (dry || !todo.length) continue;

    const save = () => writeFileSync(file, JSON.stringify(Object.fromEntries(Object.entries(catalog).sort()), null, 1) + '\n');
    const queue = batches(todo);
    let done = 0, failed = 0;
    const worker = async () => {
      for (let b = queue.shift(); b; b = queue.shift()) {
        try {
          Object.assign(catalog, await translate(client, language, b));
          save();
        } catch (e) {
          failed++;
          if (e instanceof Anthropic.AuthenticationError) throw new Error('No valid API key — add ANTHROPIC_API_KEY to .env.local or run `ant auth login`.');
          console.warn(`  ${lang}: a batch failed (${e instanceof Error ? e.message : e}); run again to retry it.`);
        }
        console.log(`  ${lang}: ${++done} batches done`);
      }
    };
    await Promise.all(Array.from({ length: PARALLEL }, worker));
    save();
    const missing = [...all.keys()].filter((k) => !catalog[k]).length;
    console.log(`${lang}: saved ${Object.keys(catalog).length} translations${missing ? `, ${missing} still in English` : ''}${failed ? ` (${failed} failed batches)` : ''}.`);
  }
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
