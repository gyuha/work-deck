import { randomUUID } from 'node:crypto';
import { TERMINAL_CHANNELS } from '../../shared/terminal-types';
import { createLocalSession, type LocalSessionOptions, type LocalTerminalSession } from './local-session';
import { createSshSession } from './ssh-session';
import { connectSshShell, type SshConnectOptions } from '../connections/ssh';
import type { HostTrustStore } from '../connections/host-trust';
import type { TerminalSession } from './session';

export interface WebContentsLike {
  send(channel: string, payload: unknown): void;
}

export interface IpcMainLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches Electron's ipcMain.handle signature
  handle(channel: string, listener: (event: any, ...args: any[]) => unknown): void;
}

export { TERMINAL_CHANNELS };

export interface SshConnectResolution {
  profileId: string;
  options: SshConnectOptions;
  trustStore: HostTrustStore;
}

export interface TerminalIpcDeps {
  resolveSshConnectOptions: (connectionId: string) => Promise<SshConnectResolution>;
}

export function registerTerminalHandlers(ipcMain: IpcMainLike, webContents: WebContentsLike, deps: TerminalIpcDeps): void {
  const sessions = new Map<string, TerminalSession>();
  const sshConnectionIds = new Map<string, string>();

  function wireSession(id: string, session: TerminalSession): void {
    sessions.set(id, session);
    session.onData((data) => webContents.send(TERMINAL_CHANNELS.data, { id, data }));
    session.onExit(() => webContents.send(TERMINAL_CHANNELS.statusChanged, { id, status: 'exited' }));
    session.onDisconnect(() => webContents.send(TERMINAL_CHANNELS.statusChanged, { id, status: 'disconnected' }));
  }

  async function startSshSession(id: string, connectionId: string): Promise<void> {
    const { profileId, options, trustStore } = await deps.resolveSshConnectOptions(connectionId);
    const { client, shell } = await connectSshShell(profileId, options, trustStore);
    wireSession(id, createSshSession(client, shell));
    sshConnectionIds.set(id, connectionId);
  }

  ipcMain.handle(TERMINAL_CHANNELS.createLocal, (_event, options: LocalSessionOptions) => {
    const id = randomUUID();
    wireSession(id, createLocalSession(options));
    return id;
  });

  ipcMain.handle(TERMINAL_CHANNELS.createSsh, async (_event, { connectionId }: { connectionId: string }) => {
    const id = randomUUID();
    await startSshSession(id, connectionId);
    return id;
  });

  ipcMain.handle(TERMINAL_CHANNELS.write, (_event, id: string, data: string) => {
    sessions.get(id)?.write(data);
  });

  ipcMain.handle(TERMINAL_CHANNELS.resize, (_event, id: string, cols: number, rows: number) => {
    sessions.get(id)?.resize(cols, rows);
  });

  ipcMain.handle(TERMINAL_CHANNELS.isBusy, (_event, id: string) => {
    const session = sessions.get(id);
    return session?.kind === 'local' && 'isBusy' in session ? (session as LocalTerminalSession).isBusy() : false;
  });

  ipcMain.handle(TERMINAL_CHANNELS.kill, (_event, id: string) => {
    sessions.get(id)?.kill();
    sessions.delete(id);
    sshConnectionIds.delete(id);
  });

  ipcMain.handle(TERMINAL_CHANNELS.reconnect, async (_event, id: string) => {
    const connectionId = sshConnectionIds.get(id);
    if (!connectionId) throw new Error(`no reconnectable SSH session for id: ${id}`);
    await startSshSession(id, connectionId);
    webContents.send(TERMINAL_CHANNELS.statusChanged, { id, status: 'active' });
  });
}
