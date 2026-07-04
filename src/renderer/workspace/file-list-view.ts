import { setSort, toggleHidden, visibleEntries, selectSingle, toggleSelect, selectRange, type FileListState, type SortColumn } from './file-list-state';

export interface FileListViewDeps {
  onActivateFile: (name: string) => void;
  onStateChange: (state: FileListState) => void;
}

const SORT_COLUMNS: SortColumn[] = ['name', 'size', 'mtime'];

export function renderFileListTab(container: HTMLElement, state: FileListState, deps: FileListViewDeps): void {
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'file-list-header';
  for (const column of SORT_COLUMNS) {
    const th = document.createElement('button');
    th.textContent = column;
    th.dataset.column = column;
    th.classList.toggle('active', state.sort.column === column);
    th.addEventListener('click', () => deps.onStateChange(setSort(state, column)));
    header.appendChild(th);
  }
  const hiddenToggle = document.createElement('button');
  hiddenToggle.dataset.role = 'toggle-hidden';
  hiddenToggle.textContent = state.showHidden ? '숨김 파일 감추기' : '숨김 파일 표시';
  hiddenToggle.addEventListener('click', () => deps.onStateChange(toggleHidden(state)));
  header.appendChild(hiddenToggle);
  container.appendChild(header);

  const rows = document.createElement('div');
  rows.className = 'file-list-rows';
  for (const entry of visibleEntries(state)) {
    const row = document.createElement('div');
    row.className = 'file-list-row';
    row.dataset.name = entry.name;
    row.classList.toggle('selected', state.selected.has(entry.name));
    row.textContent = entry.name;

    row.addEventListener('click', (ev) => {
      const mouse = ev as MouseEvent;
      const next = mouse.shiftKey
        ? selectRange(state, entry.name)
        : mouse.metaKey || mouse.ctrlKey
          ? toggleSelect(state, entry.name)
          : selectSingle(state, entry.name);
      deps.onStateChange(next);
    });
    row.addEventListener('dblclick', () => {
      if (entry.type === 'file') deps.onActivateFile(entry.name);
    });
    rows.appendChild(row);
  }
  container.appendChild(rows);
}
