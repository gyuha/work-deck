export interface UnsupportedFileInfo {
  name: string;
  size: number;
  mtimeMs: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** docs/features/preview.md 4장: unsupported (e.g. binary) files still open a tab — just file info + a notice. */
export function renderUnsupportedPreview(container: HTMLElement, info: UnsupportedFileInfo): void {
  container.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'preview-unsupported';

  const nameEl = document.createElement('div');
  nameEl.dataset.field = 'name';
  nameEl.textContent = info.name;

  const sizeEl = document.createElement('div');
  sizeEl.dataset.field = 'size';
  sizeEl.textContent = formatSize(info.size);

  const mtimeEl = document.createElement('div');
  mtimeEl.dataset.field = 'mtime';
  mtimeEl.textContent = new Date(info.mtimeMs).toLocaleString();

  const messageEl = document.createElement('div');
  messageEl.dataset.field = 'message';
  messageEl.textContent = '이 파일 형식은 미리보기를 지원하지 않습니다';

  root.append(nameEl, sizeEl, mtimeEl, messageEl);
  container.appendChild(root);
}
