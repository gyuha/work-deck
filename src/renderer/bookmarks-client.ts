import type { Bookmark, BookmarkInput } from '../shared/bookmark-types';
import type { BookmarksClient } from './sidebar/bookmark-view';

export function getBookmarksClient(): BookmarksClient {
  return window.workdeck.bookmarks;
}

export type { Bookmark, BookmarkInput };
