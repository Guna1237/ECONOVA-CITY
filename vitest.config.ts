import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@econova/contracts": fromRoot("./packages/contracts/src/index.ts"),
      "@econova/game-content": fromRoot("./packages/game-content/src/index.ts"),
      "@econova/game-engine": fromRoot("./packages/game-engine/src/index.ts"),
      "@econova/server": fromRoot("./apps/server/src/index.ts")
    }
  },
  test: {
    environment: "node",
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts", "tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"]
    }
  }
});
