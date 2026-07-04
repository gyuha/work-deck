import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, writeFile, readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { copyItems, moveItems } from './transfer';

async function makeTempDirs() {
  const srcDir = await mkdtemp(path.join(tmpdir(), 'workdeck-src-'));
  const destDir = await mkdtemp(path.join(tmpdir(), 'workdeck-dest-'));
  return { srcDir, destDir };
}

describe('copyItems', () => {
  it('copies a file, keeps the source, and reports progress at least once', async () => {
    const { srcDir, destDir } = await makeTempDirs();
    const sourcePath = path.join(srcDir, 'a.txt');
    await writeFile(sourcePath, 'hello');
    const destPath = path.join(destDir, 'a.txt');

    const onProgress = vi.fn();
    await copyItems([{ sourcePath, destPath }], { onProgress });

    expect(existsSync(sourcePath)).toBe(true);
    expect((await readFile(destPath)).toString()).toBe('hello');
    expect(onProgress).toHaveBeenCalled();
  });

  it('copies a directory recursively', async () => {
    const { srcDir, destDir } = await makeTempDirs();
    const sourceDir = path.join(srcDir, 'folder');
    await mkdir(sourceDir);
    await writeFile(path.join(sourceDir, 'inner.txt'), 'nested');
    const destPath = path.join(destDir, 'folder');

    await copyItems([{ sourcePath: sourceDir, destPath }]);

    expect((await readFile(path.join(destPath, 'inner.txt'))).toString()).toBe('nested');
    expect(existsSync(sourceDir)).toBe(true);
  });
});

describe('moveItems', () => {
  it('moves a file: removes the source, creates the destination', async () => {
    const { srcDir, destDir } = await makeTempDirs();
    const sourcePath = path.join(srcDir, 'a.txt');
    await writeFile(sourcePath, 'hello');
    const destPath = path.join(destDir, 'a.txt');

    await moveItems([{ sourcePath, destPath }]);

    expect(existsSync(sourcePath)).toBe(false);
    expect((await readFile(destPath)).toString()).toBe('hello');
  });

  it('stops early when cancelled, leaving completed items done and the rest untouched', async () => {
    const { srcDir, destDir } = await makeTempDirs();
    const a = path.join(srcDir, 'a.txt');
    const b = path.join(srcDir, 'b.txt');
    await writeFile(a, '1');
    await writeFile(b, '2');

    let calls = 0;
    await copyItems(
      [
        { sourcePath: a, destPath: path.join(destDir, 'a.txt') },
        { sourcePath: b, destPath: path.join(destDir, 'b.txt') },
      ],
      { isCancelled: () => { calls += 1; return calls > 1; } },
    );

    expect(existsSync(path.join(destDir, 'a.txt'))).toBe(true);
    expect(existsSync(path.join(destDir, 'b.txt'))).toBe(false);
  });
});
