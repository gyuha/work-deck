import { describe, expect, it, vi, afterEach } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { Server, utils as ssh2Utils } from 'ssh2';
import { registerTerminalHandlers, TERMINAL_CHANNELS } from './terminal-ipc';
import { InMemoryHostTrustStore, fingerprintOfHostKey } from '../connections/host-trust';

function setup(deps: Parameters<typeof registerTerminalHandlers>[2]) {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const ipcMain = { handle: vi.fn((channel: string, fn: (...a: unknown[]) => unknown) => handlers.set(channel, fn)) };
  const sent: Array<{ channel: string; payload: unknown }> = [];
  const webContents = { send: vi.fn((channel: string, payload: unknown) => sent.push({ channel, payload })) };
  registerTerminalHandlers(ipcMain, webContents, deps);
  return { handlers, sent };
}

describe('registerTerminalHandlers — local session', () => {
  it('creates a local session, forwards its output as data events, and stops on kill', async () => {
    const { handlers, sent } = setup({ resolveSshConnectOptions: vi.fn() });

    const id = (await handlers.get(TERMINAL_CHANNELS.createLocal)!({}, { cwd: process.cwd(), shell: '/bin/cat' })) as string;
    expect(typeof id).toBe('string');

    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (sent.some((s) => s.channel === TERMINAL_CHANNELS.data)) {
          clearInterval(check);
          resolve();
        }
      }, 20);
      handlers.get(TERMINAL_CHANNELS.write)!({}, id, 'ping\n');
    });

    const dataEvent = sent.find((s) => s.channel === TERMINAL_CHANNELS.data);
    expect((dataEvent!.payload as { id: string }).id).toBe(id);

    await handlers.get(TERMINAL_CHANNELS.kill)!({}, id);
  });
});

function makeHostKey() {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });
  return privateKey;
}

async function startShellServer(hostKeyPem: string, allowAuth: () => boolean, options: { autoDropAfterMs?: number } = {}) {
  const server = new Server({ hostKeys: [hostKeyPem] });
  server.on('connection', (conn) => {
    conn
      .on('error', () => {})
      .on('authentication', (ctx) => (allowAuth() ? ctx.accept() : ctx.reject()))
      .on('ready', () => {
        conn.on('session', (accept) => {
          const session = accept();
          session.on('pty', (acceptPty: () => void) => acceptPty());
          session.once('shell', (acceptShell: () => import('ssh2').ServerChannel) => {
            const stream = acceptShell();
            stream.write('welcome\n');
          });
        });
        // Simulate an unexpected network drop shortly after the session becomes active,
        // so each connection cleans itself up without the test needing to reach inside ssh2 internals.
        if (options.autoDropAfterMs) setTimeout(() => conn.end(), options.autoDropAfterMs);
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

describe('registerTerminalHandlers — SSH session + reconnect', () => {
  it('creates an SSH session against a trusted host and streams its output', async () => {
    const hostKeyPem = makeHostKey();
    const { server, port } = await startShellServer(hostKeyPem, () => true);
    activeServer = server;

    const trustStore = new InMemoryHostTrustStore();
    const parsedKey = ssh2Utils.parseKey(hostKeyPem);
    if (parsedKey instanceof Error) throw parsedKey;
    trustStore.trust('profile-1', fingerprintOfHostKey(parsedKey.getPublicSSH()));

    const resolveSshConnectOptions = vi.fn().mockResolvedValue({
      profileId: 'profile-1',
      trustStore,
      options: { host: '127.0.0.1', port, username: 'testuser', password: 'testpass' },
    });
    const { handlers, sent } = setup({ resolveSshConnectOptions });

    const id = (await handlers.get(TERMINAL_CHANNELS.createSsh)!({}, { connectionId: 'conn-1' })) as string;

    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (sent.some((s) => s.channel === TERMINAL_CHANNELS.data)) {
          clearInterval(check);
          resolve();
        }
      }, 20);
    });

    expect(resolveSshConnectOptions).toHaveBeenCalledWith('conn-1');
    await handlers.get(TERMINAL_CHANNELS.kill)!({}, id);
  });

  it('reconnects a disconnected SSH session, reusing the same session id', async () => {
    const hostKeyPem = makeHostKey();
    // Each connection auto-drops shortly after becoming active, simulating the real disconnect
    // this test exercises: the first connection dies on its own before reconnect is triggered.
    const { server, port } = await startShellServer(hostKeyPem, () => true, { autoDropAfterMs: 150 });
    activeServer = server;

    const trustStore = new InMemoryHostTrustStore();
    const parsedKey = ssh2Utils.parseKey(hostKeyPem);
    if (parsedKey instanceof Error) throw parsedKey;
    trustStore.trust('profile-1', fingerprintOfHostKey(parsedKey.getPublicSSH()));

    const resolveSshConnectOptions = vi.fn().mockResolvedValue({
      profileId: 'profile-1',
      trustStore,
      options: { host: '127.0.0.1', port, username: 'testuser', password: 'testpass' },
    });
    const { handlers, sent } = setup({ resolveSshConnectOptions });

    const id = (await handlers.get(TERMINAL_CHANNELS.createSsh)!({}, { connectionId: 'conn-1' })) as string;

    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        const hasDisconnected = sent.some(
          (s) => s.channel === TERMINAL_CHANNELS.statusChanged && (s.payload as { status: string }).status === 'disconnected',
        );
        if (hasDisconnected) {
          clearInterval(check);
          resolve();
        }
      }, 20);
    });

    await handlers.get(TERMINAL_CHANNELS.reconnect)!({}, id);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const statusEvents = sent.filter((s) => s.channel === TERMINAL_CHANNELS.statusChanged);
    expect(statusEvents.some((s) => (s.payload as { id: string; status: string }).id === id && (s.payload as { status: string }).status === 'active')).toBe(true);
    expect(resolveSshConnectOptions).toHaveBeenCalledTimes(2);

    await handlers.get(TERMINAL_CHANNELS.kill)!({}, id);
  });
});
