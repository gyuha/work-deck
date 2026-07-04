import { detectPreviewTypeByExtension, isLikelyText } from './detect-type';
import { decodeText, type DecodeResult } from './encoding';
import { computeLargeFilePolicy, formatTruncationBanner } from './large-file';
import { languageForExtension, renderTextPreview } from './text-preview';
import { renderMarkdownSafe } from './markdown-preview';
import { computeInitialZoom, zoomIn, zoomOut, fitToWindow, actualSize, type ImageViewState } from './image-preview';
import { renderUnsupportedPreview } from './unsupported-preview';

export interface PreviewFilesystem {
  readFile(path: string, connectionId?: string): Promise<{ bytes: Uint8Array; totalSize: number }>;
}

export interface PreviewTarget {
  path: string;
  connectionId?: string;
}

function basename(filePath: string): string {
  return filePath.split('/').pop() || filePath;
}

function renderTextTab(container: HTMLElement, decoded: DecodeResult, filename: string, banner: string | null): void {
  if (banner) {
    const bannerEl = document.createElement('div');
    bannerEl.dataset.role = 'truncation-banner';
    bannerEl.textContent = banner;
    container.appendChild(bannerEl);
  }
  if (decoded.hadReplacementChars) {
    const warning = document.createElement('div');
    warning.dataset.role = 'encoding-warning';
    warning.textContent = '인코딩을 판별하지 못했습니다';
    container.appendChild(warning);
  }

  const { html } = renderTextPreview(decoded.text, languageForExtension(filename));
  const pre = document.createElement('pre');
  pre.dataset.role = 'text-content';
  pre.innerHTML = html; // safe: escaped plain text or hljs-escaped highlight spans, never raw file content
  container.appendChild(pre);
}

function renderMarkdownTab(container: HTMLElement, decoded: DecodeResult, filename: string, banner: string | null): void {
  // docs/features/preview.md 3.2: a markdown file over the large-file threshold opens as source, not rendered.
  if (banner) {
    renderTextTab(container, decoded, filename, banner);
    return;
  }

  let showRaw = false;
  const toggle = document.createElement('button');
  toggle.dataset.role = 'markdown-toggle';
  const content = document.createElement('div');
  content.dataset.role = 'markdown-content';

  function refresh(): void {
    toggle.textContent = showRaw ? '렌더 보기' : '원본 보기';
    content.innerHTML = '';
    if (showRaw) {
      renderTextTab(content, decoded, filename, null);
    } else {
      content.innerHTML = renderMarkdownSafe(decoded.text);
    }
  }

  toggle.addEventListener('click', () => {
    showRaw = !showRaw;
    refresh();
  });
  refresh();
  container.append(toggle, content);
}

function renderImageTab(container: HTMLElement, bytes: Uint8Array, filename: string): void {
  const info = document.createElement('div');
  info.dataset.role = 'image-info';
  info.textContent = filename;

  const img = document.createElement('img');
  img.dataset.role = 'preview-image';
  img.src = URL.createObjectURL(new Blob([new Uint8Array(bytes)]));

  let state: ImageViewState = actualSize();
  const applyScale = () => {
    img.style.transform = `scale(${state.scale})`;
  };

  img.addEventListener('load', () => {
    const rect = container.getBoundingClientRect();
    state = computeInitialZoom(img.naturalWidth, img.naturalHeight, rect.width || 800, rect.height || 600);
    applyScale();
  });

  const zoomInBtn = document.createElement('button');
  zoomInBtn.dataset.role = 'zoom-in';
  zoomInBtn.addEventListener('click', () => {
    state = zoomIn(state);
    applyScale();
  });

  const zoomOutBtn = document.createElement('button');
  zoomOutBtn.dataset.role = 'zoom-out';
  zoomOutBtn.addEventListener('click', () => {
    state = zoomOut(state);
    applyScale();
  });

  const fitBtn = document.createElement('button');
  fitBtn.dataset.role = 'zoom-fit';
  fitBtn.addEventListener('click', () => {
    const rect = container.getBoundingClientRect();
    state = fitToWindow(img.naturalWidth, img.naturalHeight, rect.width || 800, rect.height || 600);
    applyScale();
  });

  const actualBtn = document.createElement('button');
  actualBtn.dataset.role = 'zoom-actual';
  actualBtn.addEventListener('click', () => {
    state = actualSize();
    applyScale();
  });

  container.append(info, zoomInBtn, zoomOutBtn, fitBtn, actualBtn, img);
}

export async function renderPreviewTab(container: HTMLElement, target: PreviewTarget, filesystem: PreviewFilesystem): Promise<void> {
  container.innerHTML = '';
  const name = basename(target.path);
  const extType = detectPreviewTypeByExtension(name);

  const { bytes, totalSize } = await filesystem.readFile(target.path, target.connectionId);

  if (extType === 'image') {
    renderImageTab(container, bytes, name);
    return;
  }

  const policy = computeLargeFilePolicy(totalSize);
  const effectiveBytes = bytes.length > policy.displayBytes ? bytes.subarray(0, policy.displayBytes) : bytes;
  const type = extType !== 'unknown' ? extType : isLikelyText(effectiveBytes) ? 'text' : 'unsupported';

  if (type === 'unsupported') {
    renderUnsupportedPreview(container, { name, size: totalSize, mtimeMs: 0 });
    return;
  }

  const decoded = decodeText(effectiveBytes);
  const banner = formatTruncationBanner(policy);

  if (type === 'markdown') {
    renderMarkdownTab(container, decoded, name, banner);
  } else {
    renderTextTab(container, decoded, name, banner);
  }
}
