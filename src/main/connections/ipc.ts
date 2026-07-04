import { CONNECTION_CHANNELS } from '../../shared/connection-types';
import type { ConnectionProfileStore } from './profile-store';
import type { SecretStore } from './secrets';
import { serializeProfileForRenderer, type RendererConnectionProfile } from './serialize';

export interface IpcMainLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches Electron's ipcMain.handle signature
  handle(channel: string, listener: (event: any, ...args: any[]) => unknown): void;
}

export function registerConnectionHandlers(ipcMain: IpcMainLike, store: ConnectionProfileStore, secrets: SecretStore): void {
  const serializeAll = async (): Promise<RendererConnectionProfile[]> =>
    (await store.list()).map((p) => serializeProfileForRenderer(p, secrets));

  ipcMain.handle(CONNECTION_CHANNELS.list, () => serializeAll());
  ipcMain.handle(CONNECTION_CHANNELS.create, async (_event, input) => serializeProfileForRenderer(await store.create(input), secrets));
  ipcMain.handle(CONNECTION_CHANNELS.update, async (_event, id: string, patch) =>
    serializeProfileForRenderer(await store.update(id, patch), secrets),
  );
  ipcMain.handle(CONNECTION_CHANNELS.delete, async (_event, id: string) => {
    await store.delete(id);
    secrets.delete(id);
  });
}
