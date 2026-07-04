import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface TransferItem {
  sourcePath: string;
  destPath: string;
}

export type ConflictPolicy = 'overwrite' | 'skip' | 'rename';

export interface ConflictDecision {
  policy: ConflictPolicy;
  newName?: string;
}

export interface TransferProgress {
  totalItems: number;
  completedItems: number;
  currentItem: string;
}

export interface TransferOptions {
  onProgress?: (progress: TransferProgress) => void;
  onConflict?: (destPath: string) => ConflictDecision | Promise<ConflictDecision>;
  isCancelled?: () => boolean;
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.stat(target);
    return true;
  } catch {
    return false;
  }
}

async function copyOne(source: string, dest: string): Promise<void> {
  const stat = await fs.lstat(source);
  if (stat.isDirectory()) {
    await fs.cp(source, dest, { recursive: true });
  } else {
    await fs.copyFile(source, dest);
  }
}

async function removeOne(target: string): Promise<void> {
  await fs.rm(target, { recursive: true, force: false });
}

async function transferOne(item: TransferItem, mode: 'copy' | 'move', options: TransferOptions): Promise<void> {
  let destPath = item.destPath;

  if (await pathExists(destPath)) {
    const decision = (await options.onConflict?.(destPath)) ?? { policy: 'overwrite' as const };

    if (decision.policy === 'skip') return;

    if (decision.policy === 'rename' && decision.newName) {
      destPath = path.join(path.dirname(destPath), decision.newName);
      await copyOne(item.sourcePath, destPath);
      if (mode === 'move') await removeOne(item.sourcePath);
      return;
    }

    // overwrite: transfer to a temp path, then atomically replace the existing target.
    const tempPath = `${destPath}.workdeck-tmp-${process.pid}-${Date.now()}`;
    await copyOne(item.sourcePath, tempPath);
    await fs.rm(destPath, { recursive: true, force: true });
    await fs.rename(tempPath, destPath);
    if (mode === 'move') await removeOne(item.sourcePath);
    return;
  }

  await copyOne(item.sourcePath, destPath);
  if (mode === 'move') await removeOne(item.sourcePath);
}

async function runTransfer(items: TransferItem[], mode: 'copy' | 'move', options: TransferOptions = {}): Promise<void> {
  let completed = 0;
  for (const item of items) {
    if (options.isCancelled?.()) break;
    options.onProgress?.({ totalItems: items.length, completedItems: completed, currentItem: item.sourcePath });
    await transferOne(item, mode, options);
    completed += 1;
  }
  options.onProgress?.({ totalItems: items.length, completedItems: completed, currentItem: '' });
}

export function copyItems(items: TransferItem[], options: TransferOptions = {}): Promise<void> {
  return runTransfer(items, 'copy', options);
}

export function moveItems(items: TransferItem[], options: TransferOptions = {}): Promise<void> {
  return runTransfer(items, 'move', options);
}
