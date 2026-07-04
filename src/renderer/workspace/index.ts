import {
  createWorkspace,
  openTab as openTabInState,
  closeTab as closeTabInState,
  toggleSplit as toggleSplitInState,
  focusTab as focusTabInState,
  type Pane,
  type WorkspaceState,
} from './workspace-state';
import type { ResolveOpenOptions, TabTarget } from './tab-rules';
import { renderTabBar } from './workspace-view';
import { createFileListState, type FileListState } from './file-list-state';
import { renderFileListTab } from './file-list-view';
import { buildTransferPlan, type TransferPlanItem } from './dual-file-ops';
import { needsCloseConfirmation, type TerminalKind } from './terminal-close-guard';
import { attachTerminal, type XtermLike } from './xterm-attach';
import { renderPreviewTab } from '../preview/preview-tab';
import { wireSplitResize } from './split-resize';
import type { WorkspaceTerminalClient } from './terminal-client';
import type { SessionStatus } from '../../shared/terminal-types';
import type { DirEntry } from '../../shared/filesystem-types';
import type { FileContentResult } from '../../shared/preview-types';

export interface WorkspaceFilesystem {
  listDirectory(path: string, connectionId?: string): Promise<DirEntry[]>;
  readFile?(path: string, connectionId?: string): Promise<FileContentResult>;
  transfer?: {
    copy(items: TransferPlanItem[]): Promise<string>;
    move(items: TransferPlanItem[]): Promise<string>;
  };
}

export interface WorkspaceDeps {
  filesystem?: WorkspaceFilesystem;
  terminal?: WorkspaceTerminalClient;
  createXterm?: () => XtermLike;
  confirm?: () => boolean;
}

export interface WorkspaceController {
  getState(): WorkspaceState;
  openTab(target: TabTarget, options?: ResolveOpenOptions): void;
  toggleSplit(): void;
  focusPane(paneId: string): void;
  focusTab(paneId: string, tabId: string): void;
  closeTab(paneId: string, tabId: string): Promise<void>;
}

function joinRendererPath(dir: string, name: string): string {
  return dir.endsWith('/') ? `${dir}${name}` : `${dir}/${name}`;
}

export function mountWorkspace(container: HTMLElement, deps: WorkspaceDeps = {}): WorkspaceController {
  const { filesystem, terminal, createXterm, confirm } = deps;
  container.dataset.role = 'workspace';
  container.innerHTML = '';
  container.tabIndex = 0;

  let state = createWorkspace();
  let splitRatio = 0.5;
  const fileListStates = new Map<string, FileListState>();
  const paneElements = new Map<string, { root: HTMLElement; tabBar: HTMLElement; content: HTMLElement }>();
  const paneAttachments = new Map<string, { tabId: string; detach: () => void }>();

  // Terminal tab bookkeeping — a session survives switching away from and back to its tab.
  const tabSessionIds = new Map<string, string>();
  const tabTerminalKind = new Map<string, TerminalKind>();
  const tabTerminalStatus = new Map<string, SessionStatus>();
  const sessionIdToTabId = new Map<string, string>();
  const localTerminalCwd = new Map<string, string | undefined>();

  if (terminal) {
    terminal.onStatusChanged(({ id, status }) => {
      const tabId = sessionIdToTabId.get(id);
      if (tabId) tabTerminalStatus.set(tabId, status);
    });
  }

  function ensurePaneElements(paneId: string) {
    let els = paneElements.get(paneId);
    if (!els) {
      const root = document.createElement('div');
      root.className = 'workspace-pane';
      root.dataset.pane = paneId;
      root.addEventListener('click', () => controller.focusPane(paneId));
      const tabBar = document.createElement('div');
      const content = document.createElement('div');
      content.className = 'pane-content';
      root.append(tabBar, content);
      els = { root, tabBar, content };
      paneElements.set(paneId, els);
    }
    return els;
  }

  async function renderPaneContent(pane: Pane, contentEl: HTMLElement): Promise<void> {
    const tab = pane.tabs.find((t) => t.id === pane.activeTabId);
    const currentAttachment = paneAttachments.get(pane.id);

    if (currentAttachment && currentAttachment.tabId !== tab?.id) {
      currentAttachment.detach();
      paneAttachments.delete(pane.id);
    }

    if (!tab) {
      contentEl.innerHTML = '';
      return;
    }

    if (tab.target.kind === 'local-terminal' || tab.target.kind === 'ssh-terminal') {
      if (paneAttachments.get(pane.id)?.tabId === tab.id) return; // already showing this tab's terminal
      if (!terminal || !createXterm) return;

      let sessionId = tabSessionIds.get(tab.id);
      if (!sessionId) {
        sessionId =
          tab.target.kind === 'local-terminal'
            ? await terminal.createLocal({ cwd: localTerminalCwd.get(tab.id) })
            : await terminal.createSsh(tab.target.connectionId);
        tabSessionIds.set(tab.id, sessionId);
        tabTerminalKind.set(tab.id, tab.target.kind === 'local-terminal' ? 'local' : 'ssh');
        tabTerminalStatus.set(tab.id, 'active');
        sessionIdToTabId.set(sessionId, tab.id);
      }

      contentEl.innerHTML = '';
      const detach = attachTerminal(contentEl, sessionId, terminal, createXterm());
      paneAttachments.set(pane.id, { tabId: tab.id, detach });
      return;
    }

    if (tab.target.kind === 'preview') {
      if (paneAttachments.get(pane.id)?.tabId === tab.id) return; // already showing this file's preview
      if (!filesystem?.readFile) return;
      const readFile = filesystem.readFile.bind(filesystem);
      await renderPreviewTab(contentEl, { path: tab.target.path, connectionId: tab.target.connectionId }, { readFile });
      paneAttachments.set(pane.id, { tabId: tab.id, detach: () => {} });
      return;
    }

    contentEl.innerHTML = '';
    if (tab.target.kind !== 'file-list' || !filesystem) return;
    const target = tab.target;

    let fileListState = fileListStates.get(tab.id);
    if (!fileListState) {
      const entries = await filesystem.listDirectory(target.path, target.connectionId);
      fileListState = createFileListState(entries);
      fileListStates.set(tab.id, fileListState);
    }

    renderFileListTab(contentEl, fileListState, {
      onActivateFile: (name) =>
        controller.openTab({ kind: 'preview', path: joinRendererPath(target.path, name), connectionId: target.connectionId }),
      onStateChange: (next) => {
        fileListStates.set(tab.id, next);
        rerender();
      },
    });
  }

  function applySplitRatio(): void {
    if (!state.splitActive || state.panes.length < 2) return;
    const [paneA, paneB] = state.panes as [Pane, Pane];
    const elsA = paneElements.get(paneA.id);
    const elsB = paneElements.get(paneB.id);
    if (elsA) elsA.root.style.flex = `0 0 ${splitRatio * 100}%`;
    if (elsB) elsB.root.style.flex = `0 0 ${(1 - splitRatio) * 100}%`;
  }

  function rerender(): void {
    for (const [paneId, els] of paneElements) {
      if (!state.panes.some((p) => p.id === paneId)) {
        els.root.remove();
        paneElements.delete(paneId);
      }
    }
    container.innerHTML = '';
    state.panes.forEach((pane, index) => {
      const els = ensurePaneElements(pane.id);
      els.root.classList.toggle('focused', pane.id === state.focusedPane);
      els.root.style.flex = state.splitActive ? '' : '1 1 auto';
      renderTabBar(els.tabBar, { ...state, panes: [pane] }, {
        onFocusTab: (paneId, tabId) => controller.focusTab(paneId, tabId),
        onCloseTab: (paneId, tabId) => void controller.closeTab(paneId, tabId),
      });
      void renderPaneContent(pane, els.content);
      container.appendChild(els.root);

      if (state.splitActive && index === 0) {
        const handle = document.createElement('div');
        handle.className = 'workspace-split-handle';
        wireSplitResize(handle, {
          startRatio: splitRatio,
          containerWidth: container.clientWidth,
          onResize: (ratio) => {
            splitRatio = ratio;
            applySplitRatio();
          },
        });
        container.appendChild(handle);
      }
    });
    applySplitRatio();
  }

  function currentSelection(): string[] {
    const pane = state.panes.find((p) => p.id === state.focusedPane);
    const tab = pane?.tabs.find((t) => t.id === pane.activeTabId);
    if (!tab) return [];
    return [...(fileListStates.get(tab.id)?.selected ?? [])];
  }

  function triggerTransfer(mode: 'copy' | 'move'): void {
    if (!filesystem?.transfer) return;
    const plan = buildTransferPlan(state, state.focusedPane, currentSelection(), joinRendererPath);
    if (!plan) return;
    void filesystem.transfer[mode](plan);
  }

  container.addEventListener('keydown', (ev) => {
    const keyEvent = ev as KeyboardEvent;
    const key = keyEvent.key;
    if (key === 'F5') triggerTransfer('copy');
    else if (key === 'F6') triggerTransfer('move');
    // docs/02-ui-layout.md 5장: 분할 토글 — macOS Cmd+\, Windows/Linux Ctrl+Shift+\.
    else if (key === '\\' && (keyEvent.metaKey || (keyEvent.ctrlKey && keyEvent.shiftKey))) {
      controller.toggleSplit();
    }
  });

  const controller: WorkspaceController = {
    getState: () => state,
    openTab: (target, options) => {
      // docs/features/terminal.md 2.2: a new local terminal starts in the active local file-list
      // tab's directory (never a remote one), falling back to the user's home directory in main.
      if (target.kind === 'local-terminal') {
        const focusedPane = state.panes.find((p) => p.id === state.focusedPane);
        const activeTab = focusedPane?.tabs.find((t) => t.id === focusedPane.activeTabId);
        const cwd =
          activeTab?.target.kind === 'file-list' && !activeTab.target.connectionId ? activeTab.target.path : undefined;
        const paneIdBefore = state.focusedPane;
        state = openTabInState(state, target, options);
        const pane = state.panes.find((p) => p.id === paneIdBefore);
        const newTab = pane?.tabs[pane.tabs.length - 1];
        if (newTab) localTerminalCwd.set(newTab.id, cwd);
        rerender();
        return;
      }
      state = openTabInState(state, target, options);
      rerender();
    },
    toggleSplit: () => {
      state = toggleSplitInState(state);
      rerender();
    },
    focusPane: (paneId) => {
      const pane = state.panes.find((p) => p.id === paneId);
      if (!pane) return;
      state = pane.activeTabId ? focusTabInState(state, paneId, pane.activeTabId) : { ...state, focusedPane: paneId };
      rerender();
    },
    focusTab: (paneId, tabId) => {
      state = focusTabInState(state, paneId, tabId);
      rerender();
    },
    closeTab: async (paneId, tabId) => {
      const pane = state.panes.find((p) => p.id === paneId);
      const tab = pane?.tabs.find((t) => t.id === tabId);

      if (tab && (tab.target.kind === 'local-terminal' || tab.target.kind === 'ssh-terminal')) {
        const kind = tabTerminalKind.get(tabId) ?? (tab.target.kind === 'local-terminal' ? 'local' : 'ssh');
        const status = tabTerminalStatus.get(tabId) ?? 'active';
        const sessionId = tabSessionIds.get(tabId);
        const busy = kind === 'local' && terminal && sessionId ? await terminal.isBusy(sessionId) : false;

        if (needsCloseConfirmation(kind, status, busy) && !(confirm?.() ?? true)) return;

        if (sessionId) {
          terminal?.kill(sessionId);
          sessionIdToTabId.delete(sessionId);
        }
        tabSessionIds.delete(tabId);
        tabTerminalKind.delete(tabId);
        tabTerminalStatus.delete(tabId);
        localTerminalCwd.delete(tabId);
        if (paneAttachments.get(paneId)?.tabId === tabId) paneAttachments.delete(paneId);
      } else {
        fileListStates.delete(tabId);
      }

      state = closeTabInState(state, paneId, tabId);
      rerender();
    },
  };

  rerender();
  return controller;
}
