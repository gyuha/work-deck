import { createHash } from 'node:crypto';

export interface HostTrustStore {
  getTrustedFingerprint(profileId: string): string | undefined;
  trust(profileId: string, fingerprint: string): void;
}

export class InMemoryHostTrustStore implements HostTrustStore {
  private readonly trusted = new Map<string, string>();

  getTrustedFingerprint(profileId: string): string | undefined {
    return this.trusted.get(profileId);
  }

  trust(profileId: string, fingerprint: string): void {
    this.trusted.set(profileId, fingerprint);
  }
}

export function fingerprintOfHostKey(key: Buffer): string {
  return createHash('sha256').update(key).digest('base64');
}
