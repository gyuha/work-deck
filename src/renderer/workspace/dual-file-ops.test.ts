import { describe, expect, it } from 'vitest';
import { buildTransferPlan } from './dual-file-ops';
import { createWorkspace, openTab, toggleSplit, focusTab, moveTabToOtherPane } from './workspace-state';

const joinPath = (dir: string, name: string) => `${dir}/${name}`;

function twoPaneFixture() {
  let state = createWorkspace();
  state = toggleSplit(state);
  state = openTab(state, { kind: 'file-list', path: '/left' });
  // move a second file-list tab into pane B so both panes show file-list tabs
  state = openTab(state, { kind: 'file-list', path: '/right' }, { forceNewTab: true });
  const rightTabId = state.panes[0].tabs[state.panes[0].tabs.length - 1].id;
  state = moveTabToOtherPane(state, rightTabId);
  state = focusTab(state, state.panes[0].id, state.panes[0].tabs[0].id);
  return state;
}

describe('buildTransferPlan', () => {
  it('returns null when the workspace is not split', () => {
    let state = createWorkspace();
    state = openTab(state, { kind: 'file-list', path: '/left' });
    const plan = buildTransferPlan(state, state.focusedPane, ['a.txt'], joinPath);
    expect(plan).toBeNull();
  });

  it('returns null when the opposite pane is not a file-list tab', () => {
    let state = createWorkspace();
    state = toggleSplit(state);
    state = openTab(state, { kind: 'file-list', path: '/left' });
    // pane B has no tabs at all
    const plan = buildTransferPlan(state, state.panes[0].id, ['a.txt'], joinPath);
    expect(plan).toBeNull();
  });

  it('returns null when there is no selection', () => {
    const state = twoPaneFixture();
    expect(buildTransferPlan(state, state.panes[0].id, [], joinPath)).toBeNull();
  });

  it('builds source/dest pairs from the focused pane to the opposite pane', () => {
    const state = twoPaneFixture();
    const plan = buildTransferPlan(state, state.panes[0].id, ['a.txt', 'b.txt'], joinPath)!;
    expect(plan).toEqual([
      { sourcePath: '/left/a.txt', destPath: '/right/a.txt' },
      { sourcePath: '/left/b.txt', destPath: '/right/b.txt' },
    ]);
  });

  it('works in the opposite direction when pane B is focused', () => {
    const state = twoPaneFixture();
    const plan = buildTransferPlan(state, state.panes[1]!.id, ['c.txt'], joinPath)!;
    expect(plan).toEqual([{ sourcePath: '/right/c.txt', destPath: '/left/c.txt' }]);
  });

  it('excludes an item whose destination equals the source path itself (self-target guard)', () => {
    let state = createWorkspace();
    state = toggleSplit(state);
    state = openTab(state, { kind: 'file-list', path: '/shared' });
    state = openTab(state, { kind: 'file-list', path: '/shared' }, { forceNewTab: true });
    const secondTabId = state.panes[0].tabs[state.panes[0].tabs.length - 1].id;
    state = moveTabToOtherPane(state, secondTabId);
    state = focusTab(state, state.panes[0].id, state.panes[0].tabs[0].id);

    const plan = buildTransferPlan(state, state.panes[0].id, ['a.txt'], joinPath);
    expect(plan).toBeNull(); // same dir on both sides -> every item is a self-target, nothing left to do
  });
});
