// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { mountWorkspace } from './index';

function fixtureFilesystem(entriesByDir: Record<string, { name: string; type: 'file' | 'directory'; size: number; mtimeMs: number; hidden: boolean }[]>) {
  return {
    listDirectory: vi.fn(async (dir: string) => entriesByDir[dir] ?? []),
    transfer: {
      copy: vi.fn().mockResolvedValue('job-1'),
      move: vi.fn().mockResolvedValue('job-2'),
    },
  };
}

describe('F5/F6 dual-pane transfer trigger', () => {
  it('F5 copies the selected item(s) from the focused pane to the opposite pane', async () => {
    const filesystem = fixtureFilesystem({
      '/left': [{ name: 'a.txt', type: 'file', size: 1, mtimeMs: 0, hidden: false }],
      '/right': [],
    });
    const container = document.createElement('div');
    const workspace = mountWorkspace(container, { filesystem });

    workspace.toggleSplit();
    workspace.openTab({ kind: 'file-list', path: '/left' });
    const paneB = workspace.getState().panes[1]!.id;
    workspace.focusPane(paneB);
    workspace.openTab({ kind: 'file-list', path: '/right' });
    await Promise.resolve();
    await Promise.resolve();

    // focus back on the left pane and select 'a.txt' there
    const paneA = workspace.getState().panes[0]!.id;
    workspace.focusPane(paneA);
    await Promise.resolve();
    container.querySelector<HTMLElement>('[data-pane="' + paneA + '"] [data-name="a.txt"]')?.click();
    await Promise.resolve();

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'F5', bubbles: true }));
    await Promise.resolve();

    expect(filesystem.transfer.copy).toHaveBeenCalledWith([{ sourcePath: '/left/a.txt', destPath: '/right/a.txt' }]);
  });

  it('F6 moves the selected item(s) from the focused pane to the opposite pane', async () => {
    const filesystem = fixtureFilesystem({
      '/left': [{ name: 'a.txt', type: 'file', size: 1, mtimeMs: 0, hidden: false }],
      '/right': [],
    });
    const container = document.createElement('div');
    const workspace = mountWorkspace(container, { filesystem });

    workspace.toggleSplit();
    workspace.openTab({ kind: 'file-list', path: '/left' });
    const paneB = workspace.getState().panes[1]!.id;
    workspace.focusPane(paneB);
    workspace.openTab({ kind: 'file-list', path: '/right' });
    await Promise.resolve();
    await Promise.resolve();

    const paneA = workspace.getState().panes[0]!.id;
    workspace.focusPane(paneA);
    await Promise.resolve();
    container.querySelector<HTMLElement>('[data-pane="' + paneA + '"] [data-name="a.txt"]')?.click();
    await Promise.resolve();

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'F6', bubbles: true }));
    await Promise.resolve();

    expect(filesystem.transfer.move).toHaveBeenCalledWith([{ sourcePath: '/left/a.txt', destPath: '/right/a.txt' }]);
  });
});
