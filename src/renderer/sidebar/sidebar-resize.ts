export interface ResizeLimits {
  min: number;
  max: number;
}

export function clampSidebarWidth(width: number, limits: ResizeLimits): number {
  return Math.min(Math.max(width, limits.min), limits.max);
}

export interface SidebarResizeOptions {
  startWidth: number;
  limits: ResizeLimits;
  onResize: (width: number) => void;
}

/** docs/02-ui-layout.md 1장: 사이드바 너비를 드래그로 조절. */
export function wireSidebarResize(handle: HTMLElement, options: SidebarResizeOptions): void {
  handle.addEventListener('mousedown', (downEvent) => {
    const startX = (downEvent as MouseEvent).clientX;

    function onMouseMove(moveEvent: MouseEvent): void {
      const delta = moveEvent.clientX - startX;
      options.onResize(clampSidebarWidth(options.startWidth + delta, options.limits));
    }

    function onMouseUp(): void {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });
}
