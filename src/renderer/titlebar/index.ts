import { renderTitlebar, type TitlebarActions } from './titlebar-view';
import { getWindowClient, getPlatform } from '../window-client';

export function mountTitlebar(container: HTMLElement, actions?: TitlebarActions): void {
  renderTitlebar(container, getWindowClient(), getPlatform(), actions);
}
