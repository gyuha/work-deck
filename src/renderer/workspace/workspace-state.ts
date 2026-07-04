import { resolveOpen, type OpenTab, type TabTarget, type ResolveOpenOptions } from './tab-rules';

export interface Pane {
  id: string;
  tabs: OpenTab[];
  activeTabId?: string;
}

export interface WorkspaceState {
  panes: [Pane] | [Pane, Pane];
  focusedPane: string;
  splitActive: boolean;
  nextTabSeq: number;
  nextActivationSeq: number;
}

export function createWorkspace(): WorkspaceState {
  const pane: Pane = { id: 'A', tabs: [] };
  return { panes: [pane], focusedPane: 'A', splitActive: false, nextTabSeq: 1, nextActivationSeq: 1 };
}

function allTabs(state: WorkspaceState): OpenTab[] {
  return state.panes.flatMap((p) => p.tabs);
}

function withPane(state: WorkspaceState, paneId: string, update: (pane: Pane) => Pane): WorkspaceState {
  const panes = state.panes.map((p) => (p.id === paneId ? update(p) : p)) as WorkspaceState['panes'];
  return { ...state, panes };
}

export function openTab(state: WorkspaceState, target: TabTarget, options: ResolveOpenOptions = {}): WorkspaceState {
  const decision = resolveOpen(target, allTabs(state), options);
  if (decision.action === 'focus') {
    const owningPane = state.panes.find((p) => p.tabs.some((t) => t.id === decision.tabId));
    if (!owningPane) throw new Error('inconsistent state: focus target not found in any pane');
    return focusTab(state, owningPane.id, decision.tabId);
  }

  const newTab: OpenTab = { id: `tab-${state.nextTabSeq}`, target, lastActivatedAt: state.nextActivationSeq };
  const next = withPane(state, state.focusedPane, (pane) => ({
    ...pane,
    tabs: [...pane.tabs, newTab],
    activeTabId: newTab.id,
  }));
  return { ...next, nextTabSeq: state.nextTabSeq + 1, nextActivationSeq: state.nextActivationSeq + 1 };
}

export function focusTab(state: WorkspaceState, paneId: string, tabId: string): WorkspaceState {
  const seq = state.nextActivationSeq;
  const next = withPane(state, paneId, (pane) => ({
    ...pane,
    activeTabId: tabId,
    tabs: pane.tabs.map((t) => (t.id === tabId ? { ...t, lastActivatedAt: seq } : t)),
  }));
  return { ...next, focusedPane: paneId, nextActivationSeq: seq + 1 };
}

function maybeAutoUnsplit(state: WorkspaceState): WorkspaceState {
  if (!state.splitActive) return state;
  const [a, b] = state.panes as [Pane, Pane];
  if (a.tabs.length > 0 && b.tabs.length > 0) return state;
  const survivor = a.tabs.length > 0 ? a : b;
  return {
    ...state,
    panes: [{ id: 'A', tabs: survivor.tabs, activeTabId: survivor.activeTabId }],
    focusedPane: 'A',
    splitActive: false,
  };
}

export function closeTab(state: WorkspaceState, paneId: string, tabId: string): WorkspaceState {
  const next = withPane(state, paneId, (pane) => {
    const tabs = pane.tabs.filter((t) => t.id !== tabId);
    const activeTabId = pane.activeTabId === tabId ? tabs[tabs.length - 1]?.id : pane.activeTabId;
    return { ...pane, tabs, activeTabId };
  });
  return maybeAutoUnsplit(next);
}

export function toggleSplit(state: WorkspaceState): WorkspaceState {
  if (state.splitActive) {
    const [a, b] = state.panes as [Pane, Pane];
    return {
      ...state,
      panes: [{ id: 'A', tabs: [...a.tabs, ...b.tabs], activeTabId: a.activeTabId ?? b.activeTabId }],
      focusedPane: 'A',
      splitActive: false,
    };
  }
  const [a] = state.panes;
  return { ...state, panes: [a, { id: 'B', tabs: [] }], splitActive: true };
}

export function moveTabToOtherPane(state: WorkspaceState, tabId: string): WorkspaceState {
  if (!state.splitActive) return state;
  const [a, b] = state.panes as [Pane, Pane];
  const [source, dest] = a.tabs.some((t) => t.id === tabId) ? [a, b] : [b, a];
  const tab = source.tabs.find((t) => t.id === tabId);
  if (!tab) return state;

  const panes = state.panes.map((p) => {
    if (p.id === source.id) {
      const tabs = p.tabs.filter((t) => t.id !== tabId);
      return { ...p, tabs, activeTabId: p.activeTabId === tabId ? tabs[tabs.length - 1]?.id : p.activeTabId };
    }
    if (p.id === dest.id) {
      return { ...p, tabs: [...p.tabs, tab], activeTabId: tab.id };
    }
    return p;
  }) as WorkspaceState['panes'];

  return { ...state, panes, focusedPane: dest.id };
}
