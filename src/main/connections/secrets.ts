export type SecretKind = 'password' | 'passphrase' | 'ftpPassword';

export interface SafeStorageLike {
  isEncryptionAvailable(): boolean;
  encryptString(plainText: string): Buffer;
  decryptString(encrypted: Buffer): string;
}

function keyFor(profileId: string, kind: SecretKind): string {
  return `${profileId}:${kind}`;
}

export class SecretStore {
  private readonly encrypted = new Map<string, Buffer>();

  constructor(private readonly safeStorage: SafeStorageLike) {}

  save(profileId: string, kind: SecretKind, value: string): void {
    this.encrypted.set(keyFor(profileId, kind), this.safeStorage.encryptString(value));
  }

  has(profileId: string, kind: SecretKind): boolean {
    return this.encrypted.has(keyFor(profileId, kind));
  }

  /** Decrypts the stored secret. Call only from main-side connection logic — never expose the result over IPC. */
  reveal(profileId: string, kind: SecretKind): string | undefined {
    const buf = this.encrypted.get(keyFor(profileId, kind));
    return buf ? this.safeStorage.decryptString(buf) : undefined;
  }

  delete(profileId: string): void {
    for (const key of this.encrypted.keys()) {
      if (key.startsWith(`${profileId}:`)) this.encrypted.delete(key);
    }
  }
}
