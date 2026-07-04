import { describe, expect, it, afterEach } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { Server, utils as ssh2Utils } from 'ssh2';
import { connectSftp, listRemoteDirectorySftp } from './sftp';
import { InMemoryHostTrustStore, fingerprintOfHostKey } from './host-trust';

const { STATUS_CODE } = ssh2Utils.sftp;

function makeHostKey() {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });
  return privateKey;
}

interface FakeEntry {
  name: string;
  mode: number;
  size: number;
}

const FIXTURE_ENTRIES: FakeEntry[] = [
  { name: 'a-folder', mode: 0o040755, size: 0 },
  { name: 'b.txt', mode: 0o100644, size: 42 },
];

async function startSftpTestServer(hostKeyPem: string) {
  const server = new Server({ hostKeys: [hostKeyPem] });
  server.on('connection', (conn) => {
    conn
      .on('error', () => {})
      .on('authentication', (ctx) => {
        if (ctx.method === 'password' && ctx.username === 'testuser' && ctx.password === 'testpass') ctx.accept();
        else ctx.reject();
      })
      .on('ready', () => {
        conn.on('session', (accept) => {
          const session = accept();
          session.on('sftp', (acceptSftp: () => import('ssh2').SFTPWrapper) => {
            const sftp = acceptSftp();
            const dirHandles = new Map<number, { sent: boolean }>();
            let nextHandle = 0;

            sftp.on('OPENDIR', (reqid: number) => {
              const id = nextHandle++;
              dirHandles.set(id, { sent: false });
              const handle = Buffer.alloc(4);
              handle.writeUInt32BE(id, 0);
              sftp.handle(reqid, handle);
            });

            sftp.on('READDIR', (reqid: number, handle: Buffer) => {
              const id = handle.readUInt32BE(0);
              const entry = dirHandles.get(id);
              if (!entry || entry.sent) {
                sftp.status(reqid, STATUS_CODE.EOF);
                return;
              }
              entry.sent = true;
              sftp.name(
                reqid,
                FIXTURE_ENTRIES.map((e) => ({
                  filename: e.name,
                  longname: e.name,
                  attrs: { mode: e.mode, size: e.size, uid: 0, gid: 0, atime: 0, mtime: 0 },
                })),
              );
            });

            sftp.on('CLOSE', (reqid: number) => {
              sftp.status(reqid, STATUS_CODE.OK);
            });
          });
        });
      });
  });
  server.on('error', () => {});
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  return { server, port };
}

let activeServer: Server | undefined;

afterEach(async () => {
  if (activeServer) {
    await new Promise<void>((resolve) => activeServer!.close(() => resolve()));
    activeServer = undefined;
  }
});

describe('connectSftp + listRemoteDirectorySftp', () => {
  it('lists a remote directory over SFTP once the host key is trusted', async () => {
    const hostKeyPem = makeHostKey();
    const { server, port } = await startSftpTestServer(hostKeyPem);
    activeServer = server;

    const trustStore = new InMemoryHostTrustStore();
    const parsedKey = ssh2Utils.parseKey(hostKeyPem);
    if (parsedKey instanceof Error) throw parsedKey;
    trustStore.trust('profile-sftp', fingerprintOfHostKey(parsedKey.getPublicSSH()));

    const { client, sftp } = await connectSftp(
      'profile-sftp',
      { host: '127.0.0.1', port, username: 'testuser', password: 'testpass' },
      trustStore,
    );

    const entries = await listRemoteDirectorySftp(sftp, '/');
    client.end();

    expect(entries).toEqual([
      { name: 'a-folder', type: 'directory', size: 0 },
      { name: 'b.txt', type: 'file', size: 42 },
    ]);
  });
});
