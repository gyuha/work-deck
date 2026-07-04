export interface ConnectionProtocols {
  ssh: boolean;
  sftp: boolean;
  ftp: boolean;
  ftps: boolean;
}

export type AuthMethod = 'password' | 'privateKey';
export type FilenameEncoding = 'auto' | 'utf8' | 'euc-kr';

export interface ConnectionProfile {
  id: string;
  name: string;
  host: string;
  sshPort: number;
  ftpPort: number;
  protocols: ConnectionProtocols;
  username: string;
  authMethod: AuthMethod;
  privateKeyPath?: string;
  defaultRemotePath?: string;
  ftpUsername?: string;
  filenameEncoding: FilenameEncoding;
}

export type ConnectionProfileInput = Omit<ConnectionProfile, 'id' | 'sshPort' | 'ftpPort' | 'filenameEncoding'> &
  Partial<Pick<ConnectionProfile, 'sshPort' | 'ftpPort' | 'filenameEncoding'>>;

export const CONNECTION_CHANNELS = {
  list: 'connections:list',
  create: 'connections:create',
  update: 'connections:update',
  delete: 'connections:delete',
} as const;
