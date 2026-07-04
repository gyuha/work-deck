import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import ruby from 'highlight.js/lib/languages/ruby';
import php from 'highlight.js/lib/languages/php';
import bash from 'highlight.js/lib/languages/bash';
import yaml from 'highlight.js/lib/languages/yaml';
import sql from 'highlight.js/lib/languages/sql';

// Only the languages we map by extension below — the full `highlight.js` package ships ~190
// languages and would otherwise bloat the renderer bundle by megabytes for languages we never use.
// The cast works around highlight.js's own type mismatch between `lib/core` and `lib/languages/*`.
type AnyLanguageFn = Parameters<typeof hljs.registerLanguage>[1];
const register = (name: string, lang: unknown) => hljs.registerLanguage(name, lang as AnyLanguageFn);

register('javascript', javascript);
register('typescript', typescript);
register('json', json);
register('css', css);
register('xml', xml);
register('python', python);
register('java', java);
register('c', c);
register('cpp', cpp);
register('go', go);
register('rust', rust);
register('ruby', ruby);
register('php', php);
register('bash', bash);
register('yaml', yaml);
register('sql', sql);

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.json': 'json',
  '.css': 'css',
  '.html': 'xml',
  '.htm': 'xml',
  '.xml': 'xml',
  '.py': 'python',
  '.java': 'java',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.go': 'go',
  '.rs': 'rust',
  '.rb': 'ruby',
  '.php': 'php',
  '.sh': 'bash',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.sql': 'sql',
};

function extname(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot <= 0 ? '' : filename.slice(dot).toLowerCase();
}

export function languageForExtension(filename: string): string | null {
  return EXTENSION_TO_LANGUAGE[extname(filename)] ?? null;
}

export interface TextPreviewResult {
  html: string;
  language: string | null;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** docs/features/preview.md 3.1: highlight when the language is known, otherwise plain (HTML-escaped) text. */
export function renderTextPreview(text: string, language: string | null): TextPreviewResult {
  if (language && hljs.getLanguage(language)) {
    return { html: hljs.highlight(text, { language }).value, language };
  }
  return { html: escapeHtml(text), language: null };
}
