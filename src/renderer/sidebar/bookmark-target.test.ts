import { describe, expect, it } from 'vitest';
import { bookmarkToTabTarget } from './bookmark-target';

describe('bookmarkToTabTarget (docs/features/bookmarks.md 1장: always a folder file-list tab)', () => {
  it('maps a local bookmark to a local file-list target', () => {
    expect(bookmarkToTabTarget({ id: '1', name: 'Projects', kind: 'local', path: '/home/user/projects' })).toEqual({
      kind: 'file-list',
      path: '/home/user/projects',
    });
  });

  it('maps a remote bookmark to a file-list target carrying its connection id', () => {
    expect(bookmarkToTabTarget({ id: '2', name: 'srv', kind: 'remote', path: '/var/www', connectionId: 'conn-1' })).toEqual({
      kind: 'file-list',
      path: '/var/www',
      connectionId: 'conn-1',
    });
  });
});
