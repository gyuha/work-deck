import { describe, expect, it, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- ftp-srv ships no ESM/TS types
const FtpSrv = require('ftp-srv');
import { connectFtp, listRemoteDirectoryFtp } from './ftp';

async function startFtpTestServer() {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'workdeck-ftproot-'));
  await mkdir(path.join(rootDir, 'a-folder'));
  await writeFile(path.join(rootDir, 'b.txt'), 'hello ftp');

  const server = new FtpSrv({ url: 'ftp://127.0.0.1:0', pasv_url: '127.0.0.1' });
  server.on('login', ({ username, password }: { username: string; password: string }, resolve: (r: { root: string }) => void, reject: (e: Error) => void) => {
    if (username === 'testuser' && password === 'testpass') resolve({ root: rootDir });
    else reject(new Error('bad credentials'));
  });
  await server.listen();
  const port = server.server.address().port as number;
  return { server, port };
}

let activeServer: { close: () => Promise<void> } | undefined;

afterEach(async () => {
  if (activeServer) {
    // ftp-srv auto-closes once its last connection disconnects, so a second close() here
    // (defence-in-depth for tests that don't reach that point) can be a harmless no-op.
    await activeServer.close().catch(() => {});
    activeServer = undefined;
  }
});

describe('connectFtp + listRemoteDirectoryFtp', () => {
  it('lists a remote directory over FTP after successful login', async () => {
    const { server, port } = await startFtpTestServer();
    activeServer = { close: () => server.close() };

    const client = await connectFtp({ host: '127.0.0.1', port, user: 'testuser', password: 'testpass' });
    const entries = await listRemoteDirectoryFtp(client, '/');
    client.close();

    expect(entries.sort((a, b) => a.name.localeCompare(b.name))).toEqual([
      { name: 'a-folder', type: 'directory', size: expect.any(Number) },
      { name: 'b.txt', type: 'file', size: 9 },
    ]);
  });
});
