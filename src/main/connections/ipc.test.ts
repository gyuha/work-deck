import { describe, expect, it, vi } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ConnectionProfileStore } from './profile-store';
import { SecretStore, type SafeStorageLike } from './secrets';
import { registerConnectionHandlers } from './ipc';
import { CONNECTION_CHANNELS } from '../../shared/connection-types';

function fakeSafeStorage(): SafeStorageLike {
  return {
    isEncryptionAvailable: () => true,
    encryptString: (plain: string) => Buffer.from(`enc:${plain}`, 'utf-8'),
    decryptString: (buf: Buffer) => buf.toString('utf-8').replace(/^enc:/, ''),
  };
}

async function setup() {
  const dir = await mkdtemp(path.join(tmpdir(), 'workdeck-conn-ipc-'));
  const store = new ConnectionProfileStore(path.join(dir, 'connections.json'));
  const secrets = new SecretStore(fakeSafeStorage());
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const ipcMain = { handle: vi.fn((channel: string, fn: (...a: unknown[]) => unknown) => handlers.set(channel, fn)) };
  registerConnectionHandlers(ipcMain, store, secrets);
  return { handlers, store, secrets };
}

const validInput = {
  name: 'dev-server',
  host: 'dev.example.com',
  username: 'deploy',
  authMethod: 'password' as const,
  protocols: { ssh: true, sftp: true, ftp: false, ftps: false },
};

describe('registerConnectionHandlers', () => {
  it('create + list never expose a stored secret value over the IPC payload', async () => {
    const { handlers, secrets } = await setup();
    const created = (await handlers.get(CONNECTION_CHANNELS.create)!({}, validInput)) as { id: string };
    secrets.save(created.id, 'password', 'super-secret-value');

    const list = await handlers.get(CONNECTION_CHANNELS.list)!({});

    expect(JSON.stringify(list)).not.toContain('super-secret-value');
    expect(JSON.stringify(created)).not.toContain('super-secret-value');
    expect((list as Array<{ hasStoredSecret: { password: boolean } }>)[0].hasStoredSecret.password).toBe(true);
  });

  it('delete removes both the profile and its secrets', async () => {
    const { handlers, store, secrets } = await setup();
    const created = (await handlers.get(CONNECTION_CHANNELS.create)!({}, validInput)) as { id: string };
    secrets.save(created.id, 'password', 'super-secret');

    await handlers.get(CONNECTION_CHANNELS.delete)!({}, created.id);

    expect(await store.list()).toEqual([]);
    expect(secrets.has(created.id, 'password')).toBe(false);
  });
});
