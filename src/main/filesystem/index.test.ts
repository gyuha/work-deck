import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { listDirectory, readFileContent, registerFilesystemHandlers, FILESYSTEM_CHANNELS } from './index';

async function makeFixtureDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'workdeck-fs-'));
  await writeFile(path.join(dir, 'b.txt'), 'hello');
  await writeFile(path.join(dir, '.hidden'), 'secret');
  await mkdir(path.join(dir, 'a-folder'));
  return dir;
}

describe('listDirectory', () => {
  it('returns name/type/size/mtime metadata sortable by any of those fields', async () => {
    const dir = await makeFixtureDir();
    const entries = await listDirectory(dir);
    const byName = Object.fromEntries(entries.map((e) => [e.name, e]));

    expect(byName['b.txt'].type).toBe('file');
    expect(byName['b.txt'].size).toBe(5);
    expect(typeof byName['b.txt'].mtimeMs).toBe('number');
    expect(byName['a-folder'].type).toBe('directory');
    expect(byName['.hidden'].hidden).toBe(true);
    expect(byName['b.txt'].hidden).toBe(false);
  });
});

describe('readFileContent', () => {
  it('reads file bytes and reports the total size', async () => {
    const dir = await makeFixtureDir();
    const result = await readFileContent(path.join(dir, 'b.txt'));
    expect(result.bytes.toString('utf-8')).toBe('hello');
    expect(result.totalSize).toBe(5);
  });

  it('truncates a file over the large-file threshold to the display size', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'workdeck-fs-'));
    const bigFile = path.join(dir, 'big.txt');
    const totalSize = 11 * 1024 * 1024; // over the 10MB threshold
    await writeFile(bigFile, Buffer.alloc(totalSize, 'a'));

    const result = await readFileContent(bigFile);

    expect(result.totalSize).toBe(totalSize);
    expect(result.bytes.length).toBe(1 * 1024 * 1024); // display size
  });
});

describe('registerFilesystemHandlers', () => {
  it('registers IPC handlers for list-directory and read-file', () => {
    const handle = vi.fn();
    registerFilesystemHandlers({ handle });
    const registeredChannels = handle.mock.calls.map((call) => call[0]);
    expect(registeredChannels).toContain(FILESYSTEM_CHANNELS.listDirectory);
    expect(registeredChannels).toContain(FILESYSTEM_CHANNELS.readFile);
  });
});
