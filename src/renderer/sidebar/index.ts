import { renderSidebar, type SidebarController } from './sidebar-view';

export function mountSidebar(container: HTMLElement): SidebarController {
  container.dataset.role = 'sidebar';
  return renderSidebar(container);
}
