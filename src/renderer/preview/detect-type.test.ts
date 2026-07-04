import { describe, expect, it } from 'vitest';
import { detectPreviewTypeByExtension, isLikelyText, detectPreviewType } from './detect-type';

describe('detectPreviewTypeByExtension', () => {
  it('recognizes image extensions', () => {
    for (const name of ['a.png', 'a.JPG', 'a.jpeg', 'a.gif', 'a.svg', 'a.webp']) {
      expect(detectPreviewTypeByExtension(name)).toBe('image');
    }
  });

  it('recognizes markdown extensions', () => {
    expect(detectPreviewTypeByExtension('README.md')).toBe('markdown');
    expect(detectPreviewTypeByExtension('notes.markdown')).toBe('markdown');
  });

  it('recognizes known text/code extensions', () => {
    for (const name of ['a.ts', 'a.js', 'a.json', 'a.py', 'a.txt', 'a.css', 'a.html']) {
      expect(detectPreviewTypeByExtension(name)).toBe('text');
    }
  });

  it('returns unknown for unrecognized or missing extensions', () => {
    expect(detectPreviewTypeByExtension('a.xyz123')).toBe('unknown');
    expect(detectPreviewTypeByExtension('no-extension')).toBe('unknown');
  });
});

describe('isLikelyText', () => {
  it('treats a null byte in the sample as binary', () => {
    expect(isLikelyText(new Uint8Array([0x48, 0x65, 0x00, 0x6c]))).toBe(false);
  });

  it('treats plain ASCII/UTF-8 text as text', () => {
    expect(isLikelyText(new TextEncoder().encode('hello world 안녕'))).toBe(true);
  });
});

describe('detectPreviewType', () => {
  it('trusts the extension when it is known, without inspecting content', () => {
    expect(detectPreviewType('a.png', new Uint8Array([0x00, 0x00]))).toBe('image');
  });

  it('falls back to content sniffing for an unknown extension', () => {
    expect(detectPreviewType('a.xyz', new TextEncoder().encode('plain text'))).toBe('text');
    expect(detectPreviewType('a.xyz', new Uint8Array([0x00, 0x01, 0x02]))).toBe('unsupported');
  });
});
