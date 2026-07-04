import { describe, expect, it, afterEach } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { Server, utils as ssh2Utils } from 'ssh2';
import { connectSshShell, UntrustedHostKeyError, HostKeyMismatchError } from './ssh';
import { InMemoryHostTrustStore, fingerprintOfHostKey } from './host-trust';

function makeHostKey() {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });
  return privateKey;
}

async function startTestServer(hostKeyPem: string): Promise<{ server: Server; port: number }> {
  const server = new Server({ hostKeys: [hostKeyPem] });
  server.on('connection', (conn) => {
    conn
      .on('error', () => {
        // A client that rejects our host key aborts the handshake — expected in the negative test cases.
      })
      .on('authentication', (ctx) => {
        if (ctx.method === 'password' && ctx.username === 'testuser' && ctx.password === 'testpass') {
          ctx.accept();
        } else {
          ctx.reject();
        }
      })
      .on('ready', () => {
        conn.on('session', (accept) => {
          const session = accept();
          session.on('pty', (acceptPty: () => void) => acceptPty());
          session.once('shell', (acceptShell: () => NodeJS.WritableStream) => {
            const stream = acceptShell();
            stream.write('welcome\n');
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

describe('connectSshShell — host key verification', () => {
  it('opens a shell channel when authentication succeeds and the host key is pre-trusted', async () => {
    const hostKeyPem = makeHostKey();
    const { server, port } = await startTestServer(hostKeyPem);
    activeServer = server;

    const trustStore = new InMemoryHostTrustStore();
    const parsedKey = ssh2Utils.parseKey(hostKeyPem);
    if (parsedKey instanceof Error) throw parsedKey;
    trustStore.trust('profile-1', fingerprintOfHostKey(parsedKey.getPublicSSH()));

    const { client } = await connectSshShell(
      'profile-1',
      { host: '127.0.0.1', port, username: 'testuser', password: 'testpass' },
      trustStore,
    );
    client.end();
  });

  it('rejects with UntrustedHostKeyError when the host key has never been trusted', async () => {
    const hostKeyPem = makeHostKey();
    const { server, port } = await startTestServer(hostKeyPem);
    activeServer = server;

    const trustStore = new InMemoryHostTrustStore();

    await expect(
      connectSshShell('profile-2', { host: '127.0.0.1', port, username: 'testuser', password: 'testpass' }, trustStore),
    ).rejects.toThrow(UntrustedHostKeyError);
  });

  it('rejects with HostKeyMismatchError when the presented key does not match the trusted fingerprint', async () => {
    const hostKeyPem = makeHostKey();
    const { server, port } = await startTestServer(hostKeyPem);
    activeServer = server;

    const trustStore = new InMemoryHostTrustStore();
    trustStore.trust('profile-3', 'not-the-real-fingerprint');

    await expect(
      connectSshShell('profile-3', { host: '127.0.0.1', port, username: 'testuser', password: 'testpass' }, trustStore),
    ).rejects.toThrow(HostKeyMismatchError);
  });
});
