export interface WindowClient {
  minimize(): Promise<void>;
  maximize(): Promise<void>;
  unmaximize(): Promise<void>;
  close(): Promise<void>;
  isMaximized(): Promise<boolean>;
  onMaximizeChanged(cb: (payload: { isMaximized: boolean }) => void): () => void;
  onFocusChanged(cb: (payload: { focused: boolean }) => void): () => void;
}

export function getWindowClient(): WindowClient {
  return window.workdeck.window;
}

export function getPlatform(): string {
  return window.workdeck.platform;
}
