export type PreviewType = 'image' | 'markdown' | 'text' | 'unsupported';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']);
const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown']);
const TEXT_EXTENSIONS = new Set([
  '.txt',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.json',
  '.css',
  '.html',
  '.htm',
  '.py',
  '.java',
  '.c',
  '.cpp',
  '.h',
  '.go',
  '.rs',
  '.rb',
  '.php',
  '.sh',
  '.yml',
  '.yaml',
  '.xml',
  '.sql',
  '.log',
]);

function extname(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot <= 0 ? '' : filename.slice(dot).toLowerCase();
}

export function detectPreviewTypeByExtension(filename: string): PreviewType | 'unknown' {
  const ext = extname(filename);
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (MARKDOWN_EXTENSIONS.has(ext)) return 'markdown';
  if (TEXT_EXTENSIONS.has(ext)) return 'text';
  return 'unknown';
}

export function isLikelyText(sample: Uint8Array): boolean {
  return !sample.includes(0);
}

export function detectPreviewType(filename: string, contentSample: Uint8Array): PreviewType {
  const byExtension = detectPreviewTypeByExtension(filename);
  if (byExtension !== 'unknown') return byExtension;
  return isLikelyText(contentSample) ? 'text' : 'unsupported';
}
