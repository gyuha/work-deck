// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderBookmarkView } from './bookmark-view';
import { bookmarkToTabTarget } from './bookmark-target';
import { mountWorkspace } from '../workspace';
import type { Bookmark } from '../../shared/bookmark-types';

function fakeClient(bookmarks: Bookmark[]) {
  return { list: vi.fn(async () => bookmarks), add: vi.fn(), remove: vi.fn(), reorder: vi.fn() };
}

describe('bookmark activation opens the right file-list tab', () => {
  it('opens a local file-list tab for a local bookmark', async () => {
    const workspace = mountWorkspace(document.createElement('div'));
    const client = fakeClient([{ id: '1', name: 'Projects', kind: 'local', path: '/home/user/projects' }]);
    const container = document.createElement('div');

    await renderBookmarkView(container, {
      client,
      onActivate: (bookmark) => workspace.openTab(bookmarkToTabTarget(bookmark)),
    });
    container.querySelector<HTMLElement>('[data-bookmark-id="1"]')?.click();

    const tab = workspace.getState().panes[0].tabs[0];
    expect(tab.target).toEqual({ kind: 'file-list', path: '/home/user/projects' });
  });

  it('opens a remote file-list tab (with connection id) for a remote bookmark', async () => {
    const workspace = mountWorkspace(document.createElement('div'));
    const client = fakeClient([{ id: '2', name: 'srv', kind: 'remote', path: '/var/www', connectionId: 'conn-1' }]);
    const container = document.createElement('div');

    await renderBookmarkView(container, {
      client,
      onActivate: (bookmark) => workspace.openTab(bookmarkToTabTarget(bookmark)),
    });
    container.querySelector<HTMLElement>('[data-bookmark-id="2"]')?.click();

    const tab = workspace.getState().panes[0].tabs[0];
    expect(tab.target).toEqual({ kind: 'file-list', path: '/var/www', connectionId: 'conn-1' });
  });

  it('focuses the existing tab instead of opening a duplicate when the same target is already open', async () => {
    const workspace = mountWorkspace(document.createElement('div'));
    workspace.openTab({ kind: 'file-list', path: '/home/user/projects' });

    const client = fakeClient([{ id: '1', name: 'Projects', kind: 'local', path: '/home/user/projects' }]);
    const container = document.createElement('div');
    await renderBookmarkView(container, { client, onActivate: (b) => workspace.openTab(bookmarkToTabTarget(b)) });
    container.querySelector<HTMLElement>('[data-bookmark-id="1"]')?.click();

    expect(workspace.getState().panes[0].tabs).toHaveLength(1);
  });
});
