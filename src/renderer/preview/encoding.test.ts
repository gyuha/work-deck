import { describe, expect, it } from 'vitest';
import { decodeText } from './encoding';

describe('decodeText', () => {
  it('decodes UTF-8 without a BOM', () => {
    const result = decodeText(new TextEncoder().encode('hello 안녕'));
    expect(result).toEqual({ text: 'hello 안녕', encoding: 'utf-8', hadReplacementChars: false });
  });

  it('strips a UTF-8 BOM and reports it', () => {
    const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('hi')]);
    const result = decodeText(withBom);
    expect(result).toEqual({ text: 'hi', encoding: 'utf-8 (BOM)', hadReplacementChars: false });
  });

  it('decodes UTF-16LE with a BOM', () => {
    const bytes = new Uint8Array([0xff, 0xfe, 0x41, 0x00, 0x42, 0x00]); // "AB"
    expect(decodeText(bytes)).toEqual({ text: 'AB', encoding: 'utf-16le (BOM)', hadReplacementChars: false });
  });

  it('decodes UTF-16BE with a BOM', () => {
    const bytes = new Uint8Array([0xfe, 0xff, 0x00, 0x41, 0x00, 0x42]); // "AB"
    expect(decodeText(bytes)).toEqual({ text: 'AB', encoding: 'utf-16be (BOM)', hadReplacementChars: false });
  });

  it('falls back to EUC-KR when UTF-8 decoding produces replacement characters', () => {
    const eucKrBytes = new Uint8Array([0xb0, 0xa1, 0xb3, 0xaa]); // "가나" in EUC-KR
    const result = decodeText(eucKrBytes);
    expect(result.encoding).toBe('euc-kr');
    expect(result.text).toBe('가나');
    expect(result.hadReplacementChars).toBe(false);
  });

  it('reports unknown with replacement characters when no encoding fits', () => {
    // A byte sequence invalid in both UTF-8 and EUC-KR.
    const garbage = new Uint8Array([0xff, 0xff, 0xfe, 0x00, 0x01]);
    const result = decodeText(garbage);
    expect(result.hadReplacementChars).toBe(true);
  });
});
