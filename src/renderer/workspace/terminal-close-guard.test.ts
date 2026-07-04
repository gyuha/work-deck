// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { needsCloseConfirmation, wireTerminalCloseButton } from './terminal-close-guard';

describe('needsCloseConfirmation (docs/features/terminal.md 5.1)', () => {
  it('never confirms when the session is not active (exited/disconnected)', () => {
    expect(needsCloseConfirmation('local', 'exited', true)).toBe(false);
    expect(needsCloseConfirmation('ssh', 'disconnected', true)).toBe(false);
  });

  it('confirms any active SSH session regardless of idle/busy', () => {
    expect(needsCloseConfirmation('ssh', 'active', false)).toBe(true);
    expect(needsCloseConfirmation('ssh', 'active', true)).toBe(true);
  });

  it('confirms an active local session only when a child process is running (busy)', () => {
    expect(needsCloseConfirmation('local', 'active', false)).toBe(false);
    expect(needsCloseConfirmation('local', 'active', true)).toBe(true);
  });
});

describe('wireTerminalCloseButton (DOM integration)', () => {
  it('asks for confirmation before closing when the guard says so', () => {
    const button = document.createElement('button');
    const onClose = vi.fn();
    const confirm = vi.fn().mockReturnValue(true);
    wireTerminalCloseButton(button, { needsConfirmation: () => true, confirm, onClose });

    button.click();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when the user declines the confirmation', () => {
    const button = document.createElement('button');
    const onClose = vi.fn();
    const confirm = vi.fn().mockReturnValue(false);
    wireTerminalCloseButton(button, { needsConfirmation: () => true, confirm, onClose });

    button.click();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes immediately without confirmation when the guard says none is needed', () => {
    const button = document.createElement('button');
    const onClose = vi.fn();
    const confirm = vi.fn();
    wireTerminalCloseButton(button, { needsConfirmation: () => false, confirm, onClose });

    button.click();

    expect(confirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
