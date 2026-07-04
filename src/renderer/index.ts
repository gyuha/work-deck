import { Terminal, type ITheme } from '@xterm/xterm';
import { mountTitlebar } from './titlebar';
import { mountSidebar } from './sidebar';
import { renderFileTreeRoot } from './sidebar/file-tree';
import { renderBookmarkView } from './sidebar/bookmark-view';
import { bookmarkToTabTarget } from './sidebar/bookmark-target';
import { mountWorkspace } from './workspace';
import {
  getFilesystemClient,
  getTerminalClient,
  getRemoteFileClient,
  createWorkspaceFilesystem,
} from './filesystem-client';
import { getBookmarksClient } from './bookmarks-client';

// docs/02-ui-layout.md 6장: xterm은 CSS가 아닌 생성 시점 theme 옵션으로만 팔레트를 받으므로,
// 디자인 토큰 값을 읽어 그대로 넘긴다.
function xtermTheme(): ITheme {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(name).trim();
  return {
    background: token('--wd-bg-primary'),
    foreground: token('--wd-text-primary'),
    cursor: token('--wd-accent'),
    selectionBackground: token('--wd-bg-active'),
  };
}

const titlebarEl = document.getElementById('titlebar');
const sidebarEl = document.getElementById('sidebar');
const workspaceEl = document.getElementById('workspace');

if (sidebarEl && workspaceEl) {
  const filesystem = createWorkspaceFilesystem(getFilesystemClient(), getRemoteFileClient());
  const terminal = getTerminalClient();
  const bookmarks = getBookmarksClient();

  const workspace = mountWorkspace(workspaceEl, {
    filesystem,
    terminal,
    createXterm: () => new Terminal({ theme: xtermTheme(), fontFamily: 'Menlo, Consolas, monospace', fontSize: 13 }),
    confirm: () => window.confirm('세션이 활성 상태입니다. 탭을 닫으시겠습니까?'),
  });

  if (titlebarEl) mountTitlebar(titlebarEl, { onToggleSplit: () => workspace.toggleSplit() });

  const sidebar = mountSidebar(sidebarEl);

  void renderFileTreeRoot(sidebar.getViewContainer('files'), '/', {
    filesystem,
    joinPath: (dir, name) => (dir.endsWith('/') ? `${dir}${name}` : `${dir}/${name}`),
    onActivateFolder: (path) => workspace.openTab({ kind: 'file-list', path }),
    onActivateFile: (path) => workspace.openTab({ kind: 'preview', path }),
  });

  void renderBookmarkView(sidebar.getViewContainer('bookmarks'), {
    client: bookmarks,
    onActivate: (bookmark) => workspace.openTab(bookmarkToTabTarget(bookmark)),
  });

  const connectionsEmpty = document.createElement('div');
  connectionsEmpty.className = 'sidebar-empty-state';
  connectionsEmpty.textContent = '연결 관리 UI는 아직 준비되지 않았습니다';
  sidebar.getViewContainer('connections').appendChild(connectionsEmpty);

  function actionButton(icon: string, label: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'sidebar-action-button';
    button.innerHTML = `<span class="codicon ${icon}"></span><span>${label}</span>`;
    return button;
  }

  // "새 로컬 터미널" command (docs/features/terminal.md 2.1) — a menu/shortcut will replace this button later.
  const newTerminalButton = actionButton('codicon-terminal', '새 로컬 터미널');
  newTerminalButton.addEventListener('click', () => workspace.openTab({ kind: 'local-terminal' }));
  sidebar.getActionBar().appendChild(newTerminalButton);

  // "현재 경로 북마크 추가" command (docs/features/bookmarks.md 4.1) — a context-menu entry will replace this later.
  const addBookmarkButton = actionButton('codicon-bookmark', '현재 경로 북마크 추가');
  addBookmarkButton.addEventListener('click', async () => {
    const state = workspace.getState();
    const pane = state.panes.find((p) => p.id === state.focusedPane);
    const tab = pane?.tabs.find((t) => t.id === pane.activeTabId);
    if (!tab || tab.target.kind !== 'file-list') return;

    const name = tab.target.path.split('/').filter(Boolean).pop() ?? tab.target.path;
    await bookmarks.add(
      tab.target.connectionId
        ? { name, kind: 'remote', path: tab.target.path, connectionId: tab.target.connectionId }
        : { name, kind: 'local', path: tab.target.path },
    );
    void renderBookmarkView(sidebar.getViewContainer('bookmarks'), {
      client: bookmarks,
      onActivate: (bookmark) => workspace.openTab(bookmarkToTabTarget(bookmark)),
    });
  });
  sidebar.getActionBar().appendChild(addBookmarkButton);
}
