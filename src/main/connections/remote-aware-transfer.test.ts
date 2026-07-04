import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { transferRemoteAware, type RemoteAwareTransferItem, type RemoteSessionProvider } from './remote-aware-transfer';
import type { RemoteTransport } from './remote-transfer';

// A fake "remote" backed by a real local directory, so downloadToLocal/uploadFromLocal genuinely move bytes —
// this exercises the orchestration/routing logic without needing a live SFTP/FTP protocol round-trip
// (protocol correctness is already covered by remote-transfer.test.ts).
function makeFakeRemote(rootDir: string): RemoteTransport {
  return {
    downloadToLocal: async (remotePath, localPath) => {
      await writeFile(localPath, await readFile(path.join(rootDir, remotePath)));
    },
    uploadFromLocal: async (localPath, remotePath) => {
      await writeFile(path.join(rootDir, remotePath), await readFile(localPath));
    },
    renameRemote: vi.fn(async (oldPath: string, newPath: string) => {
      await writeFile(path.join(rootDir, newPath), await readFile(path.join(rootDir, oldPath)));
    }),
    deleteRemote: vi.fn(async (remotePath: string) => {
      const { unlink } = await import('node:fs/promises');
      await unlink(path.join(rootDir, remotePath));
    }),
  };
}

async function setup() {
  const localDir = await mkdtemp(path.join(tmpdir(), 'workdeck-local-'));
  const remoteADir = await mkdtemp(path.join(tmpdir(), 'workdeck-remoteA-'));
  const remoteBDir = await mkdtemp(path.join(tmpdir(), 'workdeck-remoteB-'));
  const remoteA = makeFakeRemote(remoteADir);
  const remoteB = makeFakeRemote(remoteBDir);
  const sessions: RemoteSessionProvider = {
    getTransport: vi.fn(async (connectionId: string) => (connectionId === 'conn-a' ? remoteA : remoteB)),
  };
  return { localDir, remoteADir, remoteBDir, remoteA, remoteB, sessions };
}

describe('transferRemoteAware', () => {
  it('local -> local delegates to the plain local transfer function', async () => {
    const { localDir, sessions } = await setup();
    await writeFile(path.join(localDir, 'a.txt'), 'local-content');
    const localTransfer = vi.fn().mockResolvedValue(undefined);

    const item: RemoteAwareTransferItem = {
      source: { path: path.join(localDir, 'a.txt') },
      dest: { path: path.join(localDir, 'copy.txt') },
    };
    await transferRemoteAware(item, 'copy', sessions, localTransfer);

    expect(localTransfer).toHaveBeenCalledWith(item.source.path, item.dest.path, 'copy');
    expect(sessions.getTransport).not.toHaveBeenCalled();
  });

  it('local -> remote uploads, and deletes the local original on move', async () => {
    const { localDir, remoteADir, sessions } = await setup();
    const sourcePath = path.join(localDir, 'up.txt');
    await writeFile(sourcePath, 'to-upload');

    await transferRemoteAware(
      { source: { path: sourcePath }, dest: { path: 'up.txt', connectionId: 'conn-a' } },
      'move',
      sessions,
      vi.fn(),
    );

    expect((await readFile(path.join(remoteADir, 'up.txt'))).toString()).toBe('to-upload');
    expect(existsSync(sourcePath)).toBe(false);
  });

  it('remote -> local downloads, and deletes the remote original on move', async () => {
    const { localDir, remoteADir, remoteA, sessions } = await setup();
    await writeFile(path.join(remoteADir, 'down.txt'), 'to-download');
    const destPath = path.join(localDir, 'down.txt');

    await transferRemoteAware({ source: { path: 'down.txt', connectionId: 'conn-a' }, dest: { path: destPath } }, 'move', sessions, vi.fn());

    expect((await readFile(destPath)).toString()).toBe('to-download');
    expect(remoteA.deleteRemote).toHaveBeenCalledWith('down.txt');
  });

  it('remote -> remote (same connection) renames server-side on move', async () => {
    const { remoteADir, remoteA, sessions } = await setup();
    await writeFile(path.join(remoteADir, 'old.txt'), 'same-conn');

    await transferRemoteAware(
      { source: { path: 'old.txt', connectionId: 'conn-a' }, dest: { path: 'new.txt', connectionId: 'conn-a' } },
      'move',
      sessions,
      vi.fn(),
    );

    expect(remoteA.renameRemote).toHaveBeenCalledWith('old.txt', 'new.txt');
  });

  it('remote -> remote (same connection, copy) relays through a local temp file', async () => {
    const { remoteADir, sessions } = await setup();
    await writeFile(path.join(remoteADir, 'src.txt'), 'relay-me');

    await transferRemoteAware(
      { source: { path: 'src.txt', connectionId: 'conn-a' }, dest: { path: 'dst.txt', connectionId: 'conn-a' } },
      'copy',
      sessions,
      vi.fn(),
    );

    expect((await readFile(path.join(remoteADir, 'dst.txt'))).toString()).toBe('relay-me');
    expect(existsSync(path.join(remoteADir, 'src.txt'))).toBe(true); // copy keeps the source
  });

  it('remote -> remote (different connections) relays and deletes the source on move', async () => {
    const { remoteADir, remoteBDir, remoteA, sessions } = await setup();
    await writeFile(path.join(remoteADir, 'cross.txt'), 'cross-conn');

    await transferRemoteAware(
      { source: { path: 'cross.txt', connectionId: 'conn-a' }, dest: { path: 'cross.txt', connectionId: 'conn-b' } },
      'move',
      sessions,
      vi.fn(),
    );

    expect((await readFile(path.join(remoteBDir, 'cross.txt'))).toString()).toBe('cross-conn');
    expect(remoteA.deleteRemote).toHaveBeenCalledWith('cross.txt');
  });
});
