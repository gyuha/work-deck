import { describe, expect, it, afterEach } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { Server, Client, type ClientChannel } from 'ssh2';
import { createSshSession } from './ssh-session';

function makeHostKey() {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });
  return privateKey;
}

async function startShellServer(hostKeyPem: string) {
  const server = new Server({ hostKeys: [hostKeyPem] });
  server.on('connection', (conn) => {
    conn
      .on('error', () => {})
      .on('authentication', (ctx) => {
        if (ctx.method === 'password') ctx.accept();
        else ctx.reject();
      })
      .on('ready', () => {
        conn.on('session', (accept) => {
          const session = accept();
          session.on('pty', (acceptPty: () => void) => acceptPty());
          session.once('shell', (acceptShell: () => import('ssh2').ServerChannel) => {
            const stream = acceptShell();
            stream.on('data', (data: Buffer) => {
              if (data.toString().includes('exit-now')) {
                stream.exit(0);
                stream.end();
                return;
              }
              stream.write(`echo:${data}`);
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

function connectShellClient(port: number): Promise<{ client: Client; shell: ClientChannel }> {
  return new Promise((resolve, reject) => {
    const client = new Client();
    client.on('ready', () => {
      client.shell((err, stream) => (err ? reject(err) : resolve({ client, shell: stream })));
    });
    client.on('error', reject);
    client.connect({ host: '127.0.0.1', port, username: 'testuser', password: 'testpass', hostVerifier: () => true });
  });
}

let activeServer: Server | undefined;

afterEach(async () => {
  if (activeServer) {
    await new Promise<void>((resolve) => activeServer!.close(() => resolve()));
    activeServer = undefined;
  }
});

describe('createSshSession', () => {
  it('carries shell input/output through the unified session interface', async () => {
    const { server, port } = await startShellServer(makeHostKey());
    activeServer = server;
    const { client, shell } = await connectShellClient(port);

    const session = createSshSession(client, shell);
    expect(session.status).toBe('active');

    const received = await new Promise<string>((resolve) => {
      session.onData((chunk) => {
        if (chunk.includes('echo:')) resolve(chunk);
      });
      session.write('ping');
    });

    expect(received).toContain('echo:ping');
    client.end();
  });

  it('transitions to exited when the remote shell process exits cleanly', async () => {
    const { server, port } = await startShellServer(makeHostKey());
    activeServer = server;
    const { client, shell } = await connectShellClient(port);
    const session = createSshSession(client, shell);

    const exited = new Promise<void>((resolve) => session.onExit(() => resolve()));
    session.write('exit-now');
    await exited;

    expect(session.status).toBe('exited');
    client.end();
  });

  it('transitions to disconnected when the underlying connection drops unexpectedly', async () => {
    const { server, port } = await startShellServer(makeHostKey());
    activeServer = server;
    const { client, shell } = await connectShellClient(port);
    const session = createSshSession(client, shell);

    const disconnected = new Promise<void>((resolve) => session.onDisconnect(() => resolve()));
    // Ending the connection without the server ever sending an exit-status is what an
    // unexpected drop looks like from the channel's point of view (no clean shell exit).
    client.end();
    await disconnected;

    expect(session.status).toBe('disconnected');
  });
});
