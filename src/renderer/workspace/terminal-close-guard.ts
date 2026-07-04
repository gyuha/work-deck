import type { SessionStatus } from '../../shared/terminal-types';

export type TerminalKind = 'local' | 'ssh';

/** docs/features/terminal.md 5.1: confirm only for an active session — always for SSH, only when busy for local. */
export function needsCloseConfirmation(kind: TerminalKind, status: SessionStatus, isBusy: boolean): boolean {
  if (status !== 'active') return false;
  return kind === 'ssh' || isBusy;
}

export interface TerminalCloseDeps {
  needsConfirmation: () => boolean;
  confirm: () => boolean;
  onClose: () => void;
}

export function wireTerminalCloseButton(button: HTMLElement, deps: TerminalCloseDeps): void {
  button.addEventListener('click', () => {
    if (deps.needsConfirmation() && !deps.confirm()) return;
    deps.onClose();
  });
}
