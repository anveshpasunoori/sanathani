import { spoken, voiceKey, voicePieces } from '../src/data/voice';

describe('natural voice', () => {
  it('reads the words, not verse numbers, dandas or Tamil chanting marks', () => {
    expect(spoken('పారోర్ పుగఴ ప్పడిందేలోర్ ఎం పావాయ్ | 1')).toBe('పారోర్ పుగఴ ప్పడిందేలోర్ ఎం పావాయ్');
    expect(spoken('க³ணபதி ॥ ௧ ॥')).toBe('கணபதி');
  });

  it('names each line\'s file the same way every time', () => {
    expect(voiceKey('శ్రీ రామ')).toBe(voiceKey('శ్రీ రామ'));
    expect(voiceKey('శ్రీ రామ')).not.toBe(voiceKey('శ్రీ రామా'));
  });

  it('plays a line whole, in two halves at the middle word, or word by word', () => {
    // "aaaa bbbb cccc dddd" — 4 words starting at characters 0, 5, 10, 15
    const line = { d: 4, w: [[0.1, 0], [1, 5], [2, 10], [3, 15]] as Array<[number, number]> };
    expect(voicePieces(line, 19, 'line')).toEqual([[0, 4]]);
    expect(voicePieces(line, 19, 'half')).toEqual([[0, 2], [2, 4]]);
    expect(voicePieces(line, 19, 'word')).toEqual([[0, 1], [1, 2], [2, 3], [3, 4]]);
  });
});
