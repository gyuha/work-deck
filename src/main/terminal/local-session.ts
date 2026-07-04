import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { homedir } from 'node:os';
import path from 'node:path';
import * as pty from 'node-pty';
import type { SessionStatus, TerminalSession } from './session';

export interface LocalTerminalSession extends TerminalSession {
  /** True when the shell's foreground process is a child command, not the idle shell prompt itself. */
  isBusy(): boolean;
}

export interface LocalSessionOptions {
  /** docs/features/terminal.md 2.2: the active local file-list tab's directory, or the user's home when absent. */
  cwd?: string;
  shell?: string;
  cols?: number;
  rows?: number;
}

function defaultShell(): string {
  if (process.platform === 'win32') return 'powershell.exe';
  return process.env.SHELL ?? '/bin/zsh';
}

export function createLocalSession(options: LocalSessionOptions): LocalTerminalSession {
  const shell = options.shell ?? defaultShell();
  const shellName = path.basename(shell);
  const proc = pty.spawn(shell, [], {
    cwd: options.cwd ?? homedir(),
    cols: options.cols ?? 80,
    rows: options.rows ?? 24,
    env: process.env as Record<string, string>,
  });

  const emitter = new EventEmitter();
  let status: SessionStatus = 'active';

  proc.onData((data) => emitter.emit('data', data));
  proc.onExit(({ exitCode }) => {
    status = 'exited';
    emitter.emit('exit', { exitCode });
  });

  return {
    id: randomUUID(),
    kind: 'local',
    get status() {
      return status;
    },
    isBusy: () => proc.process !== shellName,
    write: (data) => proc.write(data),
    resize: (cols, rows) => proc.resize(cols, rows),
    kill: () => proc.kill(),
    onData: (cb) => {
      emitter.on('data', cb);
      return () => emitter.off('data', cb);
    },
    onExit: (cb) => {
      emitter.on('exit', cb);
      return () => emitter.off('exit', cb);
    },
    onDisconnect: () => () => {}, // local sessions have no remote link, so this never fires
  };
}
