import { BOOKMARK_CHANNELS } from '../../shared/bookmark-types';
import type { BookmarkStore } from './store';

export interface IpcMainLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches Electron's ipcMain.handle signature
  handle(channel: string, listener: (event: any, ...args: any[]) => unknown): void;
}

export function registerBookmarkHandlers(ipcMain: IpcMainLike, store: BookmarkStore): void {
  ipcMain.handle(BOOKMARK_CHANNELS.list, () => store.list());
  ipcMain.handle(BOOKMARK_CHANNELS.add, (_event, input) => store.add(input));
  ipcMain.handle(BOOKMARK_CHANNELS.remove, (_event, id: string) => store.remove(id));
  ipcMain.handle(BOOKMARK_CHANNELS.reorder, (_event, orderedIds: string[]) => store.reorder(orderedIds));
}
