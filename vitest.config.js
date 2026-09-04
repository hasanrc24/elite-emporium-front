import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: { alias: { '@': path.resolve('.') } },
  test: { environment: 'jsdom', setupFiles: ['./tests/setup.js'] },
});
