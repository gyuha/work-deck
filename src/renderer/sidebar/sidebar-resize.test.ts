// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { clampSidebarWidth, wireSidebarResize, type ResizeLimits } from './sidebar-resize';

const limits: ResizeLimits = { min: 170, max: 500 };

describe('clampSidebarWidth', () => {
  it('passes through a width within range', () => {
    expect(clampSidebarWidth(240, limits)).toBe(240);
  });

  it('clamps to the minimum', () => {
    expect(clampSidebarWidth(50, limits)).toBe(170);
  });

  it('clamps to the maximum', () => {
    expect(clampSidebarWidth(9999, limits)).toBe(500);
  });
});

describe('wireSidebarResize (DOM drag interaction)', () => {
  it('resizes the sidebar as the mouse moves after mousedown on the handle', () => {
    const handle = document.createElement('div');
    const onResize = vi.fn();
    wireSidebarResize(handle, { startWidth: 240, limits, onResize });

    handle.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, bubbles: true }));

    expect(onResize).toHaveBeenCalledWith(290); // 240 + (150 - 100)
  });

  it('clamps while dragging past the limits', () => {
    const handle = document.createElement('div');
    const onResize = vi.fn();
    wireSidebarResize(handle, { startWidth: 240, limits, onResize });

    handle.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 1000, bubbles: true }));

    expect(onResize).toHaveBeenCalledWith(500);
  });

  it('stops responding to mousemove after mouseup', () => {
    const handle = document.createElement('div');
    const onResize = vi.fn();
    wireSidebarResize(handle, { startWidth: 240, limits, onResize });

    handle.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    onResize.mockClear();
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 300, bubbles: true }));

    expect(onResize).not.toHaveBeenCalled();
  });
});
