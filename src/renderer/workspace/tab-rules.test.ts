import { describe, expect, it } from 'vitest';
import { normalizePath, resolveOpen, type OpenTab } from './tab-rules';

describe('normalizePath', () => {
  it('strips a trailing slash', () => {
    expect(normalizePath('/users/a/project/', 'darwin')).toBe('/users/a/project');
  });

  it('is case-insensitive on darwin', () => {
    expect(normalizePath('/Users/A/Project', 'darwin')).toBe(normalizePath('/users/a/project', 'darwin'));
  });

  it('is case-sensitive on linux/win32', () => {
    expect(normalizePath('/home/A', 'linux')).not.toBe(normalizePath('/home/a', 'linux'));
  });
});

describe('resolveOpen — local-terminal', () => {
  it('always opens a new tab, never focuses an existing one', () => {
    const existing: OpenTab[] = [
      { id: 't1', target: { kind: 'local-terminal' }, lastActivatedAt: 1 },
    ];
    const decision = resolveOpen({ kind: 'local-terminal' }, existing);
    expect(decision.action).toBe('open');
  });
});

describe('resolveOpen — ssh-terminal (hard dedup by connection)', () => {
  it('focuses the existing tab for the same connection, including a disconnected one', () => {
    const existing: OpenTab[] = [
      { id: 't1', target: { kind: 'ssh-terminal', connectionId: 'conn-1', status: 'disconnected' }, lastActivatedAt: 1 },
    ];
    const decision = resolveOpen({ kind: 'ssh-terminal', connectionId: 'conn-1' }, existing);
    expect(decision).toEqual({ action: 'focus', tabId: 't1' });
  });

  it('opens a new tab for a different connection', () => {
    const existing: OpenTab[] = [
      { id: 't1', target: { kind: 'ssh-terminal', connectionId: 'conn-1' }, lastActivatedAt: 1 },
    ];
    const decision = resolveOpen({ kind: 'ssh-terminal', connectionId: 'conn-2' }, existing);
    expect(decision.action).toBe('open');
  });
});

describe('resolveOpen — preview (hard dedup by normalized path + connection)', () => {
  it('focuses an existing preview tab for the same local file', () => {
    const existing: OpenTab[] = [
      { id: 't1', target: { kind: 'preview', path: '/a/b.txt' }, lastActivatedAt: 1 },
    ];
    const decision = resolveOpen({ kind: 'preview', path: '/a/b.txt/' }, existing);
    expect(decision).toEqual({ action: 'focus', tabId: 't1' });
  });

  it('treats the same path on two different connections as different targets', () => {
    const existing: OpenTab[] = [
      { id: 't1', target: { kind: 'preview', path: '/a/b.txt', connectionId: 'conn-1' }, lastActivatedAt: 1 },
    ];
    const decision = resolveOpen({ kind: 'preview', path: '/a/b.txt', connectionId: 'conn-2' }, existing);
    expect(decision.action).toBe('open');
  });
});

describe('resolveOpen — file-list (soft dedup, most-recently-activated wins)', () => {
  it('focuses the most recently activated matching tab when several exist', () => {
    const existing: OpenTab[] = [
      { id: 'old', target: { kind: 'file-list', path: '/a' }, lastActivatedAt: 1 },
      { id: 'new', target: { kind: 'file-list', path: '/a' }, lastActivatedAt: 5 },
    ];
    const decision = resolveOpen({ kind: 'file-list', path: '/a' }, existing);
    expect(decision).toEqual({ action: 'focus', tabId: 'new' });
  });

  it('bypasses dedup entirely when forceNewTab is set (context menu escape hatch)', () => {
    const existing: OpenTab[] = [
      { id: 't1', target: { kind: 'file-list', path: '/a' }, lastActivatedAt: 1 },
    ];
    const decision = resolveOpen({ kind: 'file-list', path: '/a' }, existing, { forceNewTab: true });
    expect(decision.action).toBe('open');
  });

  it('distinguishes remote file-list tabs by connection + path', () => {
    const existing: OpenTab[] = [
      { id: 't1', target: { kind: 'file-list', path: '/a', connectionId: 'conn-1' }, lastActivatedAt: 1 },
    ];
    const same = resolveOpen({ kind: 'file-list', path: '/a', connectionId: 'conn-1' }, existing);
    const different = resolveOpen({ kind: 'file-list', path: '/a', connectionId: 'conn-2' }, existing);
    expect(same.action).toBe('focus');
    expect(different.action).toBe('open');
  });
});
