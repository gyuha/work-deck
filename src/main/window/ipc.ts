import { WINDOW_CHANNELS } from '../../shared/window-types';

export interface IpcMainLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches Electron's ipcMain.handle signature
  handle(channel: string, listener: (event: any, ...args: any[]) => unknown): void;
}

export interface WebContentsLike {
  send(channel: string, payload: unknown): void;
}

export interface WindowLike {
  minimize(): void;
  maximize(): void;
  unmaximize(): void;
  close(): void;
  isMaximized(): boolean;
  webContents: WebContentsLike;
  on(event: 'maximize' | 'unmaximize' | 'focus' | 'blur', listener: () => void): void;
}

export function registerWindowHandlers(ipcMain: IpcMainLike, win: WindowLike): void {
  ipcMain.handle(WINDOW_CHANNELS.minimize, () => win.minimize());
  ipcMain.handle(WINDOW_CHANNELS.maximize, () => win.maximize());
  ipcMain.handle(WINDOW_CHANNELS.unmaximize, () => win.unmaximize());
  ipcMain.handle(WINDOW_CHANNELS.close, () => win.close());
  ipcMain.handle(WINDOW_CHANNELS.isMaximized, () => win.isMaximized());

  win.on('maximize', () => win.webContents.send(WINDOW_CHANNELS.maximizeChanged, { isMaximized: true }));
  win.on('unmaximize', () => win.webContents.send(WINDOW_CHANNELS.maximizeChanged, { isMaximized: false }));
  win.on('focus', () => win.webContents.send(WINDOW_CHANNELS.focusChanged, { focused: true }));
  win.on('blur', () => win.webContents.send(WINDOW_CHANNELS.focusChanged, { focused: false }));
}
