// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { mountWorkspace } from './index';
import type { XtermLike } from './xterm-attach';
import type { WorkspaceTerminalClient } from './terminal-client';

function fakeXterm(): XtermLike {
  return {
    open: vi.fn(),
    write: vi.fn(),
    onData: () => ({ dispose: vi.fn() }),
    dispose: vi.fn(),
  };
}

function fakeTerminalClient(overrides: Partial<WorkspaceTerminalClient> = {}): WorkspaceTerminalClient {
  return {
    createLocal: vi.fn().mockResolvedValue('session-1'),
    createSsh: vi.fn().mockResolvedValue('session-1'),
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
    reconnect: vi.fn().mockResolvedValue(undefined),
    isBusy: vi.fn().mockResolvedValue(false),
    onData: () => () => {},
    onStatusChanged: () => () => {},
    ...overrides,
  };
}

async function flush(times = 3): Promise<void> {
  for (let i = 0; i < times; i++) await Promise.resolve();
}

describe('workspace terminal content integration', () => {
  it('opening a local-terminal tab creates a session and attaches xterm content', async () => {
    const terminal = fakeTerminalClient();
    const createXterm = vi.fn(() => fakeXterm());
    const workspace = mountWorkspace(document.createElement('div'), { terminal, createXterm });

    workspace.openTab({ kind: 'local-terminal' });
    await flush();

    expect(terminal.createLocal).toHaveBeenCalledTimes(1);
    expect(createXterm).toHaveBeenCalledTimes(1);
  });

  it('asks for confirmation before closing a busy local terminal tab, and cancels on decline', async () => {
    const terminal = fakeTerminalClient({ isBusy: vi.fn().mockResolvedValue(true) });
    const confirm = vi.fn().mockReturnValue(false);
    const workspace = mountWorkspace(document.createElement('div'), { terminal, createXterm: fakeXterm, confirm });

    workspace.openTab({ kind: 'local-terminal' });
    await flush();
    const paneId = workspace.getState().panes[0].id;
    const tabId = workspace.getState().panes[0].tabs[0].id;

    await workspace.closeTab(paneId, tabId);

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(terminal.kill).not.toHaveBeenCalled();
    expect(workspace.getState().panes[0].tabs).toHaveLength(1);
  });

  it('closes immediately without confirmation when the local terminal is idle', async () => {
    const terminal = fakeTerminalClient({ isBusy: vi.fn().mockResolvedValue(false) });
    const confirm = vi.fn();
    const workspace = mountWorkspace(document.createElement('div'), { terminal, createXterm: fakeXterm, confirm });

    workspace.openTab({ kind: 'local-terminal' });
    await flush();
    const paneId = workspace.getState().panes[0].id;
    const tabId = workspace.getState().panes[0].tabs[0].id;

    await workspace.closeTab(paneId, tabId);

    expect(confirm).not.toHaveBeenCalled();
    expect(terminal.kill).toHaveBeenCalledWith('session-1');
    expect(workspace.getState().panes[0].tabs).toHaveLength(0);
  });

  it('always confirms closing an active SSH terminal tab regardless of busy state', async () => {
    const terminal = fakeTerminalClient();
    const confirm = vi.fn().mockReturnValue(true);
    const workspace = mountWorkspace(document.createElement('div'), { terminal, createXterm: fakeXterm, confirm });

    workspace.openTab({ kind: 'ssh-terminal', connectionId: 'conn-1' });
    await flush();
    const paneId = workspace.getState().panes[0].id;
    const tabId = workspace.getState().panes[0].tabs[0].id;

    await workspace.closeTab(paneId, tabId);

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(terminal.kill).toHaveBeenCalledWith('session-1');
  });

  it('reuses the same session when switching away from and back to a terminal tab', async () => {
    const terminal = fakeTerminalClient();
    const createXterm = vi.fn(() => fakeXterm());
    const workspace = mountWorkspace(document.createElement('div'), { terminal, createXterm });

    workspace.openTab({ kind: 'local-terminal' });
    await flush();
    const paneId = workspace.getState().panes[0].id;
    const terminalTabId = workspace.getState().panes[0].tabs[0].id;

    workspace.openTab({ kind: 'preview', path: '/a.txt' });
    await flush();
    workspace.focusTab(paneId, terminalTabId);
    await flush();

    expect(terminal.createLocal).toHaveBeenCalledTimes(1);
    expect(createXterm).toHaveBeenCalledTimes(2); // re-attached with a fresh xterm instance, same underlying session
  });
});
