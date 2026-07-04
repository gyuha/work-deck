// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderMarkdownSafe } from './markdown-preview';

describe('renderMarkdownSafe', () => {
  it('renders plain markdown to HTML', () => {
    const html = renderMarkdownSafe('# Hello\n\nSome **bold** text.');
    expect(html).toContain('<h1');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('strips <script> tags', () => {
    const html = renderMarkdownSafe('hello\n\n<script>alert(1)</script>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert(1)');
  });

  it('strips inline event handler attributes', () => {
    const html = renderMarkdownSafe('<img src="x.png" onerror="alert(1)">');
    expect(html).not.toContain('onerror');
  });

  it('strips javascript: URIs', () => {
    const html = renderMarkdownSafe('[click me](javascript:alert(1))');
    expect(html.toLowerCase()).not.toContain('javascript:');
  });

  it('removes iframe and object embeds', () => {
    const html = renderMarkdownSafe('<iframe src="https://evil.example"></iframe><object data="evil.swf"></object>');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('<object');
  });
});
