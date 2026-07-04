export type ZoomMode = 'fit' | 'actual' | 'custom';

export interface ImageViewState {
  mode: ZoomMode;
  scale: number;
}

const ZOOM_STEP = 1.25;

function computeFitScale(imageWidth: number, imageHeight: number, viewportWidth: number, viewportHeight: number): number {
  return Math.min(viewportWidth / imageWidth, viewportHeight / imageHeight);
}

/** docs/features/preview.md 3.3: fit-to-window if the image is larger than the viewport, else 100%. */
export function computeInitialZoom(imageWidth: number, imageHeight: number, viewportWidth: number, viewportHeight: number): ImageViewState {
  if (imageWidth <= viewportWidth && imageHeight <= viewportHeight) return actualSize();
  return fitToWindow(imageWidth, imageHeight, viewportWidth, viewportHeight);
}

export function zoomIn(state: ImageViewState): ImageViewState {
  return { mode: 'custom', scale: state.scale * ZOOM_STEP };
}

export function zoomOut(state: ImageViewState): ImageViewState {
  return { mode: 'custom', scale: state.scale / ZOOM_STEP };
}

export function fitToWindow(imageWidth: number, imageHeight: number, viewportWidth: number, viewportHeight: number): ImageViewState {
  return { mode: 'fit', scale: computeFitScale(imageWidth, imageHeight, viewportWidth, viewportHeight) };
}

export function actualSize(): ImageViewState {
  return { mode: 'actual', scale: 1 };
}
