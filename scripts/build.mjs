import { build } from 'esbuild';
import { cpSync, mkdirSync } from 'node:fs';

const common = {
  bundle: true,
  sourcemap: true,
  logLevel: 'info',
};

// Main/preload run from node_modules at runtime (electron .), so node_modules stay external —
// bundling them would drag in native .node addons (ssh2/node-pty) esbuild cannot handle.
await build({
  ...common,
  entryPoints: ['src/main/index.ts'],
  outfile: 'dist/main/index.js',
  platform: 'node',
  format: 'cjs',
  packages: 'external',
});

await build({
  ...common,
  entryPoints: ['src/preload/index.ts'],
  outfile: 'dist/preload/index.js',
  platform: 'node',
  format: 'cjs',
  packages: 'external',
});

await build({
  ...common,
  entryPoints: ['src/renderer/index.ts'],
  outfile: 'dist/renderer/index.js',
  platform: 'browser',
  format: 'iife',
});

await build({
  ...common,
  entryPoints: ['src/renderer/styles/index.css'],
  outfile: 'dist/renderer/index.css',
  loader: { '.ttf': 'dataurl' },
});

mkdirSync('dist/renderer', { recursive: true });
cpSync('src/renderer/index.html', 'dist/renderer/index.html');
