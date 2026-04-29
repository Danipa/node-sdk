import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/webhook.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  // No bundling deps — the SDK depends only on Node's stdlib (`crypto`,
  // global `fetch`). Keeping zero runtime deps means consumers can
  // `npm install @danipa/sdk` without dragging in a tree.
  external: [],
  target: 'node20',
});
