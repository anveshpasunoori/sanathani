// Recorded chanting for "Chant with me". A computer voice cannot chant Vedic svaras (udātta,
// anudātta, svarita) or their exact lengths, so hymns are taught from a real chanter's recording,
// played line by line. Recordings live in public/audio/chant; `starts` holds the second at which
// each line of the text begins (make it with `node scripts/split-chant.mjs <file> <lines>`).
// Only add recordings the chanter has agreed to share in the app.

export interface ChantRecording {
  /** Stotram id in stotras.json. */
  stotraId: string;
  src: string;
  chanter: string;
  /** Start time (seconds) of each line, in text order; the last line runs to the end of the file. */
  starts: number[];
}

export const CHANT_RECORDINGS: ChantRecording[] = [];

export const recordingFor = (stotraId: string) => CHANT_RECORDINGS.find((r) => r.stotraId === stotraId);
