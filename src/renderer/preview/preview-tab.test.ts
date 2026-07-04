// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderPreviewTab, type PreviewFilesystem } from './preview-tab';

function fakeFilesystem(bytes: Uint8Array, totalSize = bytes.length): PreviewFilesystem {
  return { readFile: vi.fn().mockResolvedValue({ bytes, totalSize }) };
}

describe('renderPreviewTab', () => {
  it('renders known text/code files with syntax highlighting', async () => {
    const container = document.createElement('div');
    const fs = fakeFilesystem(new TextEncoder().encode('const x = 1;'));

    await renderPreviewTab(container, { path: '/a.ts' }, fs);

    expect(fs.readFile).toHaveBeenCalledWith('/a.ts', undefined);
    expect(container.querySelector('[data-role="text-content"]')).not.toBeNull();
    expect(container.textContent).toContain('const');
  });

  it('renders markdown rendered by default, with a toggle to raw source', async () => {
    const container = document.createElement('div');
    const fs = fakeFilesystem(new TextEncoder().encode('# Title\n\n<script>alert(1)</script>'));

    await renderPreviewTab(container, { path: '/README.md' }, fs);

    expect(container.querySelector('h1')).not.toBeNull();
    expect(container.innerHTML).not.toContain('<script>');

    const toggle = container.querySelector<HTMLButtonElement>('[data-role="markdown-toggle"]');
    expect(toggle).not.toBeNull();
    toggle!.click();

    expect(container.querySelector('[data-role="markdown-content"]')?.textContent).toContain('# Title');
  });

  it('shows the unsupported-type notice for binary content with an unknown extension', async () => {
    const container = document.createElement('div');
    const fs = fakeFilesystem(new Uint8Array([0x00, 0x01, 0x02, 0x03]));

    await renderPreviewTab(container, { path: '/blob.dat' }, fs);

    expect(container.querySelector('[data-field="message"]')?.textContent).toBe('이 파일 형식은 미리보기를 지원하지 않습니다');
  });

  it('routes reads through the connection id for a remote target', async () => {
    const container = document.createElement('div');
    const fs = fakeFilesystem(new TextEncoder().encode('remote text'));

    await renderPreviewTab(container, { path: '/srv/a.txt', connectionId: 'conn-1' }, fs);

    expect(fs.readFile).toHaveBeenCalledWith('/srv/a.txt', 'conn-1');
  });

  it('shows a truncation banner for large text files', async () => {
    const container = document.createElement('div');
    const totalSize = 20 * 1024 * 1024;
    const fs = fakeFilesystem(new TextEncoder().encode('a'.repeat(1024 * 1024)), totalSize);

    await renderPreviewTab(container, { path: '/big.txt' }, fs);

    expect(container.querySelector('[data-role="truncation-banner"]')?.textContent).toContain('20.0MB');
  });
});
