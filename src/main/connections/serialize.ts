import type { ConnectionProfile } from '../../shared/connection-types';
import type { SecretStore } from './secrets';

export interface RendererConnectionProfile extends ConnectionProfile {
  hasStoredSecret: { password: boolean; passphrase: boolean; ftpPassword: boolean };
}

/** The only view of a profile ever sent to the renderer — never includes revealed secret values. */
export function serializeProfileForRenderer(profile: ConnectionProfile, secrets: SecretStore): RendererConnectionProfile {
  return {
    ...profile,
    hasStoredSecret: {
      password: secrets.has(profile.id, 'password'),
      passphrase: secrets.has(profile.id, 'passphrase'),
      ftpPassword: secrets.has(profile.id, 'ftpPassword'),
    },
  };
}
