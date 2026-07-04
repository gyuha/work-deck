import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { Bookmark, BookmarkInput } from '../../shared/bookmark-types';

export class DuplicateBookmarkError extends Error {}

function sameTarget(a: BookmarkInput | Bookmark, b: BookmarkInput | Bookmark): boolean {
  if (a.kind !== b.kind || a.path !== b.path) return false;
  return a.kind === 'local' || a.connectionId === b.connectionId;
}

export class BookmarkStore {
  constructor(private readonly filePath: string) {}

  private async readAll(): Promise<Bookmark[]> {
    try {
      return JSON.parse(await fs.readFile(this.filePath, 'utf-8')) as Bookmark[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  private async writeAll(bookmarks: Bookmark[]): Promise<void> {
    await fs.writeFile(this.filePath, JSON.stringify(bookmarks, null, 2), 'utf-8');
  }

  async list(): Promise<Bookmark[]> {
    return this.readAll();
  }

  async add(input: BookmarkInput): Promise<Bookmark> {
    const all = await this.readAll();
    if (all.some((existing) => sameTarget(existing, input))) {
      throw new DuplicateBookmarkError('a bookmark for this target already exists');
    }
    const bookmark: Bookmark = { id: randomUUID(), ...input };
    all.push(bookmark);
    await this.writeAll(all);
    return bookmark;
  }

  async remove(id: string): Promise<void> {
    const all = await this.readAll();
    await this.writeAll(all.filter((b) => b.id !== id));
  }

  /** Reorders bookmarks to match the given id sequence (docs/features/bookmarks.md 4.3: manual sort only). */
  async reorder(orderedIds: string[]): Promise<void> {
    const all = await this.readAll();
    const byId = new Map(all.map((b) => [b.id, b]));
    const reordered = orderedIds.map((id) => byId.get(id)).filter((b): b is Bookmark => b !== undefined);
    await this.writeAll(reordered);
  }
}
