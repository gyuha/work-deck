import type { SFTPWrapper } from 'ssh2';
import type { Client as FtpClient } from 'basic-ftp';

export interface RemoteTransport {
  downloadToLocal(remotePath: string, localPath: string): Promise<void>;
  uploadFromLocal(localPath: string, remotePath: string): Promise<void>;
  renameRemote(oldPath: string, newPath: string): Promise<void>;
  deleteRemote(remotePath: string): Promise<void>;
}

export function createSftpTransport(sftp: SFTPWrapper): RemoteTransport {
  return {
    downloadToLocal: (remotePath, localPath) =>
      new Promise((resolve, reject) => sftp.fastGet(remotePath, localPath, (err) => (err ? reject(err) : resolve()))),
    uploadFromLocal: (localPath, remotePath) =>
      new Promise((resolve, reject) => sftp.fastPut(localPath, remotePath, (err) => (err ? reject(err) : resolve()))),
    renameRemote: (oldPath, newPath) =>
      new Promise((resolve, reject) => sftp.rename(oldPath, newPath, (err) => (err ? reject(err) : resolve()))),
    deleteRemote: (remotePath) => new Promise((resolve, reject) => sftp.unlink(remotePath, (err) => (err ? reject(err) : resolve()))),
  };
}

export function createFtpTransport(client: FtpClient): RemoteTransport {
  return {
    downloadToLocal: async (remotePath, localPath) => {
      await client.downloadTo(localPath, remotePath);
    },
    uploadFromLocal: async (localPath, remotePath) => {
      await client.uploadFrom(localPath, remotePath);
    },
    renameRemote: async (oldPath, newPath) => {
      await client.rename(oldPath, newPath);
    },
    deleteRemote: async (remotePath) => {
      await client.remove(remotePath);
    },
  };
}
