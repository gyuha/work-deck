import type { Bookmark, BookmarkInput } from '../../shared/bookmark-types';

export interface BookmarksClient {
  list(): Promise<Bookmark[]>;
  add(input: BookmarkInput): Promise<Bookmark>;
  remove(id: string): Promise<void>;
  reorder(orderedIds: string[]): Promise<void>;
}

export interface BookmarkViewDeps {
  client: BookmarksClient;
  onActivate: (bookmark: Bookmark) => void;
}

function renderRows(container: HTMLElement, bookmarks: Bookmark[], deps: BookmarkViewDeps): void {
  container.innerHTML = '';
  for (const bookmark of bookmarks) {
    const row = document.createElement('div');
    row.className = 'bookmark-row';
    row.draggable = true;
    row.dataset.bookmarkId = bookmark.id;
    row.textContent = bookmark.name;

    row.addEventListener('click', () => deps.onActivate(bookmark));

    row.addEventListener('dragstart', (ev) => {
      (ev as DragEvent).dataTransfer?.setData('text/plain', bookmark.id);
    });
    row.addEventListener('dragover', (ev) => ev.preventDefault());
    row.addEventListener('drop', (ev) => {
      ev.preventDefault();
      const draggedId = (ev as DragEvent).dataTransfer?.getData('text/plain');
      if (!draggedId || draggedId === bookmark.id) return;

      const ids = bookmarks.map((b) => b.id);
      const from = ids.indexOf(draggedId);
      const to = ids.indexOf(bookmark.id);
      if (from === -1 || to === -1) return;
      ids.splice(to, 0, ...ids.splice(from, 1));

      void deps.client.reorder(ids).then(() => renderBookmarkView(container, deps));
    });

    container.appendChild(row);
  }
}

/** docs/features/bookmarks.md 4.3: manual drag reorder only, no automatic sort. */
export async function renderBookmarkView(container: HTMLElement, deps: BookmarkViewDeps): Promise<void> {
  const bookmarks = await deps.client.list();
  renderRows(container, bookmarks, deps);
}
