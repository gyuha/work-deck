export interface DirEntry {
  name: string;
  type: 'file' | 'directory' | 'symlink';
  size: number;
  mtimeMs: number;
  hidden: boolean;
}

export const FILESYSTEM_CHANNELS = {
  listDirectory: 'filesystem:list-directory',
  readFile: 'filesystem:read-file',
} as const;

export const TRANSFER_CHANNELS = {
  copy: 'filesystem:transfer-copy',
  move: 'filesystem:transfer-move',
  cancel: 'filesystem:transfer-cancel',
  progress: 'filesystem:transfer-progress',
  conflict: 'filesystem:transfer-conflict',
  resolveConflict: 'filesystem:transfer-resolve-conflict',
} as const;
