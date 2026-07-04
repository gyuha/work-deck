import { describe, expect, it, vi } from 'vitest';
import { registerWindowHandlers, type WindowLike } from './ipc';
import { WINDOW_CHANNELS } from '../../shared/window-types';

function setup() {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const listeners = new Map<string, () => void>();
  const sent: Array<{ channel: string; payload: unknown }> = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double mirrors Electron's ipcMain.handle signature
  const ipcMain = { handle: vi.fn((channel: string, fn: (...a: any[]) => unknown) => handlers.set(channel, fn)) };
  const win: WindowLike = {
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    close: vi.fn(),
    isMaximized: vi.fn(() => false),
    webContents: { send: (channel: string, payload: unknown) => sent.push({ channel, payload }) },
    on: (event, listener) => listeners.set(event, listener),
  };
  registerWindowHandlers(ipcMain, win);
  return { handlers, win, listeners, sent };
}

describe('registerWindowHandlers', () => {
  it('forwards minimize/maximize/unmaximize/close to the window', async () => {
    const { handlers, win } = setup();
    await handlers.get(WINDOW_CHANNELS.minimize)!({});
    await handlers.get(WINDOW_CHANNELS.maximize)!({});
    await handlers.get(WINDOW_CHANNELS.unmaximize)!({});
    await handlers.get(WINDOW_CHANNELS.close)!({});

    expect(win.minimize).toHaveBeenCalled();
    expect(win.maximize).toHaveBeenCalled();
    expect(win.unmaximize).toHaveBeenCalled();
    expect(win.close).toHaveBeenCalled();
  });

  it('reports current maximized state via isMaximized', async () => {
    const { handlers } = setup();
    expect(await handlers.get(WINDOW_CHANNELS.isMaximized)!({})).toBe(false);
  });

  it('pushes maximize-changed and focus-changed events to the renderer', () => {
    const { listeners, sent } = setup();
    listeners.get('maximize')!();
    listeners.get('unmaximize')!();
    listeners.get('focus')!();
    listeners.get('blur')!();

    expect(sent).toEqual([
      { channel: WINDOW_CHANNELS.maximizeChanged, payload: { isMaximized: true } },
      { channel: WINDOW_CHANNELS.maximizeChanged, payload: { isMaximized: false } },
      { channel: WINDOW_CHANNELS.focusChanged, payload: { focused: true } },
      { channel: WINDOW_CHANNELS.focusChanged, payload: { focused: false } },
    ]);
  });
});
