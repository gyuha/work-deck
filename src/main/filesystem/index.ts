import { promises as fs } from 'node:fs';
import path from 'node:path';
import { FILESYSTEM_CHANNELS, type DirEntry } from '../../shared/filesystem-types';
import { PREVIEW_LARGE_FILE_THRESHOLD_BYTES, PREVIEW_DISPLAY_BYTES } from '../../shared/preview-types';

export async function listDirectory(dirPath: string): Promise<DirEntry[]> {
  const names = await fs.readdir(dirPath);
  return Promise.all(
    names.map(async (name): Promise<DirEntry> => {
      const stat = await fs.lstat(path.join(dirPath, name));
      return {
        name,
        type: stat.isDirectory() ? 'directory' : stat.isSymbolicLink() ? 'symlink' : 'file',
        size: stat.size,
        mtimeMs: stat.mtimeMs,
        hidden: name.startsWith('.'),
      };
    }),
  );
}

export interface FileContentResult {
  bytes: Buffer;
  totalSize: number;
}

/** docs/features/preview.md 3.1: files over the threshold return only their first `PREVIEW_DISPLAY_BYTES`. */
export async function readFileContent(filePath: string): Promise<FileContentResult> {
  const stat = await fs.stat(filePath);
  if (stat.size <= PREVIEW_LARGE_FILE_THRESHOLD_BYTES) {
    return { bytes: await fs.readFile(filePath), totalSize: stat.size };
  }

  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(PREVIEW_DISPLAY_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, PREVIEW_DISPLAY_BYTES, 0);
    return { bytes: buffer.subarray(0, bytesRead), totalSize: stat.size };
  } finally {
    await handle.close();
  }
}

export interface IpcMainLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches Electron's ipcMain.handle signature
  handle(channel: string, listener: (event: any, ...args: any[]) => unknown): void;
}

export { FILESYSTEM_CHANNELS };

export function registerFilesystemHandlers(ipcMain: IpcMainLike): void {
  ipcMain.handle(FILESYSTEM_CHANNELS.listDirectory, (_event, dirPath: string) => listDirectory(dirPath));
  ipcMain.handle(FILESYSTEM_CHANNELS.readFile, (_event, filePath: string) => readFileContent(filePath));
}
