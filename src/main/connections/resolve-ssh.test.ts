import { describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ConnectionProfileStore } from './profile-store';
import { SecretStore, type SafeStorageLike } from './secrets';
import { InMemoryHostTrustStore } from './host-trust';
import { createSshConnectResolver } from './resolve-ssh';

function fakeSafeStorage(): SafeStorageLike {
  return {
    isEncryptionAvailable: () => true,
    encryptString: (plain: string) => Buffer.from(`enc:${plain}`, 'utf-8'),
    decryptString: (buf: Buffer) => buf.toString('utf-8').replace(/^enc:/, ''),
  };
}

describe('createSshConnectResolver', () => {
  it('resolves a password-auth profile into connect options with the revealed secret', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'workdeck-resolve-ssh-'));
    const store = new ConnectionProfileStore(path.join(dir, 'connections.json'));
    const secrets = new SecretStore(fakeSafeStorage());
    const trustStore = new InMemoryHostTrustStore();

    const profile = await store.create({
      name: 'dev',
      host: 'dev.example.com',
      username: 'deploy',
      authMethod: 'password',
      protocols: { ssh: true, sftp: true, ftp: false, ftps: false },
    });
    secrets.save(profile.id, 'password', 'super-secret');

    const resolve = createSshConnectResolver(store, secrets, trustStore);
    const resolution = await resolve(profile.id);

    expect(resolution.profileId).toBe(profile.id);
    expect(resolution.options).toMatchObject({ host: 'dev.example.com', port: 22, username: 'deploy', password: 'super-secret' });
    expect(resolution.trustStore).toBe(trustStore);
  });

  it('throws when the connection id does not exist', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'workdeck-resolve-ssh-'));
    const store = new ConnectionProfileStore(path.join(dir, 'connections.json'));
    const resolve = createSshConnectResolver(store, new SecretStore(fakeSafeStorage()), new InMemoryHostTrustStore());

    await expect(resolve('missing')).rejects.toThrow();
  });
});
