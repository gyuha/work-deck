// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { clampSplitRatio, wireSplitResize } from './split-resize';

describe('clampSplitRatio', () => {
  it('passes through a ratio within range', () => {
    expect(clampSplitRatio(0.5)).toBe(0.5);
  });

  it('clamps to the minimum share (15%)', () => {
    expect(clampSplitRatio(0.02)).toBe(0.15);
  });

  it('clamps to the maximum share (85%)', () => {
    expect(clampSplitRatio(0.99)).toBe(0.85);
  });
});

describe('wireSplitResize (DOM drag interaction)', () => {
  it('reports a new ratio proportional to the mouse delta over the container width', () => {
    const handle = document.createElement('div');
    const onResize = vi.fn();
    wireSplitResize(handle, { startRatio: 0.5, containerWidth: 1000, onResize });

    handle.dispatchEvent(new MouseEvent('mousedown', { clientX: 500, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 600, bubbles: true }));

    expect(onResize).toHaveBeenCalledWith(0.6); // 0.5 + (100/1000)
  });

  it('clamps while dragging past the limits', () => {
    const handle = document.createElement('div');
    const onResize = vi.fn();
    wireSplitResize(handle, { startRatio: 0.5, containerWidth: 1000, onResize });

    handle.dispatchEvent(new MouseEvent('mousedown', { clientX: 500, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 2000, bubbles: true }));

    expect(onResize).toHaveBeenCalledWith(0.85);
  });

  it('stops responding to mousemove after mouseup', () => {
    const handle = document.createElement('div');
    const onResize = vi.fn();
    wireSplitResize(handle, { startRatio: 0.5, containerWidth: 1000, onResize });

    handle.dispatchEvent(new MouseEvent('mousedown', { clientX: 500, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    onResize.mockClear();
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 700, bubbles: true }));

    expect(onResize).not.toHaveBeenCalled();
  });
});
