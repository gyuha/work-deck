import { Client, type ClientChannel } from 'ssh2';
import { fingerprintOfHostKey, type HostTrustStore } from './host-trust';

export class UntrustedHostKeyError extends Error {
  constructor(public readonly fingerprint: string) {
    super('untrusted host key — explicit trust required before connecting');
  }
}

export class HostKeyMismatchError extends Error {
  constructor(public readonly fingerprint: string) {
    super('host key mismatch — possible MITM');
  }
}

export interface SshConnectOptions {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string | Buffer;
  passphrase?: string;
}

export function connectSshShell(
  profileId: string,
  options: SshConnectOptions,
  trustStore: HostTrustStore,
): Promise<{ client: Client; shell: ClientChannel }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const client = new Client();

    client.on('ready', () => {
      client.shell((err, stream) => {
        if (err) {
          settled = true;
          reject(err);
          return;
        }
        settled = true;
        resolve({ client, shell: stream });
      });
    });

    client.on('error', (err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });

    client.connect({
      host: options.host,
      port: options.port,
      username: options.username,
      password: options.password,
      privateKey: options.privateKey,
      passphrase: options.passphrase,
      hostVerifier: (key: Buffer) => {
        const fingerprint = fingerprintOfHostKey(key);
        const trusted = trustStore.getTrustedFingerprint(profileId);
        if (!trusted) {
          settled = true;
          reject(new UntrustedHostKeyError(fingerprint));
          return false;
        }
        if (trusted !== fingerprint) {
          settled = true;
          reject(new HostKeyMismatchError(fingerprint));
          return false;
        }
        return true;
      },
    });
  });
}
