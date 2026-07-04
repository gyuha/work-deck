import { readFile } from 'node:fs/promises';
import type { HostTrustStore } from './host-trust';
import type { SshConnectResolution } from '../terminal/terminal-ipc';
import type { ConnectionProfileStore } from './profile-store';
import type { SecretStore } from './secrets';

export function createSshConnectResolver(
  store: ConnectionProfileStore,
  secrets: SecretStore,
  trustStore: HostTrustStore,
): (connectionId: string) => Promise<SshConnectResolution> {
  return async (connectionId: string): Promise<SshConnectResolution> => {
    const profile = (await store.list()).find((p) => p.id === connectionId);
    if (!profile) throw new Error(`connection profile not found: ${connectionId}`);

    const usePassword = profile.authMethod === 'password';
    const privateKey =
      !usePassword && profile.privateKeyPath ? await readFile(profile.privateKeyPath, 'utf-8') : undefined;

    return {
      profileId: profile.id,
      trustStore,
      options: {
        host: profile.host,
        port: profile.sshPort,
        username: profile.username,
        password: usePassword ? secrets.reveal(profile.id, 'password') : undefined,
        privateKey,
        passphrase: !usePassword ? secrets.reveal(profile.id, 'passphrase') : undefined,
      },
    };
  };
}
