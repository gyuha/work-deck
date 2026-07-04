// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderTitlebar } from './titlebar-view';
import type { WindowClient } from '../window-client';

function fakeClient(): WindowClient {
  const maximizeChangedListeners: Array<(p: { isMaximized: boolean }) => void> = [];
  const focusChangedListeners: Array<(p: { focused: boolean }) => void> = [];
  return {
    minimize: vi.fn(async () => {}),
    maximize: vi.fn(async () => {}),
    unmaximize: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    isMaximized: vi.fn(async () => false),
    onMaximizeChanged: (cb: (p: { isMaximized: boolean }) => void) => {
      maximizeChangedListeners.push(cb);
      return () => {};
    },
    onFocusChanged: (cb: (p: { focused: boolean }) => void) => {
      focusChangedListeners.push(cb);
      return () => {};
    },
    // test-only escape hatches to fire the subscribed callbacks
    __fireMaximizeChanged: (p: { isMaximized: boolean }) => maximizeChangedListeners.forEach((l) => l(p)),
    __fireFocusChanged: (p: { focused: boolean }) => focusChangedListeners.forEach((l) => l(p)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double augmented with fire helpers
  } as any;
}

describe('renderTitlebar', () => {
  it('shows a search input and no custom controls on macOS (native traffic lights)', () => {
    const container = document.createElement('div');
    renderTitlebar(container, fakeClient(), 'darwin');

    expect((container.querySelector('.titlebar-search-input') as HTMLInputElement)?.placeholder).toBe('WorkDeck');
    expect(container.querySelector('.titlebar-controls')).toBeNull();
  });

  it('renders minimize/maximize/close buttons on win32', () => {
    const container = document.createElement('div');
    renderTitlebar(container, fakeClient(), 'win32');

    const controls = container.querySelector('.titlebar-controls');
    expect(controls?.querySelectorAll('.titlebar-button').length).toBe(3);
    expect(controls?.querySelector('.codicon-chrome-minimize')).not.toBeNull();
    expect(controls?.querySelector('.codicon-chrome-maximize')).not.toBeNull();
    expect(controls?.querySelector('.codicon-chrome-close')).not.toBeNull();
  });

  it('wires the minimize and close buttons to the window client', () => {
    const container = document.createElement('div');
    const client = fakeClient();
    renderTitlebar(container, client, 'win32');

    (container.querySelector('.codicon-chrome-minimize')!.closest('button') as HTMLButtonElement).click();
    (container.querySelector('.codicon-chrome-close')!.closest('button') as HTMLButtonElement).click();

    expect(client.minimize).toHaveBeenCalled();
    expect(client.close).toHaveBeenCalled();
  });

  it('toggles maximize/unmaximize based on tracked state and updates the icon on maximize-changed', () => {
    const container = document.createElement('div');
    const client = fakeClient();
    renderTitlebar(container, client, 'win32');

    const maximizeButton = container.querySelector('.codicon-chrome-maximize')!.closest('button') as HTMLButtonElement;
    maximizeButton.click();
    expect(client.maximize).toHaveBeenCalledTimes(1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only fire helper
    (client as any).__fireMaximizeChanged({ isMaximized: true });
    expect(container.querySelector('.codicon-chrome-restore')).not.toBeNull();

    (container.querySelector('.codicon-chrome-restore')!.closest('button') as HTMLButtonElement).click();
    expect(client.unmaximize).toHaveBeenCalledTimes(1);
  });

  it('renders a split-toggle action button and wires it to the given callback', () => {
    const container = document.createElement('div');
    const onToggleSplit = vi.fn();
    renderTitlebar(container, fakeClient(), 'darwin', { onToggleSplit });

    const splitButton = container.querySelector('.codicon-split-horizontal')?.closest('button') as HTMLButtonElement;
    expect(splitButton).not.toBeNull();
    splitButton.click();
    expect(onToggleSplit).toHaveBeenCalledTimes(1);
  });

  it('omits the split-toggle action button when no actions are given', () => {
    const container = document.createElement('div');
    renderTitlebar(container, fakeClient(), 'darwin');

    expect(container.querySelector('.titlebar-actions')).toBeNull();
  });

  it('dims the titlebar when the window loses focus, and undims when it regains focus', () => {
    const container = document.createElement('div');
    const client = fakeClient();
    renderTitlebar(container, client, 'win32');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only fire helper
    (client as any).__fireFocusChanged({ focused: false });
    expect(container.classList.contains('titlebar-inactive')).toBe(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only fire helper
    (client as any).__fireFocusChanged({ focused: true });
    expect(container.classList.contains('titlebar-inactive')).toBe(false);
  });
});
