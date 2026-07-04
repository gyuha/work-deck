export function clampSplitRatio(ratio: number): number {
  return Math.min(Math.max(ratio, 0.15), 0.85);
}

export interface SplitResizeOptions {
  startRatio: number;
  containerWidth: number;
  onResize: (ratio: number) => void;
}

/** docs/02-ui-layout.md 4장: 분할 경계선을 드래그해 좌우 비율을 조절. */
export function wireSplitResize(handle: HTMLElement, options: SplitResizeOptions): void {
  handle.addEventListener('mousedown', (downEvent) => {
    const startX = (downEvent as MouseEvent).clientX;

    function onMouseMove(moveEvent: MouseEvent): void {
      const deltaRatio = (moveEvent.clientX - startX) / options.containerWidth;
      options.onResize(clampSplitRatio(options.startRatio + deltaRatio));
    }

    function onMouseUp(): void {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });
}
