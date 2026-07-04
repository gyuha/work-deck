import { wireSidebarResize } from './sidebar-resize';

export type SidebarViewKind = 'files' | 'connections' | 'bookmarks';

export interface SidebarController {
  getActiveView(): SidebarViewKind;
  setActiveView(view: SidebarViewKind): void;
  getViewContainer(view: SidebarViewKind): HTMLElement;
  getActionBar(): HTMLElement;
}

const VIEWS: SidebarViewKind[] = ['files', 'connections', 'bookmarks'];
const ICONS: Record<SidebarViewKind, string> = { files: 'codicon-files', connections: 'codicon-plug', bookmarks: 'codicon-bookmark' };
const LABELS: Record<SidebarViewKind, string> = { files: '파일', connections: '연결', bookmarks: '북마크' };

const SIDEBAR_LIMITS = { min: 170, max: 500 };
const SIDEBAR_DEFAULT_WIDTH = 240;

export function renderSidebar(container: HTMLElement, initial: SidebarViewKind = 'files'): SidebarController {
  container.innerHTML = '';
  container.classList.add('sidebar');

  const activityBar = document.createElement('div');
  activityBar.className = 'activity-bar';

  const panel = document.createElement('div');
  panel.className = 'sidebar-panel';
  panel.style.width = `${SIDEBAR_DEFAULT_WIDTH}px`;

  let active = initial;
  let panelWidth = SIDEBAR_DEFAULT_WIDTH;
  const buttons = new Map<SidebarViewKind, HTMLButtonElement>();
  const viewContainers = new Map<SidebarViewKind, HTMLElement>();

  function refresh(): void {
    for (const [view, btn] of buttons) {
      btn.classList.toggle('active', view === active);
      btn.setAttribute('aria-pressed', String(view === active));
    }
    for (const [view, el] of viewContainers) {
      el.style.display = view === active ? '' : 'none';
    }
  }

  for (const view of VIEWS) {
    const btn = document.createElement('button');
    btn.className = 'activity-bar-button';
    btn.dataset.view = view;
    btn.title = LABELS[view];
    btn.setAttribute('aria-label', LABELS[view]);
    const icon = document.createElement('span');
    icon.className = `codicon ${ICONS[view]}`;
    btn.appendChild(icon);
    btn.addEventListener('click', () => {
      active = view;
      refresh();
    });
    buttons.set(view, btn);
    activityBar.appendChild(btn);
  }

  const actionBar = document.createElement('div');
  actionBar.className = 'sidebar-action-bar';
  panel.appendChild(actionBar);

  for (const view of VIEWS) {
    const viewEl = document.createElement('div');
    viewEl.className = 'sidebar-view';
    viewEl.dataset.viewContent = view;
    viewContainers.set(view, viewEl);
    panel.appendChild(viewEl);
  }

  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'sidebar-resize-handle';
  wireSidebarResize(resizeHandle, {
    startWidth: panelWidth,
    limits: SIDEBAR_LIMITS,
    onResize: (width) => {
      panelWidth = width;
      panel.style.width = `${width}px`;
    },
  });

  container.append(activityBar, panel, resizeHandle);
  refresh();

  return {
    getActiveView: () => active,
    setActiveView: (view) => {
      active = view;
      refresh();
    },
    getViewContainer: (view) => viewContainers.get(view) as HTMLElement,
    getActionBar: () => actionBar,
  };
}
