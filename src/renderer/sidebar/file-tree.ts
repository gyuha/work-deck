import type { DirEntry } from '../../shared/filesystem-types';

export interface FileTreeFilesystem {
  listDirectory(path: string): Promise<DirEntry[]>;
}

export interface FileTreeDeps {
  filesystem: FileTreeFilesystem;
  joinPath: (dir: string, name: string) => string;
  onActivateFolder: (path: string) => void;
  onActivateFile: (path: string) => void;
}

export async function renderFileTreeRoot(container: HTMLElement, rootPath: string, deps: FileTreeDeps): Promise<void> {
  container.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'file-tree';
  container.appendChild(root);
  await renderLevel(root, rootPath, deps);
}

async function renderLevel(container: HTMLElement, dirPath: string, deps: FileTreeDeps): Promise<void> {
  const entries = await deps.filesystem.listDirectory(dirPath);
  for (const entry of entries) {
    if (entry.hidden) continue;
    const fullPath = deps.joinPath(dirPath, entry.name);
    const row = document.createElement('div');
    row.className = 'file-tree-row';
    row.dataset.path = fullPath;
    row.dataset.type = entry.type;

    const chevron = document.createElement('span');
    chevron.className = 'codicon codicon-chevron-right file-tree-chevron';
    chevron.style.visibility = entry.type === 'directory' ? 'visible' : 'hidden';

    const icon = document.createElement('span');
    icon.className = `codicon ${entry.type === 'directory' ? 'codicon-folder' : 'codicon-file'} file-tree-icon`;

    const label = document.createElement('span');
    label.className = 'file-tree-label';
    label.textContent = entry.name;

    row.append(chevron, icon, label);
    container.appendChild(row);

    if (entry.type === 'directory') {
      const children = document.createElement('div');
      children.className = 'file-tree-children';
      children.style.display = 'none';
      container.appendChild(children);

      let expanded = false;
      row.addEventListener('click', () => {
        deps.onActivateFolder(fullPath);
        expanded = !expanded;
        chevron.classList.toggle('codicon-chevron-right', !expanded);
        chevron.classList.toggle('codicon-chevron-down', expanded);
        children.style.display = expanded ? 'block' : 'none';
        if (expanded && children.childElementCount === 0) {
          void renderLevel(children, fullPath, deps);
        }
      });
    } else {
      row.addEventListener('click', () => deps.onActivateFile(fullPath));
    }
  }
}
