export type WindowChromeConfig = { titleBarStyle: 'hiddenInset' } | { frame: false };

/** ADR-0003: mac keeps the native inset title bar (traffic lights); other platforms go fully frameless. */
export function getWindowChromeConfig(platform: NodeJS.Platform): WindowChromeConfig {
  return platform === 'darwin' ? { titleBarStyle: 'hiddenInset' } : { frame: false };
}
