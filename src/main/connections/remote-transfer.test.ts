import { describe, expect, it, vi, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { existsSync } from 'node:fs';
import type { SFTPWrapper } from 'ssh2';
import { createSftpTransport, createFtpTransport } from './remote-transfer';
import { connectFtp } from './ftp';

describe('createSftpTransport', () => {
  it('delegates download/upload/rename/delete to the underlying SFTPWrapper', async () => {
    const sftp = {
      fastGet: vi.fn((remotePath, localPath, cb) => cb()),
      fastPut: vi.fn((localPath, remotePath, cb) => cb()),
      rename: vi.fn((oldPath, newPath, cb) => cb()),
      unlink: vi.fn((remotePath, cb) => cb()),
    } as unknown as SFTPWrapper;
    const transport = createSftpTransport(sftp);

    await transport.downloadToLocal('/remote/a.txt', '/local/a.txt');
    await transport.uploadFromLocal('/local/b.txt', '/remote/b.txt');
    await transport.renameRemote('/remote/old.txt', '/remote/new.txt');
    await transport.deleteRemote('/remote/gone.txt');

    expect(sftp.fastGet).toHaveBeenCalledWith('/remote/a.txt', '/local/a.txt', expect.any(Function));
    expect(sftp.fastPut).toHaveBeenCalledWith('/local/b.txt', '/remote/b.txt', expect.any(Function));
    expect(sftp.rename).toHaveBeenCalledWith('/remote/old.txt', '/remote/new.txt', expect.any(Function));
    expect(sftp.unlink).toHaveBeenCalledWith('/remote/gone.txt', expect.any(Function));
  });

  it('rejects when the underlying operation reports an error', async () => {
    const sftp = {
      fastGet: vi.fn((remotePath, localPath, cb) => cb(new Error('boom'))),
    } as unknown as SFTPWrapper;
    await expect(createSftpTransport(sftp).downloadToLocal('/a', '/b')).rejects.toThrow('boom');
  });
});

let activeServer: { close: () => Promise<void> } | undefined;

afterEach(async () => {
  if (activeServer) {
    await activeServer.close().catch(() => {});
    activeServer = undefined;
  }
});

describe('createFtpTransport', () => {
  it('uploads, downloads, and renames real files against a local FTP server', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- ftp-srv ships no ESM/TS types
    const FtpSrv = require('ftp-srv');
    const rootDir = await mkdtemp(path.join(tmpdir(), 'workdeck-ftproot-'));
    const localDir = await mkdtemp(path.join(tmpdir(), 'workdeck-local-'));
    await writeFile(path.join(localDir, 'up.txt'), 'uploaded-content');

    const server = new FtpSrv({ url: 'ftp://127.0.0.1:0', pasv_url: '127.0.0.1' });
    server.on('login', (data: { username: string; password: string }, resolve: (r: { root: string }) => void) =>
      resolve({ root: rootDir }),
    );
    await server.listen();
    activeServer = { close: () => server.close() };
    const port = server.server.address().port as number;

    const client = await connectFtp({ host: '127.0.0.1', port, user: 'anyone', password: 'anyone' });
    const transport = createFtpTransport(client);

    await transport.uploadFromLocal(path.join(localDir, 'up.txt'), '/uploaded.txt');
    expect((await readFile(path.join(rootDir, 'uploaded.txt'))).toString()).toBe('uploaded-content');

    await transport.downloadToLocal('/uploaded.txt', path.join(localDir, 'down.txt'));
    expect((await readFile(path.join(localDir, 'down.txt'))).toString()).toBe('uploaded-content');

    await transport.renameRemote('/uploaded.txt', '/renamed.txt');
    expect(existsSync(path.join(rootDir, 'renamed.txt'))).toBe(true);
    expect(existsSync(path.join(rootDir, 'uploaded.txt'))).toBe(false);

    await transport.deleteRemote('/renamed.txt');
    expect(existsSync(path.join(rootDir, 'renamed.txt'))).toBe(false);

    client.close();
  });
});
