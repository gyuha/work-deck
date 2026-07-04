import { describe, expect, it } from 'vitest';
import {
  createWorkspace,
  openTab,
  closeTab,
  toggleSplit,
  moveTabToOtherPane,
  focusTab,
} from './workspace-state';

describe('workspace tab manager', () => {
  it('starts as a single unsplit pane with no tabs', () => {
    const state = createWorkspace();
    expect(state.splitActive).toBe(false);
    expect(state.panes).toHaveLength(1);
    expect(state.panes[0].tabs).toHaveLength(0);
  });

  it('opens a new tab into the focused pane', () => {
    let state = createWorkspace();
    state = openTab(state, { kind: 'file-list', path: '/a' });
    expect(state.panes[0].tabs).toHaveLength(1);
    expect(state.panes[0].activeTabId).toBe(state.panes[0].tabs[0].id);
  });

  it('focuses an existing tab instead of duplicating it (hard-dedup targets)', () => {
    let state = createWorkspace();
    state = openTab(state, { kind: 'preview', path: '/a.txt' });
    const firstId = state.panes[0].tabs[0].id;
    state = openTab(state, { kind: 'preview', path: '/a.txt' });
    expect(state.panes[0].tabs).toHaveLength(1);
    expect(state.panes[0].activeTabId).toBe(firstId);
  });

  it('splits into two panes and opens new tabs into the focused pane only', () => {
    let state = createWorkspace();
    state = toggleSplit(state);
    expect(state.splitActive).toBe(true);
    expect(state.panes).toHaveLength(2);

    state = openTab(state, { kind: 'file-list', path: '/left' });
    expect(state.panes[0].tabs).toHaveLength(1);
    expect(state.panes[1]!.tabs).toHaveLength(0);
  });

  it('moves a tab to the other pane', () => {
    let state = createWorkspace();
    state = toggleSplit(state);
    state = openTab(state, { kind: 'file-list', path: '/left' });
    const tabId = state.panes[0].tabs[0].id;
    state = moveTabToOtherPane(state, tabId);
    expect(state.panes[0].tabs).toHaveLength(0);
    expect(state.panes[1]!.tabs).toHaveLength(1);
  });

  it('merges tabs back into one pane on unsplit', () => {
    let state = createWorkspace();
    state = toggleSplit(state);
    state = openTab(state, { kind: 'file-list', path: '/left' });
    state = moveTabToOtherPane(state, state.panes[0].tabs[0]?.id ?? '');
    state = focusTab(state, state.panes[1]!.id, state.panes[1]!.tabs[0].id);
    state = openTab(state, { kind: 'file-list', path: '/right-only' });

    state = toggleSplit(state);
    expect(state.splitActive).toBe(false);
    expect(state.panes).toHaveLength(1);
    expect(state.panes[0].tabs).toHaveLength(2);
  });

  it('auto-unsplits when all tabs in one pane are closed', () => {
    let state = createWorkspace();
    state = toggleSplit(state);
    state = openTab(state, { kind: 'file-list', path: '/left' });
    const leftTabId = state.panes[0].tabs[0].id;
    state = closeTab(state, state.panes[0].id, leftTabId);
    expect(state.splitActive).toBe(false);
    expect(state.panes).toHaveLength(1);
  });
});
