import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { copyItems } from './transfer';

async function makeConflictFixture() {
  const srcDir = await mkdtemp(path.join(tmpdir(), 'workdeck-src-'));
  const destDir = await mkdtemp(path.join(tmpdir(), 'workdeck-dest-'));
  const sourcePath = path.join(srcDir, 'a.txt');
  const destPath = path.join(destDir, 'a.txt');
  await writeFile(sourcePath, 'new-content');
  await writeFile(destPath, 'old-content');
  return { sourcePath, destPath, destDir };
}

describe('name conflict handling', () => {
  it('calls onConflict when the destination already exists', async () => {
    const { sourcePath, destPath } = await makeConflictFixture();
    const onConflict = vi.fn().mockResolvedValue({ policy: 'skip' });

    await copyItems([{ sourcePath, destPath }], { onConflict });

    expect(onConflict).toHaveBeenCalledWith(destPath);
  });

  it('skip: leaves the existing destination file untouched', async () => {
    const { sourcePath, destPath } = await makeConflictFixture();
    await copyItems([{ sourcePath, destPath }], { onConflict: () => ({ policy: 'skip' }) });
    expect((await readFile(destPath)).toString()).toBe('old-content');
  });

  it('overwrite: replaces the destination content with the source content', async () => {
    const { sourcePath, destPath } = await makeConflictFixture();
    await copyItems([{ sourcePath, destPath }], { onConflict: () => ({ policy: 'overwrite' }) });
    expect((await readFile(destPath)).toString()).toBe('new-content');
  });

  it('rename: writes to a new name alongside the existing destination file', async () => {
    const { sourcePath, destPath, destDir } = await makeConflictFixture();
    await copyItems([{ sourcePath, destPath }], { onConflict: () => ({ policy: 'rename', newName: 'a (2).txt' }) });

    expect((await readFile(destPath)).toString()).toBe('old-content');
    const renamedPath = path.join(destDir, 'a (2).txt');
    expect(existsSync(renamedPath)).toBe(true);
    expect((await readFile(renamedPath)).toString()).toBe('new-content');
  });
});
