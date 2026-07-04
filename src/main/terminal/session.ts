import type { SessionStatus } from '../../shared/terminal-types';

export type { SessionStatus };

export interface TerminalSession {
  readonly id: string;
  readonly kind: 'local' | 'ssh';
  readonly status: SessionStatus;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
  onData(cb: (data: string) => void): () => void;
  onExit(cb: (info: { exitCode?: number }) => void): () => void;
  onDisconnect(cb: () => void): () => void;
}
