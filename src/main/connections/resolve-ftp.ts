import type { ConnectionProfileStore } from './profile-store';
import type { SecretStore } from './secrets';
import type { FtpConnectOptions } from './ftp';

export function createFtpConnectResolver(
  store: ConnectionProfileStore,
  secrets: SecretStore,
): (connectionId: string) => Promise<FtpConnectOptions> {
  return async (connectionId: string): Promise<FtpConnectOptions> => {
    const profile = (await store.list()).find((p) => p.id === connectionId);
    if (!profile) throw new Error(`connection profile not found: ${connectionId}`);

    const user = profile.ftpUsername ?? profile.username;
    const password = secrets.reveal(profile.id, 'ftpPassword') ?? secrets.reveal(profile.id, 'password') ?? '';

    return {
      host: profile.host,
      port: profile.ftpPort,
      user,
      password,
      secure: profile.protocols.ftps,
    };
  };
}
