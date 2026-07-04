import { describe, expect, it, vi } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { BookmarkStore } from './store';
import { registerBookmarkHandlers } from './ipc';
import { BOOKMARK_CHANNELS } from '../../shared/bookmark-types';

async function setup() {
  const dir = await mkdtemp(path.join(tmpdir(), 'workdeck-bookmarks-ipc-'));
  const store = new BookmarkStore(path.join(dir, 'bookmarks.json'));
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const ipcMain = { handle: vi.fn((channel: string, fn: (...a: unknown[]) => unknown) => handlers.set(channel, fn)) };
  registerBookmarkHandlers(ipcMain, store);
  return { handlers, store };
}

describe('registerBookmarkHandlers', () => {
  it('add + list round-trips through the IPC handlers', async () => {
    const { handlers } = await setup();
    const created = (await handlers.get(BOOKMARK_CHANNELS.add)!({}, { name: 'A', kind: 'local', path: '/a' })) as { id: string };
    const list = await handlers.get(BOOKMARK_CHANNELS.list)!({});
    expect(list).toEqual([created]);
  });

  it('remove and reorder mutate the underlying store', async () => {
    const { handlers, store } = await setup();
    const a = (await handlers.get(BOOKMARK_CHANNELS.add)!({}, { name: 'A', kind: 'local', path: '/a' })) as { id: string };
    const b = (await handlers.get(BOOKMARK_CHANNELS.add)!({}, { name: 'B', kind: 'local', path: '/b' })) as { id: string };

    await handlers.get(BOOKMARK_CHANNELS.reorder)!({}, [b.id, a.id]);
    expect((await store.list()).map((bm) => bm.id)).toEqual([b.id, a.id]);

    await handlers.get(BOOKMARK_CHANNELS.remove)!({}, a.id);
    expect((await store.list()).map((bm) => bm.id)).toEqual([b.id]);
  });
});
