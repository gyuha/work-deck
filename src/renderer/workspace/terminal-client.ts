import type { SessionStatus } from '../../shared/terminal-types';

export interface WorkspaceTerminalClient {
  createLocal(options: { cwd?: string }): Promise<string>;
  createSsh(connectionId: string): Promise<string>;
  write(id: string, data: string): void;
  resize(id: string, cols: number, rows: number): void;
  kill(id: string): void;
  reconnect(id: string): Promise<void>;
  isBusy(id: string): Promise<boolean>;
  onData(cb: (payload: { id: string; data: string }) => void): () => void;
  onStatusChanged(cb: (payload: { id: string; status: SessionStatus }) => void): () => void;
}
