import { SONGS, songsFor } from '../src/data/songs';
import { SONG_DEITIES } from '../src/ui/Songs';

describe('songs', () => {
  it('every booklet song is under Ayyappa, with unique ids and titles', () => {
    expect(SONGS).toHaveLength(81);
    expect(new Set(SONGS.map((s) => s.id)).size).toBe(SONGS.length);
    // Songs added since the Ayyappa booklet are listed under their own deity.
    const added = ['ganesha-sharanam', 'vakratunda-mahakaya-om-maha-ganapathi', 'shiva-shivamurthivi-gananatha', 'vatapi-ganapatim', 'govinda-nama-sankeertanam', 'srinivasa-govinda', 'lingashtakam', 'bilvashtakam', 'radhe-govinda-brindavana-chandra', 'jaya-janardhana-krishna', 'achyutashtakam', 'yadukula-bhushana', 'nacho-nacho-nandalala', 'raghukula-tilaka-rara', 'ramudante-ramude', 'vel-vel-velayya', 'palanimalai-vasuda', 'umamaheshwara-kumaraguruve', 'muruga-muruganayya', 'vel-muruga-mam-pahi', 'shanmukhanatha-palayamam', 'lakshmi-varada-cheeryala', 'amba-parameshwari', 'saraswati-he-jagajjanani', 'shankari-shambhavi',
      'gauri-nandana-gajavadana', 'bhavani-shankari-parvathi', 'anjaneya-veera-hanumantha', 'shivaya-nama-om', 'hara-om-sadashiva'];
    for (const s of SONGS) {
      if (!added.includes(s.id)) expect(s.deities).toContain('ayyappa');
      expect(s.title.te.length).toBeGreaterThan(2);
      expect(s.text.split('\n').length).toBeGreaterThan(3);
    }
  });
  it('Ganapathi has its bhajans', () => {
    expect(songsFor('ganapathi').map((s) => s.id)).toEqual(['ganesha-sharanam', 'vakratunda-mahakaya-om-maha-ganapathi', 'shiva-shivamurthivi-gananatha', 'vatapi-ganapatim', 'gauri-nandana-gajavadana', 'ganesa-saranam-tamil']);
  });
  it('Hanuman and Venkateswara songs are also listed under those deities', () => {
    expect(songsFor('hanuman').map((s) => s.id)).toEqual(['ati-balavanta-hanumanta', 'emaya-dora-varala-anjani', 'anjaneya-veera-hanumantha']);
    expect(songsFor('venkateswara').map((s) => s.id)).toEqual(['adi-shesha-ananta-shayana', 'govinda-nama-sankeertanam', 'srinivasa-govinda']);
  });
  it('text is clean: no PDF splits, watermark or booklet footer', () => {
    const all = SONGS.map((s) => s.title.te + '\n' + s.text).join('\n');
    for (const bad of ['స్నా న', 'జ్యో తి', 'వెళ్ళా లి', 'అయ్య ప్ప', 'స్వా మి', 'instapdf', 'కామెంట్', '  ']) expect(all, bad).not.toContain(bad);
    expect(all).not.toMatch(/-\|2\||--\|\|2\|\||విత్ కోరస్|wit koras/);
  });
  it('every song deity has a menu entry', () => {
    for (const s of SONGS) for (const d of s.deities) expect(SONG_DEITIES.some((x) => x.id === d)).toBe(true);
  });
  it('songs with a recording point at a file that exists', async () => {
    const { existsSync } = await import('node:fs');
    const withAudio = SONGS.filter((s) => s.audio);
    expect(withAudio.length).toBe(29);
    expect(withAudio.map((s) => s.id)).toContain('digu-digu-naga');
    for (const s of withAudio) expect(existsSync(`public${s.audio!.src}`)).toBe(true);
  });
  it('Tamil and Sanskrit songs carry their own script and English letters', () => {
    for (const s of SONGS.filter((x) => x.lang === 'ta' || x.lang === 'sa')) {
      expect(s.roman, s.id).toBeTruthy();
      expect(s.roman!, s.id).toMatch(/^[\x00-\x7F’–]+$/);
      // Tamil songs are written in Tamil script; Sanskrit ones in Telugu script (converted for each reader).
      expect(s.text, s.id).toMatch(s.lang === 'ta' ? /[\u0B80-\u0BFF]/ : /[\u0C00-\u0C7F]/);
      expect(s.text, s.id).not.toMatch(s.lang === 'ta' ? /[\u0C00-\u0C7F]/ : /[\u0B80-\u0BFF]/);
    }
  });
});
