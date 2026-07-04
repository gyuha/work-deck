// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { mountWorkspace } from './index';

describe('remote file-list tab dedup (docs/02-ui-layout.md 3장: connection + normalized path)', () => {
  it('focuses the existing tab when the same connection + path is opened again', () => {
    const workspace = mountWorkspace(document.createElement('div'));

    workspace.openTab({ kind: 'file-list', path: '/srv/www', connectionId: 'conn-1' });
    workspace.openTab({ kind: 'file-list', path: '/srv/www', connectionId: 'conn-1' });

    expect(workspace.getState().panes[0].tabs).toHaveLength(1);
  });

  it('treats the same path on a different connection as a different tab', () => {
    const workspace = mountWorkspace(document.createElement('div'));

    workspace.openTab({ kind: 'file-list', path: '/srv/www', connectionId: 'conn-1' });
    workspace.openTab({ kind: 'file-list', path: '/srv/www', connectionId: 'conn-2' });

    expect(workspace.getState().panes[0].tabs).toHaveLength(2);
  });

  it('treats a remote file-list tab and a local one at the same path as different tabs', () => {
    const workspace = mountWorkspace(document.createElement('div'));

    workspace.openTab({ kind: 'file-list', path: '/srv/www' });
    workspace.openTab({ kind: 'file-list', path: '/srv/www', connectionId: 'conn-1' });

    expect(workspace.getState().panes[0].tabs).toHaveLength(2);
  });
});
