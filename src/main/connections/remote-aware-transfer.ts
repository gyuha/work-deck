import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { RemoteTransport } from './remote-transfer';

export interface TransferEndpoint {
  path: string;
  connectionId?: string;
}

export interface RemoteAwareTransferItem {
  source: TransferEndpoint;
  dest: TransferEndpoint;
}

export interface RemoteSessionProvider {
  getTransport(connectionId: string): Promise<RemoteTransport>;
}

export type LocalTransferFn = (sourcePath: string, destPath: string, mode: 'copy' | 'move') => Promise<void>;

/**
 * Routes one transfer item to the right path per docs/features/file-manager.md 3장:
 * local<->local stays with the existing local transfer function; any endpoint carrying a
 * connectionId goes through that connection's RemoteTransport, relaying through a local temp
 * file when both endpoints are remote (no server-side copy command exists for SFTP/FTP) except
 * a same-connection move, which is a server-side rename.
 */
export async function transferRemoteAware(
  item: RemoteAwareTransferItem,
  mode: 'copy' | 'move',
  sessions: RemoteSessionProvider,
  localTransfer: LocalTransferFn,
): Promise<void> {
  const { source, dest } = item;

  if (!source.connectionId && !dest.connectionId) {
    await localTransfer(source.path, dest.path, mode);
    return;
  }

  if (source.connectionId && !dest.connectionId) {
    const transport = await sessions.getTransport(source.connectionId);
    await transport.downloadToLocal(source.path, dest.path);
    if (mode === 'move') await transport.deleteRemote(source.path);
    return;
  }

  if (!source.connectionId && dest.connectionId) {
    const transport = await sessions.getTransport(dest.connectionId);
    await transport.uploadFromLocal(source.path, dest.path);
    if (mode === 'move') await rm(source.path);
    return;
  }

  // Both remote from here on.
  if (mode === 'move' && source.connectionId === dest.connectionId) {
    const transport = await sessions.getTransport(source.connectionId!);
    await transport.renameRemote(source.path, dest.path);
    return;
  }

  const sourceTransport = await sessions.getTransport(source.connectionId!);
  const destTransport = await sessions.getTransport(dest.connectionId!);
  const tempPath = path.join(tmpdir(), `workdeck-relay-${randomUUID()}`);
  await sourceTransport.downloadToLocal(source.path, tempPath);
  await destTransport.uploadFromLocal(tempPath, dest.path);
  await rm(tempPath);
  if (mode === 'move') await sourceTransport.deleteRemote(source.path);
}
