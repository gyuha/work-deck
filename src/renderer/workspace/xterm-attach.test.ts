// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { attachTerminal, type TerminalClient, type XtermLike } from './xterm-attach';

function fakeXterm(): XtermLike & { written: string[] } {
  const written: string[] = [];
  let dataHandler: ((data: string) => void) | undefined;
  return {
    written,
    open: vi.fn(),
    write: (data: string) => written.push(data),
    onData: (cb: (data: string) => void) => {
      dataHandler = cb;
      return { dispose: vi.fn() };
    },
    dispose: vi.fn(),
    // test-only trigger for simulating user keystrokes
    _emitUserInput: (data: string) => dataHandler?.(data),
  } as unknown as XtermLike & { written: string[]; _emitUserInput: (data: string) => void };
}

function fakeClient(): TerminalClient & { emitData: (id: string, data: string) => void; emitStatus: (id: string, status: string) => void } {
  const dataHandlers = new Set<(p: { id: string; data: string }) => void>();
  const statusHandlers = new Set<(p: { id: string; status: string }) => void>();
  return {
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
    onData: (cb) => {
      dataHandlers.add(cb);
      return () => dataHandlers.delete(cb);
    },
    onStatusChanged: (cb) => {
      statusHandlers.add(cb);
      return () => statusHandlers.delete(cb);
    },
    emitData: (id, data) => dataHandlers.forEach((cb) => cb({ id, data })),
    emitStatus: (id, status) => statusHandlers.forEach((cb) => cb({ id, status })),
  };
}

describe('attachTerminal', () => {
  it('writes incoming session data for the matching id only', () => {
    const term = fakeXterm();
    const client = fakeClient();
    attachTerminal(document.createElement('div'), 'session-1', client, term);

    client.emitData('session-1', 'hello');
    client.emitData('other-session', 'ignored');

    expect(term.written).toEqual(['hello']);
  });

  it('forwards user keystrokes from the terminal to the session', () => {
    const term = fakeXterm() as ReturnType<typeof fakeXterm> & { _emitUserInput: (d: string) => void };
    const client = fakeClient();
    attachTerminal(document.createElement('div'), 'session-1', client, term);

    term._emitUserInput('ls\r');

    expect(client.write).toHaveBeenCalledWith('session-1', 'ls\r');
  });

  it('prints a status banner when the session exits or disconnects', () => {
    const term = fakeXterm();
    const client = fakeClient();
    attachTerminal(document.createElement('div'), 'session-1', client, term);

    client.emitStatus('session-1', 'exited');
    client.emitStatus('session-1', 'disconnected');
    client.emitStatus('other-session', 'exited');

    expect(term.written).toHaveLength(2);
  });

  it('detach() unsubscribes from further session events', () => {
    const term = fakeXterm();
    const client = fakeClient();
    const detach = attachTerminal(document.createElement('div'), 'session-1', client, term);

    detach();
    client.emitData('session-1', 'after-detach');

    expect(term.written).toEqual([]);
    expect(term.dispose).toHaveBeenCalled();
  });
});
