import { randomUUID } from 'node:crypto';
import { TRANSFER_CHANNELS } from '../../shared/filesystem-types';
import { copyItems, moveItems, type TransferItem, type ConflictDecision } from './transfer';

export interface WebContentsLike {
  send(channel: string, payload: unknown): void;
}

export interface IpcMainLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches Electron's ipcMain.handle signature
  handle(channel: string, listener: (event: any, ...args: any[]) => unknown): void;
}

export { TRANSFER_CHANNELS };

export function registerTransferHandlers(ipcMain: IpcMainLike, webContents: WebContentsLike): void {
  const cancelledJobs = new Set<string>();
  const pendingConflicts = new Map<string, (decision: ConflictDecision) => void>();

  ipcMain.handle(TRANSFER_CHANNELS.resolveConflict, (_event, requestId: string, decision: ConflictDecision) => {
    pendingConflicts.get(requestId)?.(decision);
    pendingConflicts.delete(requestId);
  });

  ipcMain.handle(TRANSFER_CHANNELS.cancel, (_event, jobId: string) => {
    cancelledJobs.add(jobId);
  });

  async function runJob(jobId: string, items: TransferItem[], mode: 'copy' | 'move'): Promise<void> {
    const run = mode === 'copy' ? copyItems : moveItems;
    await run(items, {
      isCancelled: () => cancelledJobs.has(jobId),
      onProgress: (progress) => webContents.send(TRANSFER_CHANNELS.progress, { jobId, ...progress }),
      onConflict: (destPath) =>
        new Promise<ConflictDecision>((resolve) => {
          const requestId = randomUUID();
          pendingConflicts.set(requestId, resolve);
          webContents.send(TRANSFER_CHANNELS.conflict, { jobId, requestId, destPath });
        }),
    });
    cancelledJobs.delete(jobId);
  }

  ipcMain.handle(TRANSFER_CHANNELS.copy, (_event, items: TransferItem[]) => {
    const jobId = randomUUID();
    void runJob(jobId, items, 'copy');
    return jobId;
  });

  ipcMain.handle(TRANSFER_CHANNELS.move, (_event, items: TransferItem[]) => {
    const jobId = randomUUID();
    void runJob(jobId, items, 'move');
    return jobId;
  });
}
