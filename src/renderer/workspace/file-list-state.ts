import type { DirEntry } from '../../shared/filesystem-types';

export type SortColumn = 'name' | 'size' | 'mtime';
export type SortDirection = 'asc' | 'desc';

export interface FileListState {
  entries: DirEntry[];
  sort: { column: SortColumn; direction: SortDirection };
  showHidden: boolean;
  selected: Set<string>;
  cursor?: string;
}

export function createFileListState(entries: DirEntry[]): FileListState {
  return { entries, sort: { column: 'name', direction: 'asc' }, showHidden: false, selected: new Set() };
}

export function setSort(state: FileListState, column: SortColumn): FileListState {
  const direction: SortDirection = state.sort.column === column && state.sort.direction === 'asc' ? 'desc' : 'asc';
  return { ...state, sort: { column, direction } };
}

export function toggleHidden(state: FileListState): FileListState {
  return { ...state, showHidden: !state.showHidden };
}

function sortValue(entry: DirEntry, column: SortColumn): string | number {
  if (column === 'name') return entry.name;
  if (column === 'size') return entry.size;
  return entry.mtimeMs;
}

export function visibleEntries(state: FileListState): DirEntry[] {
  const { column, direction } = state.sort;
  const sign = direction === 'asc' ? 1 : -1;
  return state.entries
    .filter((e) => state.showHidden || !e.hidden)
    .slice()
    .sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      const av = sortValue(a, column);
      const bv = sortValue(b, column);
      if (av < bv) return -1 * sign;
      if (av > bv) return 1 * sign;
      return 0;
    });
}

export function selectSingle(state: FileListState, name: string): FileListState {
  return { ...state, selected: new Set([name]), cursor: name };
}

export function toggleSelect(state: FileListState, name: string): FileListState {
  const selected = new Set(state.selected);
  if (selected.has(name)) selected.delete(name);
  else selected.add(name);
  return { ...state, selected, cursor: name };
}

export function selectRange(state: FileListState, name: string): FileListState {
  const order = visibleEntries(state).map((e) => e.name);
  const from = order.indexOf(state.cursor ?? name);
  const to = order.indexOf(name);
  if (from === -1 || to === -1) return selectSingle(state, name);
  const [start, end] = from <= to ? [from, to] : [to, from];
  const selected = new Set(order.slice(start, end + 1));
  return { ...state, selected, cursor: name };
}

export function selectAll(state: FileListState): FileListState {
  return { ...state, selected: new Set(visibleEntries(state).map((e) => e.name)) };
}
