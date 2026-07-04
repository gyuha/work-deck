import type { TabTarget } from './tab-rules';
import type { WorkspaceState } from './workspace-state';

function basename(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? path;
}

function tabIcon(target: TabTarget): string {
  switch (target.kind) {
    case 'file-list':
      return 'codicon-folder-opened';
    case 'preview':
      return 'codicon-file';
    case 'ssh-terminal':
    case 'local-terminal':
      return 'codicon-terminal';
  }
}

function tabLabel(target: TabTarget): string {
  switch (target.kind) {
    case 'file-list':
    case 'preview':
      return basename(target.path) || '/';
    case 'ssh-terminal':
      return `SSH: ${target.connectionId}`;
    case 'local-terminal':
      return 'Terminal';
  }
}

function tabTitle(target: TabTarget): string {
  switch (target.kind) {
    case 'file-list':
    case 'preview':
      return target.path;
    case 'ssh-terminal':
      return `SSH: ${target.connectionId}`;
    case 'local-terminal':
      return 'Terminal';
  }
}

export interface TabBarHandlers {
  onFocusTab?: (paneId: string, tabId: string) => void;
  onCloseTab?: (paneId: string, tabId: string) => void;
}

export function renderTabBar(container: HTMLElement, state: WorkspaceState, handlers: TabBarHandlers = {}): void {
  container.innerHTML = '';
  for (const pane of state.panes) {
    const bar = document.createElement('div');
    bar.className = 'tab-bar';
    bar.dataset.pane = pane.id;
    for (const tab of pane.tabs) {
      const el = document.createElement('div');
      el.className = 'tab';
      el.dataset.tabId = tab.id;
      el.title = tabTitle(tab.target);
      el.classList.toggle('active', tab.id === pane.activeTabId);

      const icon = document.createElement('span');
      icon.className = `codicon ${tabIcon(tab.target)} tab-icon`;
      el.appendChild(icon);

      const label = document.createElement('span');
      label.className = 'tab-label';
      label.textContent = tabLabel(tab.target);
      label.addEventListener('click', () => handlers.onFocusTab?.(pane.id, tab.id));
      el.appendChild(label);

      const closeButton = document.createElement('button');
      closeButton.className = 'tab-close';
      closeButton.dataset.role = 'close-tab';
      closeButton.innerHTML = '<span class="codicon codicon-close"></span>';
      closeButton.addEventListener('click', (ev) => {
        ev.stopPropagation();
        handlers.onCloseTab?.(pane.id, tab.id);
      });
      el.appendChild(closeButton);

      bar.appendChild(el);
    }
    container.appendChild(bar);
  }
}
