// Natural (Azure neural) voices for "Chant with me". The audio is made once on the Mac with
// `npm run voice -- --lang te` and bundled in public/audio/voice/<lang>/: one MP3 per line, plus an
// index.json with each line's length and where every word starts, so the slow modes can play a
// line word by word or half by half from the same natural recording instead of slowing it down.
// Lines without audio fall back to the phone's own voice.

/** Folder (and voice) for each reading language; English readers hear the Telugu text. */
export const VOICE_CODE: Record<string, string> = {
  'te-IN': 'te', 'kn-IN': 'kn', 'ta-IN': 'ta', 'ml-IN': 'ml', 'hi-IN': 'hi', 'mr-IN': 'mr', 'bn-IN': 'bn', 'gu-IN': 'gu', 'or-IN': 'or',
};

/** Calm male voices by default; the female ones in the comment can be chosen with --voice. */
export const NEURAL_VOICE: Record<string, string> = {
  te: 'te-IN-MohanNeural', // te-IN-ShrutiNeural
  kn: 'kn-IN-GaganNeural', // kn-IN-SapnaNeural
  ta: 'ta-IN-ValluvarNeural', // ta-IN-PallaviNeural
  ml: 'ml-IN-MidhunNeural', // ml-IN-SobhanaNeural
  hi: 'hi-IN-MadhurNeural', // hi-IN-SwaraNeural
  mr: 'mr-IN-ManoharNeural', // mr-IN-AarohiNeural
  bn: 'bn-IN-BashkarNeural', // bn-IN-TanishaaNeural
  gu: 'gu-IN-NiranjanNeural', // gu-IN-DhwaniNeural
  or: 'or-IN-SukantNeural', // or-IN-SubhasiniNeural
};

/** What the voice should say: verse numbers (॥ 12 ॥, in any script), dandas and the Tamil-script ²³⁴ chanting marks are shown but not read out. */
export const spoken = (text: string) =>
  text.replace(/[²³⁴]/g, '')
    .replace(/[0-9०-९௦-௯౦-౯೦-೯൦-൯]+/g, ' ')
    .replace(/[।॥|]+/g, ' ').replace(/\s+/g, ' ').trim();

/** File name for a spoken line: FNV-1a of the text plus its length (stable in the browser and in Node). */
export function voiceKey(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0') + text.length.toString(16);
}

/** One line's audio: its length and each word's [start second, start character]. */
export interface VoiceLine { d: number; w: Array<[number, number]> }
export interface VoiceManifest { voice: string; lines: Record<string, VoiceLine> }

const manifests = new Map<string, Promise<VoiceManifest | null>>();
/** The bundled audio index for a reading language, or null when none has been made yet. */
export function loadVoiceManifest(voiceLang: string): Promise<VoiceManifest | null> {
  const code = VOICE_CODE[voiceLang];
  if (!code) return Promise.resolve(null);
  if (!manifests.has(code)) {
    manifests.set(code, fetch(`/audio/voice/${code}/index.json`)
      .then((r) => (r.ok ? r.json() as Promise<VoiceManifest> : null))
      .catch(() => null));
  }
  return manifests.get(code)!;
}

export const voiceFile = (voiceLang: string, key: string) => `/audio/voice/${VOICE_CODE[voiceLang]}/${key}.mp3`;

/**
 * The pieces of a line to play, as [from, to) seconds: the whole line, two halves split at the word
 * nearest the middle, or word by word.
 */
export function voicePieces(line: VoiceLine, textLength: number, chunk: 'line' | 'half' | 'word'): Array<[number, number]> {
  const starts = line.w.map(([t]) => t);
  if (chunk === 'line' || starts.length < 2) return [[0, line.d]];
  if (chunk === 'word') return starts.map((t, i) => [i === 0 ? 0 : t, starts[i + 1] ?? line.d]);
  if (starts.length < 3) return [[0, line.d]];
  let best = 1;
  for (let i = 2; i < line.w.length; i++) {
    if (Math.abs(line.w[i][1] - textLength / 2) < Math.abs(line.w[best][1] - textLength / 2)) best = i;
  }
  return [[0, starts[best]], [starts[best], line.d]];
}
