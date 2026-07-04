// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderUnsupportedPreview } from './unsupported-preview';

describe('renderUnsupportedPreview (docs/features/preview.md 4장)', () => {
  it('shows file name, size, modified time, and the unsupported-type message', () => {
    const container = document.createElement('div');
    renderUnsupportedPreview(container, { name: 'archive.zip', size: 2048, mtimeMs: Date.parse('2026-01-01T00:00:00Z') });

    expect(container.querySelector('[data-field="name"]')?.textContent).toBe('archive.zip');
    expect(container.querySelector('[data-field="size"]')?.textContent).toContain('2');
    expect(container.querySelector('[data-field="message"]')?.textContent).toBe('이 파일 형식은 미리보기를 지원하지 않습니다');
  });

  it('never renders the file name as executable markup', () => {
    const container = document.createElement('div');
    renderUnsupportedPreview(container, { name: '<img src=x onerror=alert(1)>.bin', size: 1, mtimeMs: 0 });

    expect(container.innerHTML).not.toContain('<img');
  });
});
