import { marked } from 'marked';
import DOMPurify from 'dompurify';

/**
 * docs/features/preview.md 3.2: markdown source is untrusted input. Renders to HTML, then strips
 * scripts/event handlers/javascript:&data: URIs/iframe/object — DOMPurify's default policy already
 * covers the handler/URI cases; iframe/object are forbidden explicitly since some configs allow them.
 */
export function renderMarkdownSafe(markdownSource: string): string {
  const rawHtml = marked.parse(markdownSource, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml, { FORBID_TAGS: ['iframe', 'object', 'embed', 'script'] });
}
