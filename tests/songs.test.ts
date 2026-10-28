import { SONGS, songsFor } from '../src/data/songs';
import { SONG_DEITIES } from '../src/ui/Songs';

describe('songs', () => {
  it('every booklet song is under Ayyappa, with unique ids and titles', () => {
    expect(SONGS).toHaveLength(64);
    expect(new Set(SONGS.map((s) => s.id)).size).toBe(SONGS.length);
    // Songs added since the Ayyappa booklet are listed under their own deity.
    const added = ['ganesha-sharanam', 'vakratunda-mahakaya-om-maha-ganapathi', 'shiva-shivamurthivi-gananatha', 'vatapi-ganapatim', 'govinda-nama-sankeertanam', 'srinivasa-govinda', 'lingashtakam', 'bilvashtakam', 'radhe-govinda-brindavana-chandra', 'jaya-janardhana-krishna', 'achyutashtakam', 'yadukula-bhushana', 'nacho-nacho-nandalala', 'raghukula-tilaka-rara', 'ramudante-ramude', 'vel-vel-velayya', 'palanimalai-vasuda', 'umamaheshwara-kumaraguruve', 'muruga-muruganayya', 'vel-muruga-mam-pahi', 'shanmukhanatha-palayamam', 'lakshmi-varada-cheeryala'];
    for (const s of SONGS) {
      if (!added.includes(s.id)) expect(s.deities).toContain('ayyappa');
      expect(s.title.te.length).toBeGreaterThan(2);
      expect(s.text.split('\n').length).toBeGreaterThan(3);
    }
  });
  it('Ganapathi has its bhajans', () => {
    expect(songsFor('ganapathi').map((s) => s.id)).toEqual(['ganesha-sharanam', 'vakratunda-mahakaya-om-maha-ganapathi', 'shiva-shivamurthivi-gananatha', 'vatapi-ganapatim']);
  });
  it('Hanuman and Venkateswara songs are also listed under those deities', () => {
    expect(songsFor('hanuman').map((s) => s.id)).toEqual(['ati-balavanta-hanumanta', 'emaya-dora-varala-anjani']);
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
});
