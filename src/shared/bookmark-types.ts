export interface Bookmark {
  id: string;
  name: string;
  kind: 'local' | 'remote';
  path: string;
  connectionId?: string;
}

export type BookmarkInput = Omit<Bookmark, 'id'>;

export const BOOKMARK_CHANNELS = {
  list: 'bookmarks:list',
  add: 'bookmarks:add',
  remove: 'bookmarks:remove',
  reorder: 'bookmarks:reorder',
} as const;
