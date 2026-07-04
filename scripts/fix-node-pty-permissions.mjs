// node-pty's npm-published prebuilds sometimes lose their executable bit in transit,
// which makes posix_spawnp fail at runtime ("Unable to request a pseudo-terminal").
// Restore it after every install so local terminals keep working.
import { chmodSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const prebuildsDir = path.join('node_modules', 'node-pty', 'prebuilds');
if (existsSync(prebuildsDir)) {
  for (const platformDir of readdirSync(prebuildsDir)) {
    const helper = path.join(prebuildsDir, platformDir, 'spawn-helper');
    if (existsSync(helper)) chmodSync(helper, 0o755);
  }
}
