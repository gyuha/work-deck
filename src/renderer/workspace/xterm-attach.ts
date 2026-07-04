export interface XtermLike {
  open(container: HTMLElement): void;
  write(data: string): void;
  onData(cb: (data: string) => void): { dispose(): void };
  dispose(): void;
}

export interface TerminalClient {
  write(id: string, data: string): void;
  resize(id: string, cols: number, rows: number): void;
  kill(id: string): void;
  onData(cb: (payload: { id: string; data: string }) => void): () => void;
  onStatusChanged(cb: (payload: { id: string; status: string }) => void): () => void;
}

const STATUS_BANNER: Record<string, string> = {
  exited: '\r\n[프로세스 종료됨]\r\n',
  disconnected: '\r\n[연결 끊김 — 재연결하려면 버튼을 누르세요]\r\n',
};

/** Wires a session (local or SSH — the renderer never distinguishes) to an xterm.js-like terminal. Returns a detach function. */
export function attachTerminal(container: HTMLElement, sessionId: string, client: TerminalClient, term: XtermLike): () => void {
  term.open(container);

  const unsubscribeData = client.onData(({ id, data }) => {
    if (id === sessionId) term.write(data);
  });

  const inputSubscription = term.onData((data) => client.write(sessionId, data));

  const unsubscribeStatus = client.onStatusChanged(({ id, status }) => {
    if (id !== sessionId) return;
    const banner = STATUS_BANNER[status];
    if (banner) term.write(banner);
  });

  return () => {
    unsubscribeData();
    inputSubscription.dispose();
    unsubscribeStatus();
    term.dispose();
  };
}
