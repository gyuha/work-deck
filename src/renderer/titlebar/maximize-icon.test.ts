import { describe, expect, it } from 'vitest';
import { maximizeIconName } from './maximize-icon';

describe('maximizeIconName', () => {
  it('shows the maximize glyph when the window is not maximized', () => {
    expect(maximizeIconName(false)).toBe('codicon-chrome-maximize');
  });

  it('shows the restore glyph when the window is maximized', () => {
    expect(maximizeIconName(true)).toBe('codicon-chrome-restore');
  });
});
