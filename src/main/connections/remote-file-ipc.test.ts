import { describe, expect, it, vi, afterEach } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { Server, utils as ssh2Utils } from 'ssh2';
import { registerRemoteFileHandlers } from './remote-file-ipc';
import { InMemoryHostTrustStore, fingerprintOfHostKey } from './host-trust';
import { REMOTE_FILE_CHANNELS } from '../../shared/remote-file-types';
import type { ConnectionProfile } from '../../shared/connection-types';

const { STATUS_CODE } = ssh2Utils.sftp;

function makeHostKey() {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });
  return privateKey;
}

async function startSftpTestServer(hostKeyPem: string) {
  const server = new Server({ hostKeys: [hostKeyPem] });
  let sessionOpenCount = 0;
  const openConnections = new Set<import('ssh2').Connection>();
  server.on('connection', (conn) => {
    sessionOpenCount++;
    openConnections.add(conn);
    conn
      .on('close', () => openConnections.delete(conn))
      .on('error', () => {})
      .on('authentication', (ctx) => (ctx.method === 'password' ? ctx.accept() : ctx.reject()))
      .on('ready', () => {
        conn.on('session', (accept) => {
          const session = accept();
          session.on('sftp', (acceptSftp: () => import('ssh2').SFTPWrapper) => {
            const sftp = acceptSftp();
            let sent = false;
            sftp.on('OPENDIR', (reqid: number) => {
              const handle = Buffer.alloc(4);
              sftp.handle(reqid, handle);
            });
            sftp.on('READDIR', (reqid: number) => {
              if (sent) return sftp.status(reqid, STATUS_CODE.EOF);
              sent = true;
              sftp.name(reqid, [
                { filename: 'remote.txt', longname: 'remote.txt', attrs: { mode: 0o100644, size: 7, uid: 0, gid: 0, atime: 0, mtime: 0 } },
              ]);
            });
            sftp.on('CLOSE', (reqid: number) => sftp.status(reqid, STATUS_CODE.OK));
          });
        });
      });
  });
  server.on('error', () => {});
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  return { server, port, getSessionOpenCount: () => sessionOpenCount, openConnections };
}

let activeServer: Server | undefined;
let activeConnections: Set<import('ssh2').Connection> | undefined;

afterEach(async () => {
  if (activeServer) {
    for (const conn of activeConnections ?? []) conn.end();
    await new Promise<void>((resolve) => activeServer!.close(() => resolve()));
    activeServer = undefined;
    activeConnections = undefined;
  }
});

describe('registerRemoteFileHandlers', () => {
  it('lists a remote directory over SFTP and reuses the same session on a second call', async () => {
    const hostKeyPem = makeHostKey();
    const { server, port, getSessionOpenCount, openConnections } = await startSftpTestServer(hostKeyPem);
    activeServer = server;
    activeConnections = openConnections;

    const trustStore = new InMemoryHostTrustStore();
    const parsedKey = ssh2Utils.parseKey(hostKeyPem);
    if (parsedKey instanceof Error) throw parsedKey;
    trustStore.trust('conn-1', fingerprintOfHostKey(parsedKey.getPublicSSH()));

    const profile: ConnectionProfile = {
      id: 'conn-1',
      name: 'dev',
      host: '127.0.0.1',
      sshPort: port,
      ftpPort: 21,
      protocols: { ssh: true, sftp: true, ftp: false, ftps: false },
      username: 'testuser',
      authMethod: 'password',
      filenameEncoding: 'auto',
    };

    const handlers = new Map<string, (...args: unknown[]) => unknown>();
    const ipcMain = { handle: vi.fn((channel: string, fn: (...a: unknown[]) => unknown) => handlers.set(channel, fn)) };

    registerRemoteFileHandlers(ipcMain, {
      store: { list: vi.fn().mockResolvedValue([profile]) } as never,
      resolveSshConnectOptions: vi.fn().mockResolvedValue({
        profileId: 'conn-1',
        trustStore,
        options: { host: '127.0.0.1', port, username: 'testuser', password: 'testpass' },
      }),
      resolveFtpConnectOptions: vi.fn(),
    });

    const entries = await handlers.get(REMOTE_FILE_CHANNELS.listDirectory)!({}, 'conn-1', '/');
    await handlers.get(REMOTE_FILE_CHANNELS.listDirectory)!({}, 'conn-1', '/');

    expect(entries).toEqual([{ name: 'remote.txt', type: 'file', size: 7 }]);
    expect(getSessionOpenCount()).toBe(1); // second list call reused the cached session, no new connection
  });
});
