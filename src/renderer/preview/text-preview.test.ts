import { describe, expect, it } from 'vitest';
import { languageForExtension, renderTextPreview } from './text-preview';

describe('languageForExtension', () => {
  it('maps known code extensions to a highlight.js language', () => {
    expect(languageForExtension('a.ts')).toBe('typescript');
    expect(languageForExtension('a.py')).toBe('python');
  });

  it('returns null for unrecognized or plain-text extensions', () => {
    expect(languageForExtension('a.txt')).toBeNull();
    expect(languageForExtension('a.unknownext')).toBeNull();
  });
});

describe('renderTextPreview', () => {
  it('applies syntax highlighting when a language is known', () => {
    const result = renderTextPreview('const x: number = 1;', 'typescript');
    expect(result.language).toBe('typescript');
    expect(result.html).toContain('hljs-');
  });

  it('falls back to escaped plain text when no language is given', () => {
    const result = renderTextPreview('plain text', null);
    expect(result.language).toBeNull();
    expect(result.html).toBe('plain text');
  });

  it('HTML-escapes plain text content so it can never execute as markup', () => {
    const result = renderTextPreview('<script>alert(1)</script>', null);
    expect(result.html).not.toContain('<script>');
    expect(result.html).toContain('&lt;script&gt;');
  });
});
