export type SessionStatus = 'connecting' | 'active' | 'exited' | 'disconnected';

export const TERMINAL_CHANNELS = {
  createLocal: 'terminal:create-local',
  createSsh: 'terminal:create-ssh',
  write: 'terminal:write',
  resize: 'terminal:resize',
  kill: 'terminal:kill',
  reconnect: 'terminal:reconnect',
  isBusy: 'terminal:is-busy',
  data: 'terminal:data',
  statusChanged: 'terminal:status-changed',
} as const;
