import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { ConnectionProfile, ConnectionProfileInput } from '../../shared/connection-types';

export class ValidationError extends Error {}

function validate(input: ConnectionProfileInput): void {
  if (!input.name) throw new ValidationError('name is required');
  if (!input.host) throw new ValidationError('host is required');
  if (!input.username) throw new ValidationError('username is required');
  const { ssh, sftp, ftp } = input.protocols;
  if (!ssh && !sftp && !ftp) throw new ValidationError('at least one of ssh/sftp/ftp must be enabled');
  if (input.authMethod === 'privateKey' && !input.privateKeyPath) {
    throw new ValidationError('privateKeyPath is required when authMethod is privateKey');
  }
}

function withDefaults(input: ConnectionProfileInput, id: string): ConnectionProfile {
  return {
    id,
    name: input.name,
    host: input.host,
    sshPort: input.sshPort ?? 22,
    ftpPort: input.ftpPort ?? 21,
    protocols: input.protocols,
    username: input.username,
    authMethod: input.authMethod,
    privateKeyPath: input.privateKeyPath,
    defaultRemotePath: input.defaultRemotePath,
    ftpUsername: input.ftpUsername,
    filenameEncoding: input.filenameEncoding ?? 'auto',
  };
}

export class ConnectionProfileStore {
  constructor(private readonly filePath: string) {}

  private async readAll(): Promise<ConnectionProfile[]> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(raw) as ConnectionProfile[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  private async writeAll(profiles: ConnectionProfile[]): Promise<void> {
    await fs.writeFile(this.filePath, JSON.stringify(profiles, null, 2), 'utf-8');
  }

  async list(): Promise<ConnectionProfile[]> {
    return this.readAll();
  }

  async create(input: ConnectionProfileInput): Promise<ConnectionProfile> {
    validate(input);
    const profile = withDefaults(input, randomUUID());
    const all = await this.readAll();
    all.push(profile);
    await this.writeAll(all);
    return profile;
  }

  async update(id: string, patch: Partial<ConnectionProfileInput>): Promise<ConnectionProfile> {
    const all = await this.readAll();
    const index = all.findIndex((p) => p.id === id);
    if (index === -1) throw new Error(`connection profile not found: ${id}`);
    const merged = withDefaults({ ...all[index], ...patch }, id);
    validate(merged);
    all[index] = merged;
    await this.writeAll(all);
    return merged;
  }

  async delete(id: string): Promise<void> {
    const all = await this.readAll();
    await this.writeAll(all.filter((p) => p.id !== id));
  }
}
