// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderBookmarkView } from './bookmark-view';
import type { Bookmark } from '../../shared/bookmark-types';

function fakeClient(initial: Bookmark[]) {
  let bookmarks = initial;
  return {
    list: vi.fn(async () => bookmarks),
    add: vi.fn(),
    remove: vi.fn(),
    reorder: vi.fn(async (ids: string[]) => {
      const byId = new Map(bookmarks.map((b) => [b.id, b]));
      bookmarks = ids.map((id) => byId.get(id)!);
    }),
  };
}

describe('renderBookmarkView', () => {
  it('renders one row per bookmark in list order', async () => {
    const client = fakeClient([
      { id: '1', name: 'A', kind: 'local', path: '/a' },
      { id: '2', name: 'B', kind: 'local', path: '/b' },
    ]);
    const container = document.createElement('div');

    await renderBookmarkView(container, { client, onActivate: vi.fn() });

    const rows = container.querySelectorAll('[data-bookmark-id]');
    expect(Array.from(rows).map((r) => r.getAttribute('data-bookmark-id'))).toEqual(['1', '2']);
  });

  it('activates a bookmark on click', async () => {
    const bookmark: Bookmark = { id: '1', name: 'A', kind: 'local', path: '/a' };
    const client = fakeClient([bookmark]);
    const onActivate = vi.fn();
    const container = document.createElement('div');

    await renderBookmarkView(container, { client, onActivate });
    container.querySelector<HTMLElement>('[data-bookmark-id="1"]')?.click();

    expect(onActivate).toHaveBeenCalledWith(bookmark);
  });

  it('reorders via drag and drop and persists the new order', async () => {
    const client = fakeClient([
      { id: '1', name: 'A', kind: 'local', path: '/a' },
      { id: '2', name: 'B', kind: 'local', path: '/b' },
      { id: '3', name: 'C', kind: 'local', path: '/c' },
    ]);
    const container = document.createElement('div');
    await renderBookmarkView(container, { client, onActivate: vi.fn() });

    const dragged = container.querySelector<HTMLElement>('[data-bookmark-id="3"]')!;
    const dropTarget = container.querySelector<HTMLElement>('[data-bookmark-id="1"]')!;

    const dataStore = new Map<string, string>();
    const dragStartEvent = new Event('dragstart', { bubbles: true }) as DragEvent;
    Object.defineProperty(dragStartEvent, 'dataTransfer', {
      value: { setData: (_type: string, value: string) => dataStore.set('id', value), getData: () => dataStore.get('id') },
    });
    dragged.dispatchEvent(dragStartEvent);

    const dropEvent = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: { getData: () => dataStore.get('id') },
    });
    dropTarget.dispatchEvent(dropEvent);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(client.reorder).toHaveBeenCalledWith(['3', '1', '2']);
  });
});
