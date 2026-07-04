import type { DirEntry } from '../shared/filesystem-types';
import type { FileContentResult } from '../shared/preview-types';
import type { TransferPlanItem } from './workspace/dual-file-ops';
import type { WorkspaceFilesystem } from './workspace';
import type { WorkspaceTerminalClient } from './workspace/terminal-client';
import type { BookmarksClient } from './sidebar/bookmark-view';
import type { WindowClient } from './window-client';

export interface FilesystemClient {
  listDirectory(path: string): Promise<DirEntry[]>;
  readFile(path: string): Promise<FileContentResult>;
  transfer: {
    copy(items: TransferPlanItem[]): Promise<string>;
    move(items: TransferPlanItem[]): Promise<string>;
    onProgress(cb: (progress: unknown) => void): () => void;
    setConflictHandler(handler: (destPath: string) => Promise<{ policy: string; newName?: string }>): void;
  };
}

export interface RemoteFileClient {
  listDirectory(connectionId: string, path: string): Promise<DirEntry[]>;
  readFile(connectionId: string, path: string): Promise<FileContentResult>;
  transfer(items: TransferPlanItem[], mode: 'copy' | 'move'): Promise<void>;
}

declare global {
  interface Window {
    workdeck: {
      version: string;
      platform: string;
      window: WindowClient;
      filesystem: FilesystemClient;
      terminal: WorkspaceTerminalClient;
      remoteFile: RemoteFileClient;
      bookmarks: BookmarksClient;
    };
  }
}

export function getFilesystemClient(): FilesystemClient {
  return window.workdeck.filesystem;
}

export function getTerminalClient(): WorkspaceTerminalClient {
  return window.workdeck.terminal;
}

export function getRemoteFileClient(): RemoteFileClient {
  return window.workdeck.remoteFile;
}

function isLocalOnly(items: TransferPlanItem[]): boolean {
  return items.every((item) => !item.sourceConnectionId && !item.destConnectionId);
}

/** docs/features/file-manager.md 3장: routes to the local IPC (with progress/conflict handling) when every
 * item is local<->local, otherwise to the remote-aware transfer channel. */
export function createWorkspaceFilesystem(local: FilesystemClient, remoteFile: RemoteFileClient): WorkspaceFilesystem {
  return {
    listDirectory: (path, connectionId) => (connectionId ? remoteFile.listDirectory(connectionId, path) : local.listDirectory(path)),
    readFile: (path, connectionId) => (connectionId ? remoteFile.readFile(connectionId, path) : local.readFile(path)),
    transfer: {
      copy: (items) => (isLocalOnly(items) ? local.transfer.copy(items) : remoteFile.transfer(items, 'copy').then(() => 'remote')),
      move: (items) => (isLocalOnly(items) ? local.transfer.move(items) : remoteFile.transfer(items, 'move').then(() => 'remote')),
    },
  };
}
