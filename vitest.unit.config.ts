/// <reference types="vitest/config" />

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 10_000,
    include: ["tests/unit/**/*.test.ts"],
  },
});
