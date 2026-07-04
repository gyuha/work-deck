import { describe, expect, it } from 'vitest';
import { createLocalSession } from './local-session';

describe('createLocalSession (node-pty)', () => {
  it('starts active, delivers written input back through onData, and exits on kill', async () => {
    const session = createLocalSession({ cwd: process.cwd(), shell: '/bin/cat' });
    expect(session.status).toBe('active');

    const received = await new Promise<string>((resolve) => {
      let buffer = '';
      session.onData((chunk) => {
        buffer += chunk;
        if (buffer.includes('hello-pty')) resolve(buffer);
      });
      session.write('hello-pty\r');
    });

    expect(received).toContain('hello-pty');

    const exited = new Promise<void>((resolve) => session.onExit(() => resolve()));
    session.kill();
    await exited;
    expect(session.status).toBe('exited');
  });
});
