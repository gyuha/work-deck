// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderSidebar } from '../sidebar/sidebar-view';
import { createWorkspace, openTab } from './workspace-state';
import { renderTabBar } from './workspace-view';

describe('sidebar view switch does not affect the workspace', () => {
  it('changes only the active sidebar view; workspace tab bar is untouched', () => {
    document.body.innerHTML = '<div id="sidebar"></div><div id="workspace"></div>';
    const sidebarEl = document.getElementById('sidebar') as HTMLElement;
    const workspaceEl = document.getElementById('workspace') as HTMLElement;

    const controller = renderSidebar(sidebarEl, 'files');
    let state = createWorkspace();
    state = openTab(state, { kind: 'file-list', path: '/a' });
    renderTabBar(workspaceEl, state);
    const beforeWorkspaceHtml = workspaceEl.innerHTML;

    const connectionsBtn = sidebarEl.querySelector<HTMLButtonElement>('[data-view="connections"]');
    connectionsBtn?.click();

    expect(controller.getActiveView()).toBe('connections');
    expect(sidebarEl.querySelector('[data-view="files"]')?.classList.contains('active')).toBe(false);
    expect(sidebarEl.querySelector('[data-view="connections"]')?.classList.contains('active')).toBe(true);
    expect(workspaceEl.innerHTML).toBe(beforeWorkspaceHtml);
  });
});
