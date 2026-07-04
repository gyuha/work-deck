import { randomUUID } from 'node:crypto';
import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { REMOTE_FILE_CHANNELS } from '../../shared/remote-file-types';
import { PREVIEW_LARGE_FILE_THRESHOLD_BYTES, PREVIEW_DISPLAY_BYTES, type FileContentResult } from '../../shared/preview-types';
import { connectSftp, listRemoteDirectorySftp, type RemoteDirEntry } from './sftp';
import { connectFtp, listRemoteDirectoryFtp, type FtpConnectOptions } from './ftp';
import { createSftpTransport, createFtpTransport, type RemoteTransport } from './remote-transfer';
import { transferRemoteAware, type RemoteAwareTransferItem, type RemoteSessionProvider } from './remote-aware-transfer';
import { copyItems, moveItems } from '../filesystem/transfer';
import type { ConnectionProfileStore } from './profile-store';
import type { SshConnectResolution } from '../terminal/terminal-ipc';

export interface IpcMainLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches Electron's ipcMain.handle signature
  handle(channel: string, listener: (event: any, ...args: any[]) => unknown): void;
}

export interface RemoteFileIpcDeps {
  store: ConnectionProfileStore;
  resolveSshConnectOptions: (connectionId: string) => Promise<SshConnectResolution>;
  resolveFtpConnectOptions: (connectionId: string) => Promise<FtpConnectOptions>;
}

interface RemoteSession extends RemoteTransport {
  listDirectory(path: string): Promise<RemoteDirEntry[]>;
}

export function registerRemoteFileHandlers(ipcMain: IpcMainLike, deps: RemoteFileIpcDeps): RemoteSessionProvider {
  const sessions = new Map<string, RemoteSession>();

  async function getOrCreateSession(connectionId: string): Promise<RemoteSession> {
    const existing = sessions.get(connectionId);
    if (existing) return existing;

    const profile = (await deps.store.list()).find((p) => p.id === connectionId);
    if (!profile) throw new Error(`connection profile not found: ${connectionId}`);

    let session: RemoteSession;
    if (profile.protocols.sftp) {
      const { profileId, options, trustStore } = await deps.resolveSshConnectOptions(connectionId);
      const { sftp } = await connectSftp(profileId, options, trustStore);
      session = { ...createSftpTransport(sftp), listDirectory: (path) => listRemoteDirectorySftp(sftp, path) };
    } else {
      const ftpOptions = await deps.resolveFtpConnectOptions(connectionId);
      const client = await connectFtp(ftpOptions);
      session = { ...createFtpTransport(client), listDirectory: (path) => listRemoteDirectoryFtp(client, path) };
    }

    sessions.set(connectionId, session);
    return session;
  }

  const sessionProvider: RemoteSessionProvider = { getTransport: getOrCreateSession };

  ipcMain.handle(REMOTE_FILE_CHANNELS.listDirectory, async (_event, connectionId: string, remotePath: string) => {
    const session = await getOrCreateSession(connectionId);
    return session.listDirectory(remotePath);
  });

  // Simplified vs. the local path: no partial/range fetch for SFTP/FTP here, so the full file is
  // downloaded to a temp location before truncating the returned bytes to the display policy.
  ipcMain.handle(REMOTE_FILE_CHANNELS.readFile, async (_event, connectionId: string, remotePath: string): Promise<FileContentResult> => {
    const session = await getOrCreateSession(connectionId);
    const tempPath = path.join(tmpdir(), `workdeck-preview-${randomUUID()}`);
    try {
      await session.downloadToLocal(remotePath, tempPath);
      const full = await readFile(tempPath);
      const bytes = full.length > PREVIEW_LARGE_FILE_THRESHOLD_BYTES ? full.subarray(0, PREVIEW_DISPLAY_BYTES) : full;
      return { bytes, totalSize: full.length };
    } finally {
      await rm(tempPath, { force: true });
    }
  });

  ipcMain.handle(REMOTE_FILE_CHANNELS.transfer, async (_event, items: RemoteAwareTransferItem[], mode: 'copy' | 'move') => {
    const localTransfer = (sourcePath: string, destPath: string, transferMode: 'copy' | 'move') =>
      (transferMode === 'copy' ? copyItems : moveItems)([{ sourcePath, destPath }]);
    for (const item of items) {
      await transferRemoteAware(item, mode, sessionProvider, localTransfer);
    }
  });

  return sessionProvider;
}
