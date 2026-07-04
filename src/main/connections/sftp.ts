import { Client, type SFTPWrapper } from 'ssh2';
import { fingerprintOfHostKey, type HostTrustStore } from './host-trust';
import { UntrustedHostKeyError, HostKeyMismatchError, type SshConnectOptions } from './ssh';

export interface RemoteDirEntry {
  name: string;
  type: 'file' | 'directory' | 'symlink';
  size: number;
}

export function connectSftp(
  profileId: string,
  options: SshConnectOptions,
  trustStore: HostTrustStore,
): Promise<{ client: Client; sftp: SFTPWrapper }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const client = new Client();

    client.on('ready', () => {
      client.sftp((err, sftp) => {
        if (err) {
          settled = true;
          reject(err);
          return;
        }
        settled = true;
        resolve({ client, sftp });
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

function modeToType(mode: number): RemoteDirEntry['type'] {
  // POSIX file-type bits (S_IFMT), same convention as node:fs Stats
  const fileType = mode & 0o170000;
  if (fileType === 0o040000) return 'directory';
  if (fileType === 0o120000) return 'symlink';
  return 'file';
}

export function listRemoteDirectorySftp(sftp: SFTPWrapper, path: string): Promise<RemoteDirEntry[]> {
  return new Promise((resolve, reject) => {
    sftp.readdir(path, (err, list) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(
        list.map((item) => ({
          name: item.filename,
          type: modeToType(item.attrs.mode ?? 0),
          size: item.attrs.size ?? 0,
        })),
      );
    });
  });
}
