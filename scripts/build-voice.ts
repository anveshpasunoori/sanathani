// Makes the natural-voice audio for "Chant with me" with Microsoft Azure neural voices, once, on
// this Mac; the app then plays the bundled files (no key ever goes into the app).
//
//   npm run voice -- --lang te            all stotram lines in Telugu (add more: --lang te,ta)
//   npm run voice -- --lang te --dry      only count lines and characters (to stay within the free tier)
//   npm run voice -- --lang te --only thiruppavai
//   npm run voice -- --lang te --voice te-IN-ShrutiNeural   a different voice (remakes every line)
//
// Needs AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in .env.local. Lines already made are skipped, so
// it can be stopped and run again. Output: public/audio/voice/<lang>/<key>.mp3 and index.json.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import stotras from '../src/data/stotras.json';
import { SCRIPT_OF, type Lang } from '../src/engine/names';
import { fromTelugu, tamilTextFromTelugu } from '../src/engine/script';
import { NEURAL_VOICE, spoken, voiceKey, type VoiceManifest } from '../src/data/voice';

const args = process.argv.slice(2);
const arg = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const langs = (arg('lang') ?? 'te').split(',') as Lang[];
const only = arg('only');
const dry = args.includes('--dry');

function env(): { key: string; region: string } {
  const file = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
  const get = (k: string) => process.env[k] ?? file.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.trim();
  const key = get('AZURE_SPEECH_KEY'), region = get('AZURE_SPEECH_REGION');
  if (!key || !region) throw new Error('Add AZURE_SPEECH_KEY and AZURE_SPEECH_REGION to .env.local (see docs/roadmap.md).');
  return { key, region };
}

type Section = { title: string; verses: string[][]; lang?: 'ta' };
/** The lines exactly as the stotram screen shows them in this language (see Stotram.tsx). */
function linesFor(lang: Lang): string[] {
  const script = SCRIPT_OF[lang];
  const out: string[] = [];
  for (const st of stotras.stotras as Array<{ id: string; sections: Section[] }>) {
    if (only && st.id !== only) continue;
    for (const sec of st.sections) {
      for (const line of sec.verses.flat()) out.push(sec.lang === 'ta' ? tamilTextFromTelugu(line, script) : fromTelugu(line, script));
    }
  }
  return [...new Set(out.map(spoken).filter(Boolean))];
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Speaks one line; returns the MP3 bytes, its length and where each word starts. */
function synth(synth: sdk.SpeechSynthesizer, voice: string, text: string) {
  const locale = voice.slice(0, 5);
  const head = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}"><voice name="${voice}"><prosody rate="-8%">`;
  const ssml = `${head}${escape(text)}</prosody></voice></speak>`;
  const words: Array<[number, number]> = [];
  synth.wordBoundary = (_s, e) => {
    if (e.boundaryType !== sdk.SpeechSynthesisBoundaryType.Word) return;
    words.push([Math.round(e.audioOffset / 1e4) / 1e3, Math.max(0, e.textOffset - head.length)]);
  };
  return new Promise<{ audio: Buffer; d: number; w: Array<[number, number]> }>((resolve, reject) => {
    synth.speakSsmlAsync(ssml, (r) => {
      if (r.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
        resolve({ audio: Buffer.from(r.audioData), d: Math.round(r.audioDuration / 1e4) / 1e3, w: words });
      } else reject(new Error(r.errorDetails || 'synthesis failed'));
    }, reject);
  });
}

async function main() {
  for (const lang of langs) {
    // Punjabi, Rajasthani and Bhojpuri read the same Devanagari stotrams as Hindi, so they share its audio.
    const code = lang === 'en' ? 'te' : lang === 'pa' || lang === 'raj' || lang === 'bho' ? 'hi' : lang;
    const voice = arg('voice') ?? NEURAL_VOICE[code];
    if (!voice) throw new Error(`No neural voice for "${lang}".`);
    const dir = `public/audio/voice/${code}`;
    const indexFile = `${dir}/index.json`;
    const old: VoiceManifest = existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, 'utf8')) : { voice, lines: {} };
    const manifest: VoiceManifest = old.voice === voice ? old : { voice, lines: {} };
    const todo = linesFor(lang).filter((t) => !manifest.lines[voiceKey(t)]);
    const chars = todo.reduce((n, t) => n + t.length, 0);
    console.log(`${code}: ${todo.length} lines to make (${chars.toLocaleString()} characters) with ${voice}.`);
    if (dry || todo.length === 0) continue;

    const { key, region } = env();
    const config = sdk.SpeechConfig.fromSubscription(key, region);
    config.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;
    const synthesizer = new sdk.SpeechSynthesizer(config, null as unknown as sdk.AudioConfig);
    mkdirSync(dir, { recursive: true });
    try {
      for (let i = 0; i < todo.length; i++) {
        const text = todo[i], k = voiceKey(text);
        for (let attempt = 1; ; attempt++) {
          try {
            const r = await synth(synthesizer, voice, text);
            writeFileSync(`${dir}/${k}.mp3`, r.audio);
            manifest.lines[k] = { d: r.d, w: r.w };
            break;
          } catch (e) {
            if (attempt >= 4) throw e;
            console.warn(`  retrying line ${i + 1} (${(e as Error).message})`);
            await wait(15000 * attempt); // the free tier allows only a few requests a minute when busy
          }
        }
        if ((i + 1) % 20 === 0 || i === todo.length - 1) {
          writeFileSync(indexFile, JSON.stringify(manifest));
          console.log(`  ${i + 1}/${todo.length}`);
        }
      }
    } finally {
      writeFileSync(indexFile, JSON.stringify(manifest));
      synthesizer.close();
    }
  }
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
