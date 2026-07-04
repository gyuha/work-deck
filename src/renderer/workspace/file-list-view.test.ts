// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createFileListState } from './file-list-state';
import { renderFileListTab } from './file-list-view';
import type { DirEntry } from '../../shared/filesystem-types';

const entries: DirEntry[] = [
  { name: 'a-folder', type: 'directory', size: 0, mtimeMs: 1, hidden: false },
  { name: 'b.txt', type: 'file', size: 10, mtimeMs: 2, hidden: false },
];

describe('renderFileListTab', () => {
  it('renders one row per visible entry', () => {
    const container = document.createElement('div');
    renderFileListTab(container, createFileListState(entries), { onActivateFile: vi.fn(), onStateChange: vi.fn() });
    const rows = container.querySelectorAll('[data-name]');
    expect(rows).toHaveLength(2);
  });

  it('clicking a row reports a selection state change', () => {
    const container = document.createElement('div');
    const onStateChange = vi.fn();
    const state = createFileListState(entries);
    renderFileListTab(container, state, { onActivateFile: vi.fn(), onStateChange });

    container.querySelector<HTMLElement>('[data-name="b.txt"]')?.click();

    expect(onStateChange).toHaveBeenCalledTimes(1);
    const next = onStateChange.mock.calls[0][0];
    expect([...next.selected]).toEqual(['b.txt']);
  });

  it('double-clicking a file activates it; double-clicking a folder does not', () => {
    const container = document.createElement('div');
    const onActivateFile = vi.fn();
    const state = createFileListState(entries);
    renderFileListTab(container, state, { onActivateFile, onStateChange: vi.fn() });

    const folderRow = container.querySelector<HTMLElement>('[data-name="a-folder"]');
    const fileRow = container.querySelector<HTMLElement>('[data-name="b.txt"]');
    folderRow?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    fileRow?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    expect(onActivateFile).toHaveBeenCalledTimes(1);
    expect(onActivateFile).toHaveBeenCalledWith('b.txt');
  });

  it('clicking a sort column header reports a re-sorted state change', () => {
    const container = document.createElement('div');
    const onStateChange = vi.fn();
    renderFileListTab(container, createFileListState(entries), { onActivateFile: vi.fn(), onStateChange });

    container.querySelector<HTMLElement>('[data-column="size"]')?.click();

    expect(onStateChange).toHaveBeenCalledTimes(1);
    expect(onStateChange.mock.calls[0][0].sort.column).toBe('size');
  });

  it('clicking the hidden-files toggle reports a state change with showHidden flipped', () => {
    const container = document.createElement('div');
    const onStateChange = vi.fn();
    renderFileListTab(container, createFileListState(entries), { onActivateFile: vi.fn(), onStateChange });

    container.querySelector<HTMLElement>('[data-role="toggle-hidden"]')?.click();

    expect(onStateChange.mock.calls[0][0].showHidden).toBe(true);
  });
});
