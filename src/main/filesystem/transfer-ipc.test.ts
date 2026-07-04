import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { registerTransferHandlers, TRANSFER_CHANNELS } from './transfer-ipc';

function setup() {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const ipcMain = { handle: vi.fn((channel: string, fn: (...a: unknown[]) => unknown) => handlers.set(channel, fn)) };
  const sent: Array<{ channel: string; payload: unknown }> = [];
  const webContents = { send: vi.fn((channel: string, payload: unknown) => sent.push({ channel, payload })) };
  registerTransferHandlers(ipcMain, webContents);
  return { handlers, sent };
}

async function makeFixture() {
  const srcDir = await mkdtemp(path.join(tmpdir(), 'workdeck-src-'));
  const destDir = await mkdtemp(path.join(tmpdir(), 'workdeck-dest-'));
  const sourcePath = path.join(srcDir, 'a.txt');
  await writeFile(sourcePath, 'hi');
  return { sourcePath, destPath: path.join(destDir, 'a.txt') };
}

describe('registerTransferHandlers', () => {
  it('starting a copy job returns a job id and sends progress events over the event-stream channel', async () => {
    const { handlers, sent } = setup();
    const { sourcePath, destPath } = await makeFixture();

    const copyHandler = handlers.get(TRANSFER_CHANNELS.copy)!;
    const jobId = await copyHandler({}, [{ sourcePath, destPath }]);
    expect(typeof jobId).toBe('string');

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect((await readFile(destPath)).toString()).toBe('hi');
    const progressEvents = sent.filter((s) => s.channel === TRANSFER_CHANNELS.progress);
    expect(progressEvents.length).toBeGreaterThan(0);
  });

  it('round-trips a conflict: main asks over the event channel, renderer answers via the resolve handler', async () => {
    const { handlers, sent } = setup();
    const { sourcePath, destPath } = await makeFixture();
    await writeFile(destPath, 'existing');

    const copyHandler = handlers.get(TRANSFER_CHANNELS.copy)!;
    await copyHandler({}, [{ sourcePath, destPath }]);
    await new Promise((resolve) => setTimeout(resolve, 20));

    const conflictEvent = sent.find((s) => s.channel === TRANSFER_CHANNELS.conflict);
    expect(conflictEvent).toBeDefined();
    const { requestId } = conflictEvent!.payload as { requestId: string };

    const resolveHandler = handlers.get(TRANSFER_CHANNELS.resolveConflict)!;
    await resolveHandler({}, requestId, { policy: 'overwrite' });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect((await readFile(destPath)).toString()).toBe('hi');
  });
});
