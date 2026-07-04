import type { Pane, WorkspaceState } from './workspace-state';

export interface TransferPlanItem {
  sourcePath: string;
  destPath: string;
  sourceConnectionId?: string;
  destConnectionId?: string;
}

function activeTabOf(pane: Pane) {
  return pane.tabs.find((t) => t.id === pane.activeTabId);
}

// "원본=대상 가드" (docs/features/file-manager.md 2장): destPath가 sourcePath 자신이거나
// 그 하위 경로면 자기 자신에게 복사/이동(자기 덮어쓰기·무한 재귀)이 되므로 제외한다.
function isSelfTarget(destPath: string, sourcePath: string): boolean {
  return destPath === sourcePath || destPath.startsWith(`${sourcePath}/`);
}

export function buildTransferPlan(
  state: WorkspaceState,
  focusedPaneId: string,
  selectedNames: string[],
  joinPath: (dir: string, name: string) => string,
): TransferPlanItem[] | null {
  if (!state.splitActive || selectedNames.length === 0) return null;

  const [paneA, paneB] = state.panes as [Pane, Pane];
  const sourcePane = focusedPaneId === paneA.id ? paneA : paneB;
  const destPane = focusedPaneId === paneA.id ? paneB : paneA;

  const sourceTab = activeTabOf(sourcePane);
  const destTab = activeTabOf(destPane);
  if (!sourceTab || !destTab || sourceTab.target.kind !== 'file-list' || destTab.target.kind !== 'file-list') {
    return null;
  }

  const sourceDir = sourceTab.target.path;
  const destDir = destTab.target.path;
  const sourceConnectionId = sourceTab.target.connectionId;
  const destConnectionId = destTab.target.connectionId;
  const sameFilesystem = sourceConnectionId === destConnectionId;

  const items = selectedNames
    .map((name) => ({
      sourcePath: joinPath(sourceDir, name),
      destPath: joinPath(destDir, name),
      sourceConnectionId,
      destConnectionId,
    }))
    // The self-target guard only means anything when comparing paths within the same filesystem.
    .filter((item) => !sameFilesystem || !isSelfTarget(item.destPath, item.sourcePath));

  return items.length > 0 ? items : null;
}
