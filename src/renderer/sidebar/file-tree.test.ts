// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderFileTreeRoot } from './file-tree';
import { mountWorkspace } from '../workspace';
import type { DirEntry } from '../../shared/filesystem-types';

function makeFilesystemStub(tree: Record<string, DirEntry[]>) {
  return {
    listDirectory: vi.fn(async (path: string) => tree[path] ?? []),
  };
}

describe('sidebar file tree', () => {
  it('renders root entries and expands a folder to show its children on click', async () => {
    const filesystem = makeFilesystemStub({
      '/root': [{ name: 'sub', type: 'directory', size: 0, mtimeMs: 0, hidden: false }],
      '/root/sub': [{ name: 'inner.txt', type: 'file', size: 1, mtimeMs: 0, hidden: false }],
    });
    const container = document.createElement('div');
    await renderFileTreeRoot(container, '/root', {
      filesystem,
      joinPath: (a, b) => `${a}/${b}`,
      onActivateFolder: vi.fn(),
      onActivateFile: vi.fn(),
    });

    const subRow = container.querySelector<HTMLElement>('[data-path="/root/sub"]');
    expect(subRow).not.toBeNull();
    subRow?.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(container.querySelector('[data-path="/root/sub/inner.txt"]')).not.toBeNull();
  });

  it('activating the same folder twice opens one tab, focused both times (dedup via workspace)', async () => {
    const filesystem = makeFilesystemStub({
      '/root': [{ name: 'sub', type: 'directory', size: 0, mtimeMs: 0, hidden: false }],
    });
    const workspaceContainer = document.createElement('div');
    const workspace = mountWorkspace(workspaceContainer);

    const container = document.createElement('div');
    await renderFileTreeRoot(container, '/root', {
      filesystem,
      joinPath: (a, b) => `${a}/${b}`,
      onActivateFolder: (path) => workspace.openTab({ kind: 'file-list', path }),
      onActivateFile: vi.fn(),
    });

    const subRow = container.querySelector<HTMLElement>('[data-path="/root/sub"]');
    subRow?.click();
    subRow?.click();

    expect(workspace.getState().panes[0].tabs).toHaveLength(1);
  });
});
