import { contextBridge, ipcRenderer } from 'electron';
import { FILESYSTEM_CHANNELS, TRANSFER_CHANNELS } from '../shared/filesystem-types';
import { CONNECTION_CHANNELS } from '../shared/connection-types';
import { TERMINAL_CHANNELS } from '../shared/terminal-types';
import { REMOTE_FILE_CHANNELS } from '../shared/remote-file-types';
import { BOOKMARK_CHANNELS } from '../shared/bookmark-types';
import { WINDOW_CHANNELS } from '../shared/window-types';

let conflictHandler: ((destPath: string) => Promise<{ policy: string; newName?: string }>) | undefined;

ipcRenderer.on(TRANSFER_CHANNELS.conflict, async (_event, payload: { requestId: string; destPath: string }) => {
  // No renderer handler registered yet -> default to overwrite so a transfer never hangs.
  const decision = conflictHandler ? await conflictHandler(payload.destPath) : { policy: 'overwrite' };
  ipcRenderer.invoke(TRANSFER_CHANNELS.resolveConflict, payload.requestId, decision);
});

contextBridge.exposeInMainWorld('workdeck', {
  version: process.env.npm_package_version ?? '0.1.0',
  platform: process.platform,
  window: {
    minimize: () => ipcRenderer.invoke(WINDOW_CHANNELS.minimize),
    maximize: () => ipcRenderer.invoke(WINDOW_CHANNELS.maximize),
    unmaximize: () => ipcRenderer.invoke(WINDOW_CHANNELS.unmaximize),
    close: () => ipcRenderer.invoke(WINDOW_CHANNELS.close),
    isMaximized: () => ipcRenderer.invoke(WINDOW_CHANNELS.isMaximized),
    onMaximizeChanged: (cb: (payload: { isMaximized: boolean }) => void) => {
      const listener = (_event: unknown, payload: { isMaximized: boolean }) => cb(payload);
      ipcRenderer.on(WINDOW_CHANNELS.maximizeChanged, listener);
      return () => ipcRenderer.removeListener(WINDOW_CHANNELS.maximizeChanged, listener);
    },
    onFocusChanged: (cb: (payload: { focused: boolean }) => void) => {
      const listener = (_event: unknown, payload: { focused: boolean }) => cb(payload);
      ipcRenderer.on(WINDOW_CHANNELS.focusChanged, listener);
      return () => ipcRenderer.removeListener(WINDOW_CHANNELS.focusChanged, listener);
    },
  },
  filesystem: {
    listDirectory: (path: string) => ipcRenderer.invoke(FILESYSTEM_CHANNELS.listDirectory, path),
    readFile: (path: string) => ipcRenderer.invoke(FILESYSTEM_CHANNELS.readFile, path),
    transfer: {
      copy: (items: unknown) => ipcRenderer.invoke(TRANSFER_CHANNELS.copy, items),
      move: (items: unknown) => ipcRenderer.invoke(TRANSFER_CHANNELS.move, items),
      onProgress: (cb: (progress: unknown) => void) => {
        const listener = (_event: unknown, payload: unknown) => cb(payload);
        ipcRenderer.on(TRANSFER_CHANNELS.progress, listener);
        return () => ipcRenderer.removeListener(TRANSFER_CHANNELS.progress, listener);
      },
      setConflictHandler: (handler: typeof conflictHandler) => {
        conflictHandler = handler;
      },
    },
  },
  connections: {
    list: () => ipcRenderer.invoke(CONNECTION_CHANNELS.list),
    create: (input: unknown) => ipcRenderer.invoke(CONNECTION_CHANNELS.create, input),
    update: (id: string, patch: unknown) => ipcRenderer.invoke(CONNECTION_CHANNELS.update, id, patch),
    delete: (id: string) => ipcRenderer.invoke(CONNECTION_CHANNELS.delete, id),
  },
  terminal: {
    createLocal: (options: unknown) => ipcRenderer.invoke(TERMINAL_CHANNELS.createLocal, options),
    createSsh: (connectionId: string) => ipcRenderer.invoke(TERMINAL_CHANNELS.createSsh, { connectionId }),
    write: (id: string, data: string) => ipcRenderer.invoke(TERMINAL_CHANNELS.write, id, data),
    resize: (id: string, cols: number, rows: number) => ipcRenderer.invoke(TERMINAL_CHANNELS.resize, id, cols, rows),
    kill: (id: string) => ipcRenderer.invoke(TERMINAL_CHANNELS.kill, id),
    reconnect: (id: string) => ipcRenderer.invoke(TERMINAL_CHANNELS.reconnect, id),
    isBusy: (id: string) => ipcRenderer.invoke(TERMINAL_CHANNELS.isBusy, id),
    onData: (cb: (payload: { id: string; data: string }) => void) => {
      const listener = (_event: unknown, payload: { id: string; data: string }) => cb(payload);
      ipcRenderer.on(TERMINAL_CHANNELS.data, listener);
      return () => ipcRenderer.removeListener(TERMINAL_CHANNELS.data, listener);
    },
    onStatusChanged: (cb: (payload: { id: string; status: string }) => void) => {
      const listener = (_event: unknown, payload: { id: string; status: string }) => cb(payload);
      ipcRenderer.on(TERMINAL_CHANNELS.statusChanged, listener);
      return () => ipcRenderer.removeListener(TERMINAL_CHANNELS.statusChanged, listener);
    },
  },
  remoteFile: {
    listDirectory: (connectionId: string, path: string) => ipcRenderer.invoke(REMOTE_FILE_CHANNELS.listDirectory, connectionId, path),
    readFile: (connectionId: string, path: string) => ipcRenderer.invoke(REMOTE_FILE_CHANNELS.readFile, connectionId, path),
    transfer: (items: unknown, mode: 'copy' | 'move') => ipcRenderer.invoke(REMOTE_FILE_CHANNELS.transfer, items, mode),
  },
  bookmarks: {
    list: () => ipcRenderer.invoke(BOOKMARK_CHANNELS.list),
    add: (input: unknown) => ipcRenderer.invoke(BOOKMARK_CHANNELS.add, input),
    remove: (id: string) => ipcRenderer.invoke(BOOKMARK_CHANNELS.remove, id),
    reorder: (orderedIds: string[]) => ipcRenderer.invoke(BOOKMARK_CHANNELS.reorder, orderedIds),
  },
});

console.log('[preload] WorkDeck context bridge loaded');
