import { maximizeIconName } from './maximize-icon';
import type { WindowClient } from '../window-client';

export interface TitlebarActions {
  onToggleSplit(): void;
}

function titlebarButton(icon: string, onClick: () => void, extraClass = ''): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = `titlebar-button ${extraClass}`.trim();
  button.innerHTML = `<span class="codicon ${icon}"></span>`;
  button.addEventListener('click', onClick);
  return button;
}

/** ADR-0003: mac keeps native traffic lights (no custom buttons here); win/linux draw their own. */
export function renderTitlebar(container: HTMLElement, client: WindowClient, platform: string, actions?: TitlebarActions): void {
  container.classList.add('titlebar');

  const dragRegion = document.createElement('div');
  dragRegion.className = 'titlebar-drag-region';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'titlebar-search-input';
  searchInput.placeholder = 'WorkDeck';
  dragRegion.appendChild(searchInput);
  container.appendChild(dragRegion);

  if (actions) {
    const actionsGroup = document.createElement('div');
    actionsGroup.className = 'titlebar-actions';
    const splitButton = titlebarButton('codicon-split-horizontal', () => actions.onToggleSplit());
    splitButton.title = '분할 토글 (Cmd+\\)';
    actionsGroup.appendChild(splitButton);
    container.appendChild(actionsGroup);
  }

  if (platform !== 'darwin') {
    let isMaximized = false;

    const minimizeButton = titlebarButton('codicon-chrome-minimize', () => client.minimize());
    const maximizeButton = titlebarButton(maximizeIconName(false), () => (isMaximized ? client.unmaximize() : client.maximize()));
    const closeButton = titlebarButton('codicon-chrome-close', () => client.close(), 'titlebar-button-close');

    function syncMaximizeIcon(): void {
      const icon = maximizeButton.querySelector('.codicon') as HTMLElement;
      icon.className = `codicon ${maximizeIconName(isMaximized)}`;
    }

    void client.isMaximized().then((value) => {
      isMaximized = value;
      syncMaximizeIcon();
    });
    client.onMaximizeChanged((payload) => {
      isMaximized = payload.isMaximized;
      syncMaximizeIcon();
    });

    const controls = document.createElement('div');
    controls.className = 'titlebar-controls';
    controls.append(minimizeButton, maximizeButton, closeButton);
    container.appendChild(controls);
  }

  client.onFocusChanged(({ focused }) => {
    container.classList.toggle('titlebar-inactive', !focused);
  });
}
