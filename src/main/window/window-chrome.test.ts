import { describe, expect, it } from 'vitest';
import { getWindowChromeConfig } from './window-chrome';

describe('getWindowChromeConfig', () => {
  it('keeps the native inset title bar (traffic lights) on macOS', () => {
    expect(getWindowChromeConfig('darwin')).toEqual({ titleBarStyle: 'hiddenInset' });
  });

  it('goes fully frameless on Windows', () => {
    expect(getWindowChromeConfig('win32')).toEqual({ frame: false });
  });

  it('goes fully frameless on Linux', () => {
    expect(getWindowChromeConfig('linux')).toEqual({ frame: false });
  });
});
