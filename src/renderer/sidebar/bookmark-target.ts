import type { Bookmark } from '../../shared/bookmark-types';
import type { FileListTarget } from '../workspace/tab-rules';

/** docs/features/bookmarks.md 1장: a bookmark always resolves to a file-list tab (local or remote). */
export function bookmarkToTabTarget(bookmark: Bookmark): FileListTarget {
  return bookmark.kind === 'remote'
    ? { kind: 'file-list', path: bookmark.path, connectionId: bookmark.connectionId }
    : { kind: 'file-list', path: bookmark.path };
}
