import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import type { Client, ClientChannel } from 'ssh2';
import type { SessionStatus, TerminalSession } from './session';

export function createSshSession(client: Client, shell: ClientChannel): TerminalSession {
  const emitter = new EventEmitter();
  let status: SessionStatus = 'active';

  shell.on('data', (data: Buffer) => emitter.emit('data', data.toString('utf-8')));

  shell.on('exit', (exitCode: number | null) => {
    status = 'exited';
    emitter.emit('exit', { exitCode: exitCode ?? undefined });
  });

  const onUnexpectedClose = (): void => {
    if (status === 'active') {
      status = 'disconnected';
      emitter.emit('disconnect');
    }
  };
  client.on('close', onUnexpectedClose);
  client.on('error', onUnexpectedClose);

  return {
    id: randomUUID(),
    kind: 'ssh',
    get status() {
      return status;
    },
    write: (data) => {
      shell.write(data);
    },
    resize: (cols, rows) => {
      shell.setWindow(rows, cols, 0, 0);
    },
    kill: () => {
      shell.end();
      client.end();
    },
    onData: (cb) => {
      emitter.on('data', cb);
      return () => emitter.off('data', cb);
    },
    onExit: (cb) => {
      emitter.on('exit', cb);
      return () => emitter.off('exit', cb);
    },
    onDisconnect: (cb) => {
      emitter.on('disconnect', cb);
      return () => emitter.off('disconnect', cb);
    },
  };
}
