import { describe, expect, it } from 'vitest';
import { createLocalSession } from './local-session';

async function waitUntil(predicate: () => boolean, timeoutMs = 4000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error('timed out waiting for condition');
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

describe('LocalTerminalSession.isBusy', () => {
  it('is false at the idle shell prompt and true while a child command runs', async () => {
    const session = createLocalSession({ cwd: process.cwd(), shell: '/bin/bash' });
    // Let the shell finish starting up before asserting the idle baseline.
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(session.isBusy()).toBe(false);

    session.write('sleep 5\n');
    await waitUntil(() => session.isBusy());

    session.kill();
  });
});
