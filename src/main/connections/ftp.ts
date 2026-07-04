import { Client } from 'basic-ftp';
import type { RemoteDirEntry } from './sftp';

export interface FtpConnectOptions {
  host: string;
  port: number;
  user: string;
  password: string;
  secure?: boolean;
}

export async function connectFtp(options: FtpConnectOptions): Promise<Client> {
  const client = new Client();
  await client.access({
    host: options.host,
    port: options.port,
    user: options.user,
    password: options.password,
    secure: options.secure ?? false,
  });
  return client;
}

export async function listRemoteDirectoryFtp(client: Client, path: string): Promise<RemoteDirEntry[]> {
  const list = await client.list(path);
  return list.map((item) => ({
    name: item.name,
    type: item.isDirectory ? 'directory' : item.isSymbolicLink ? 'symlink' : 'file',
    size: item.size,
  }));
}
