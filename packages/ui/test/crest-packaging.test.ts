import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const original = readFileSync(resolve(root, 'packages/ui/src/assets/econova-crest.png'));
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

// Artifact regression: run the UI build first, as production consumers use dist.
it('ships the original crest beside the emitted package modules', () => {
  const asset = resolve(root, 'packages/ui/dist/assets/econova-crest.png');
  expect(existsSync(asset), 'UI build must ship dist/assets/econova-crest.png').toBe(true);
  expect(digest(readFileSync(asset))).toBe(digest(original));
});

it.each(['player', 'projector', 'admin'])('%s Vite serves source and built crest imports with the original PNG', async app => {
  const appRoot = resolve(root, 'apps', app);
  const server = await createServer({
    root: appRoot,
    configFile: resolve(appRoot, 'vite.config.ts'),
    logLevel: 'silent',
    cacheDir: resolve(root, 'node_modules/.vite-test-cache', app),
    optimizeDeps: { noDiscovery: true },
    server: { host: '127.0.0.1', port: 0, open: false }
  });
  try {
    await server.listen();
    const address = server.httpServer!.address();
    if (!address || typeof address === 'string') throw Error('Missing Vite test address');
    const base = `http://127.0.0.1:${address.port}`;

    const mainRes = await fetch(`${base}/src/main.tsx`);
    expect(mainRes.status).toBe(200);
    await mainRes.arrayBuffer();

    for (const entry of ['src/marks/Crest.tsx', 'dist/marks/Crest.js']) {
      const path = resolve(root, 'packages/ui', entry).replaceAll('\\\\', '/');
      const response = await fetch(`${base}/@fs/${path}`);
      expect(response.status, `${app}: ${entry} import analysis`).toBe(200);
      const transformed = await response.text();
      const importedAsset = transformed.match(/from\s+["']([^"']*econova-crest\.png\?import[^"']*)["']/)?.[1];
      expect(importedAsset, `${entry} must resolve its actual crest import`).toBeDefined();

      const assetModule = await fetch(new URL(importedAsset!, base));
      expect(assetModule.status).toBe(200);
      const assetUrl = (await assetModule.text()).match(/export default\s+["']([^"']+)["']/)?.[1];
      expect(assetUrl).toBeDefined();

      const png = await fetch(new URL(assetUrl!, base));
      expect(png.status).toBe(200);
      expect(digest(new Uint8Array(await png.arrayBuffer()))).toBe(digest(original));
    }
  } finally {
    (server.httpServer as any)?.closeAllConnections?.();
    await server.close();
  }
}, 30_000);
