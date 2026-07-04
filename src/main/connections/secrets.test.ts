import { describe, expect, it } from 'vitest';
import { SecretStore, type SafeStorageLike } from './secrets';
import { serializeProfileForRenderer } from './serialize';
import type { ConnectionProfile } from '../../shared/connection-types';

function fakeSafeStorage(): SafeStorageLike {
  return {
    isEncryptionAvailable: () => true,
    // Reversible fake "encryption" is enough to prove the roundtrip and the IPC boundary;
    // it is never real security, only a stand-in for Electron's real safeStorage.
    encryptString: (plain: string) => Buffer.from(`enc:${plain}`, 'utf-8'),
    decryptString: (buf: Buffer) => buf.toString('utf-8').replace(/^enc:/, ''),
  };
}

describe('SecretStore', () => {
  it('stores a secret and reports it as present without exposing the value', () => {
    const store = new SecretStore(fakeSafeStorage());
    store.save('profile-1', 'password', 'super-secret');
    expect(store.has('profile-1', 'password')).toBe(true);
    expect(store.has('profile-1', 'passphrase')).toBe(false);
  });

  it('reveals the original value only through the internal reveal() API', () => {
    const store = new SecretStore(fakeSafeStorage());
    store.save('profile-1', 'password', 'super-secret');
    expect(store.reveal('profile-1', 'password')).toBe('super-secret');
  });

  it('deleting a profile removes all of its secrets', () => {
    const store = new SecretStore(fakeSafeStorage());
    store.save('profile-1', 'password', 'a');
    store.save('profile-1', 'passphrase', 'b');
    store.delete('profile-1');
    expect(store.has('profile-1', 'password')).toBe(false);
    expect(store.has('profile-1', 'passphrase')).toBe(false);
  });
});

describe('serializeProfileForRenderer (IPC boundary)', () => {
  const profile: ConnectionProfile = {
    id: 'profile-1',
    name: 'dev',
    host: 'dev.example.com',
    sshPort: 22,
    ftpPort: 21,
    protocols: { ssh: true, sftp: true, ftp: false, ftps: false },
    username: 'deploy',
    authMethod: 'password',
    filenameEncoding: 'auto',
  };

  it('never includes the secret plaintext in the serialized payload sent to the renderer', () => {
    const store = new SecretStore(fakeSafeStorage());
    store.save(profile.id, 'password', 'super-secret');

    const serialized = serializeProfileForRenderer(profile, store);

    expect(JSON.stringify(serialized)).not.toContain('super-secret');
    expect(serialized.hasStoredSecret.password).toBe(true);
    expect(serialized.hasStoredSecret.passphrase).toBe(false);
  });
});
