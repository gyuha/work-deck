import { describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { BookmarkStore, DuplicateBookmarkError } from './store';

async function makeStore(): Promise<BookmarkStore> {
  const dir = await mkdtemp(path.join(tmpdir(), 'workdeck-bookmarks-'));
  return new BookmarkStore(path.join(dir, 'bookmarks.json'));
}

describe('BookmarkStore', () => {
  it('adds a local bookmark and lists it', async () => {
    const store = await makeStore();
    const bm = await store.add({ name: 'Projects', kind: 'local', path: '/home/user/projects' });
    expect(bm.id).toBeTruthy();
    expect(await store.list()).toEqual([bm]);
  });

  it('appends new bookmarks to the end of the list', async () => {
    const store = await makeStore();
    await store.add({ name: 'A', kind: 'local', path: '/a' });
    await store.add({ name: 'B', kind: 'local', path: '/b' });
    expect((await store.list()).map((b) => b.name)).toEqual(['A', 'B']);
  });

  it('rejects a duplicate local bookmark (same path)', async () => {
    const store = await makeStore();
    await store.add({ name: 'A', kind: 'local', path: '/a' });
    await expect(store.add({ name: 'A again', kind: 'local', path: '/a' })).rejects.toThrow(DuplicateBookmarkError);
  });

  it('allows the same path on two different connections (remote bookmarks)', async () => {
    const store = await makeStore();
    await store.add({ name: 'srv1', kind: 'remote', path: '/var/www', connectionId: 'conn-1' });
    await expect(store.add({ name: 'srv2', kind: 'remote', path: '/var/www', connectionId: 'conn-2' })).resolves.toBeTruthy();
  });

  it('rejects a duplicate remote bookmark (same connection + path)', async () => {
    const store = await makeStore();
    await store.add({ name: 'srv1', kind: 'remote', path: '/var/www', connectionId: 'conn-1' });
    await expect(store.add({ name: 'dup', kind: 'remote', path: '/var/www', connectionId: 'conn-1' })).rejects.toThrow(
      DuplicateBookmarkError,
    );
  });

  it('removes a bookmark by id', async () => {
    const store = await makeStore();
    const bm = await store.add({ name: 'A', kind: 'local', path: '/a' });
    await store.remove(bm.id);
    expect(await store.list()).toEqual([]);
  });

  it('reorders bookmarks by an id sequence', async () => {
    const store = await makeStore();
    const a = await store.add({ name: 'A', kind: 'local', path: '/a' });
    const b = await store.add({ name: 'B', kind: 'local', path: '/b' });
    const c = await store.add({ name: 'C', kind: 'local', path: '/c' });

    await store.reorder([c.id, a.id, b.id]);

    expect((await store.list()).map((bm) => bm.id)).toEqual([c.id, a.id, b.id]);
  });

  it('persists bookmarks and their order across store instances backed by the same file', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'workdeck-bookmarks-'));
    const filePath = path.join(dir, 'bookmarks.json');
    const store1 = new BookmarkStore(filePath);
    const a = await store1.add({ name: 'A', kind: 'local', path: '/a' });
    const b = await store1.add({ name: 'B', kind: 'local', path: '/b' });
    await store1.reorder([b.id, a.id]);

    const store2 = new BookmarkStore(filePath);
    expect((await store2.list()).map((bm) => bm.name)).toEqual(['B', 'A']);
  });
});
