import { describe, expect, it } from 'vitest';
import {
  createFileListState,
  setSort,
  toggleHidden,
  visibleEntries,
  selectSingle,
  toggleSelect,
  selectRange,
  selectAll,
} from './file-list-state';
import type { DirEntry } from '../../shared/filesystem-types';

function entry(overrides: Partial<DirEntry>): DirEntry {
  return { name: 'x', type: 'file', size: 0, mtimeMs: 0, hidden: false, ...overrides };
}

const fixture: DirEntry[] = [
  entry({ name: 'b-folder', type: 'directory', size: 0, mtimeMs: 200 }),
  entry({ name: 'a.txt', type: 'file', size: 300, mtimeMs: 100 }),
  entry({ name: 'c.txt', type: 'file', size: 100, mtimeMs: 300 }),
  entry({ name: 'a-folder', type: 'directory', size: 0, mtimeMs: 50 }),
  entry({ name: '.hidden', type: 'file', size: 5, mtimeMs: 400, hidden: true }),
];

describe('visibleEntries — default: name asc, folders grouped first, hidden excluded', () => {
  it('groups folders before files and hides dotfiles by default', () => {
    const state = createFileListState(fixture);
    const names = visibleEntries(state).map((e) => e.name);
    expect(names).toEqual(['a-folder', 'b-folder', 'a.txt', 'c.txt']);
  });
});

describe('setSort', () => {
  it('sorts by size within each group, folders still first', () => {
    let state = createFileListState(fixture);
    state = setSort(state, 'size');
    const names = visibleEntries(state).map((e) => e.name);
    // folders (both size 0) keep their original relative order (stable sort); files sorted by size asc
    expect(names).toEqual(['b-folder', 'a-folder', 'c.txt', 'a.txt']);
  });

  it('toggles direction on repeated clicks of the same column', () => {
    let state = createFileListState(fixture);
    state = setSort(state, 'mtime');
    const asc = visibleEntries(state).map((e) => e.name);
    state = setSort(state, 'mtime');
    const desc = visibleEntries(state).map((e) => e.name);
    expect(asc).not.toEqual(desc);
    expect(state.sort.direction).toBe('desc');
  });
});

describe('toggleHidden', () => {
  it('shows dotfiles when toggled on', () => {
    let state = createFileListState(fixture);
    state = toggleHidden(state);
    expect(visibleEntries(state).map((e) => e.name)).toContain('.hidden');
  });
});

describe('selection', () => {
  it('selectSingle replaces the selection', () => {
    let state = createFileListState(fixture);
    state = selectSingle(state, 'a.txt');
    state = selectSingle(state, 'c.txt');
    expect([...state.selected]).toEqual(['c.txt']);
  });

  it('toggleSelect adds/removes without clearing others', () => {
    let state = createFileListState(fixture);
    state = toggleSelect(state, 'a.txt');
    state = toggleSelect(state, 'c.txt');
    expect(new Set(state.selected)).toEqual(new Set(['a.txt', 'c.txt']));
    state = toggleSelect(state, 'a.txt');
    expect([...state.selected]).toEqual(['c.txt']);
  });

  it('selectRange selects the contiguous visible-order range between cursor and target', () => {
    let state = createFileListState(fixture);
    state = selectSingle(state, 'a-folder'); // cursor = a-folder, visible order: a-folder,b-folder,a.txt,c.txt
    state = selectRange(state, 'a.txt');
    expect(new Set(state.selected)).toEqual(new Set(['a-folder', 'b-folder', 'a.txt']));
  });

  it('selectAll selects every currently visible entry', () => {
    let state = createFileListState(fixture);
    state = selectAll(state);
    expect(state.selected.size).toBe(visibleEntries(state).length);
  });
});
