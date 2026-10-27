// Finds where each line starts in a chanting recording, for data/chants.ts.
// Chanters pause between lines, so the longest silences are taken as line breaks.
//
//   node scripts/split-chant.mjs public/audio/chant/purusha-suktam.mp3 <number of lines>
//
// Prints the `starts` array. Check it in the app's "Chant with me" player and adjust any line
// that starts early or late (a long pause inside a line can be mistaken for a break).
import { spawnSync } from 'node:child_process';

const [file, linesArg, noise = '-35dB'] = process.argv.slice(2);
const lines = Number(linesArg);
if (!file || !(lines > 0)) {
  console.error('Usage: node scripts/split-chant.mjs <audio file> <number of lines> [silence level, default -35dB]');
  process.exit(1);
}

// ffmpeg reports silences on stderr: "silence_start: 12.3" … "silence_end: 13.1 | silence_duration: 0.8"
const run = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', `silencedetect=noise=${noise}:d=0.2`, '-f', 'null', '-'], { encoding: 'utf8' });
if (run.error || run.status !== 0) {
  console.error(run.error ? 'ffmpeg is not installed (brew install ffmpeg).' : run.stderr.split('\n').slice(-5).join('\n'));
  process.exit(1);
}
const log = run.stderr;
const silences = [...log.matchAll(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g)].map((m) => ({ end: +m[1], dur: +m[2] }));

// The recording's first sound is line 1; drop a leading silence that starts at 0.
const first = silences.length && silences[0].end - silences[0].dur < 0.05 ? silences.shift().end : 0;
if (silences.length < lines - 1) {
  console.error(`Found only ${silences.length} pauses for ${lines} lines. Try a higher silence level, e.g. -30dB.`);
  process.exit(1);
}
const breaks = [...silences].sort((a, b) => b.dur - a.dur).slice(0, lines - 1).map((s) => s.end).sort((a, b) => a - b);
// Start each line a moment before the sound so its first syllable is not clipped.
const starts = [first, ...breaks].map((t) => Math.max(0, +(t - 0.08).toFixed(2)));
console.log(`starts: [${starts.join(', ')}],`);
