import { cp } from 'node:fs/promises';

// Preserve the relative imports emitted by TypeScript, including the original PNG.
// Resolve from this script, not the caller's working directory.
await cp(
  new URL('../src/assets/', import.meta.url),
  new URL('../dist/assets/', import.meta.url),
  { recursive: true }
);
