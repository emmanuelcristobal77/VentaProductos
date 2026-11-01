import path from "node:path";
import { defineConfig } from "vitest/config";

const alias = { "@": path.resolve(import.meta.dirname, "src") };

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: { name: "unit", environment: "node", include: ["tests/unit/**/*.test.ts"] },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts", "tests/concurrency/**/*.test.ts"],
          pool: "forks",
        },
      },
    ],
  },
});
