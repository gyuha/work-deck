import { describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ConnectionProfileStore, ValidationError } from './profile-store';

async function makeStore(): Promise<ConnectionProfileStore> {
  const dir = await mkdtemp(path.join(tmpdir(), 'workdeck-conn-'));
  return new ConnectionProfileStore(path.join(dir, 'connections.json'));
}

const validInput = {
  name: 'dev-server',
  host: 'dev.example.com',
  username: 'deploy',
  authMethod: 'password' as const,
  protocols: { ssh: true, sftp: true, ftp: false, ftps: false },
};

describe('ConnectionProfileStore CRUD', () => {
  it('creates a profile with defaults filled in and an assigned id', async () => {
    const store = await makeStore();
    const profile = await store.create(validInput);
    expect(profile.id).toBeTruthy();
    expect(profile.sshPort).toBe(22);
    expect(profile.ftpPort).toBe(21);
    expect(profile.filenameEncoding).toBe('auto');
  });

  it('lists created profiles', async () => {
    const store = await makeStore();
    await store.create(validInput);
    await store.create({ ...validInput, name: 'staging' });
    const all = await store.list();
    expect(all.map((p) => p.name).sort()).toEqual(['dev-server', 'staging']);
  });

  it('updates a profile by id', async () => {
    const store = await makeStore();
    const created = await store.create(validInput);
    const updated = await store.update(created.id, { host: 'new-host.example.com' });
    expect(updated.host).toBe('new-host.example.com');
    expect((await store.list())[0].host).toBe('new-host.example.com');
  });

  it('deletes a profile by id', async () => {
    const store = await makeStore();
    const created = await store.create(validInput);
    await store.delete(created.id);
    expect(await store.list()).toEqual([]);
  });

  it('persists across store instances backed by the same file (survives a restart)', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'workdeck-conn-'));
    const filePath = path.join(dir, 'connections.json');
    const store1 = new ConnectionProfileStore(filePath);
    await store1.create(validInput);

    const store2 = new ConnectionProfileStore(filePath);
    expect((await store2.list()).map((p) => p.name)).toEqual(['dev-server']);
  });

  it('rejects a profile with no protocol enabled', async () => {
    const store = await makeStore();
    await expect(
      store.create({ ...validInput, protocols: { ssh: false, sftp: false, ftp: false, ftps: false } }),
    ).rejects.toThrow(ValidationError);
  });

  it('rejects authMethod=privateKey without a privateKeyPath', async () => {
    const store = await makeStore();
    await expect(store.create({ ...validInput, authMethod: 'privateKey' })).rejects.toThrow(ValidationError);
  });
});
