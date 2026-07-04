import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import path from 'node:path';
import { getWindowChromeConfig } from './window/window-chrome';
import { registerWindowHandlers } from './window/ipc';
import { registerFilesystemHandlers } from './filesystem';
import { registerTransferHandlers } from './filesystem/transfer-ipc';
import { ConnectionProfileStore } from './connections/profile-store';
import { SecretStore } from './connections/secrets';
import { registerConnectionHandlers } from './connections/ipc';
import { InMemoryHostTrustStore } from './connections/host-trust';
import { createSshConnectResolver } from './connections/resolve-ssh';
import { createFtpConnectResolver } from './connections/resolve-ftp';
import { registerRemoteFileHandlers } from './connections/remote-file-ipc';
import { registerTerminalHandlers } from './terminal/terminal-ipc';
import { BookmarkStore } from './bookmarks/store';
import { registerBookmarkHandlers } from './bookmarks/ipc';

let windowHandlersRegistered = false;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    ...getWindowChromeConfig(process.platform),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  // ipcMain.handle allows only one handler per channel app-wide, so wire these once
  // against the first window (MVP is single-window; multi-window routing is future work).
  if (!windowHandlersRegistered) {
    registerWindowHandlers(ipcMain, win);
    registerTransferHandlers(ipcMain, win.webContents);

    const connectionStore = new ConnectionProfileStore(path.join(app.getPath('userData'), 'connections.json'));
    const secretStore = new SecretStore(safeStorage);
    const trustStore = new InMemoryHostTrustStore();
    registerConnectionHandlers(ipcMain, connectionStore, secretStore);
    const resolveSshConnectOptions = createSshConnectResolver(connectionStore, secretStore, trustStore);
    registerTerminalHandlers(ipcMain, win.webContents, { resolveSshConnectOptions });
    registerRemoteFileHandlers(ipcMain, {
      store: connectionStore,
      resolveSshConnectOptions,
      resolveFtpConnectOptions: createFtpConnectResolver(connectionStore, secretStore),
    });

    const bookmarkStore = new BookmarkStore(path.join(app.getPath('userData'), 'bookmarks.json'));
    registerBookmarkHandlers(ipcMain, bookmarkStore);

    windowHandlersRegistered = true;
  }
  return win;
}

registerFilesystemHandlers(ipcMain);

app.whenReady().then(() => {
  const win = createWindow();
  win.loadFile(path.join(__dirname, '../renderer/index.html'));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
