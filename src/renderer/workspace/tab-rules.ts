export type Platform = 'darwin' | 'win32' | 'linux';

export function normalizePath(path: string, platform: Platform): string {
  const trimmed = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  return platform === 'darwin' ? trimmed.toLowerCase() : trimmed;
}

export interface FileListTarget {
  kind: 'file-list';
  path: string;
  connectionId?: string;
}

export interface PreviewTarget {
  kind: 'preview';
  path: string;
  connectionId?: string;
}

export interface SshTerminalTarget {
  kind: 'ssh-terminal';
  connectionId: string;
  status?: 'connected' | 'disconnected';
}

export interface LocalTerminalTarget {
  kind: 'local-terminal';
}

export type TabTarget = FileListTarget | PreviewTarget | SshTerminalTarget | LocalTerminalTarget;

export interface OpenTab {
  id: string;
  target: TabTarget;
  lastActivatedAt: number;
}

export type OpenDecision = { action: 'focus'; tabId: string } | { action: 'open'; target: TabTarget };

export interface ResolveOpenOptions {
  forceNewTab?: boolean;
  platform?: Platform;
}

function sameFileListOrPreview(a: FileListTarget | PreviewTarget, b: FileListTarget | PreviewTarget, platform: Platform): boolean {
  return normalizePath(a.path, platform) === normalizePath(b.path, platform) && a.connectionId === b.connectionId;
}

export function resolveOpen(target: TabTarget, openTabs: OpenTab[], options: ResolveOpenOptions = {}): OpenDecision {
  const platform = options.platform ?? 'darwin';

  if (target.kind === 'local-terminal') {
    return { action: 'open', target };
  }

  if (target.kind === 'ssh-terminal') {
    const match = openTabs.find((tab) => tab.target.kind === 'ssh-terminal' && tab.target.connectionId === target.connectionId);
    return match ? { action: 'focus', tabId: match.id } : { action: 'open', target };
  }

  if (target.kind === 'preview') {
    const match = openTabs.find((tab) => tab.target.kind === 'preview' && sameFileListOrPreview(tab.target, target, platform));
    return match ? { action: 'focus', tabId: match.id } : { action: 'open', target };
  }

  // file-list: soft dedup — most recently activated matching tab wins; bypassed by forceNewTab.
  if (options.forceNewTab) {
    return { action: 'open', target };
  }
  const matches = openTabs.filter((tab) => tab.target.kind === 'file-list' && sameFileListOrPreview(tab.target, target, platform));
  if (matches.length === 0) {
    return { action: 'open', target };
  }
  const mostRecent = matches.reduce((a, b) => (b.lastActivatedAt > a.lastActivatedAt ? b : a));
  return { action: 'focus', tabId: mostRecent.id };
}
