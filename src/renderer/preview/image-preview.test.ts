import { describe, expect, it } from 'vitest';
import { computeInitialZoom, zoomIn, zoomOut, fitToWindow, actualSize } from './image-preview';

describe('computeInitialZoom (docs/features/preview.md 3.3: 기본 표시)', () => {
  it('starts at actual size (100%) when the image fits within the viewport', () => {
    const state = computeInitialZoom(200, 100, 800, 600);
    expect(state).toEqual({ mode: 'actual', scale: 1 });
  });

  it('starts fit-to-window when the image is larger than the viewport', () => {
    const state = computeInitialZoom(1600, 1200, 800, 600);
    expect(state.mode).toBe('fit');
    expect(state.scale).toBeCloseTo(0.5); // limited by both width and height ratio (800/1600 = 600/1200 = 0.5)
  });

  it('fit scale is limited by the tighter of width/height ratios', () => {
    const state = computeInitialZoom(2000, 1000, 800, 600); // width ratio 0.4, height ratio 0.6
    expect(state.scale).toBeCloseTo(0.4);
  });
});

describe('zoomIn / zoomOut', () => {
  it('zoomIn increases scale and marks the mode as custom', () => {
    const next = zoomIn({ mode: 'actual', scale: 1 });
    expect(next.mode).toBe('custom');
    expect(next.scale).toBeGreaterThan(1);
  });

  it('zoomOut decreases scale and marks the mode as custom', () => {
    const next = zoomOut({ mode: 'actual', scale: 1 });
    expect(next.mode).toBe('custom');
    expect(next.scale).toBeLessThan(1);
  });
});

describe('fitToWindow / actualSize', () => {
  it('fitToWindow recomputes the fit scale for the given dimensions', () => {
    const state = fitToWindow(1600, 1200, 800, 600);
    expect(state).toEqual({ mode: 'fit', scale: 0.5 });
  });

  it('actualSize always returns 100%', () => {
    expect(actualSize()).toEqual({ mode: 'actual', scale: 1 });
  });
});
