import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  test: {
    testTimeout: 15_000,
    env: {
      AI_CHAT_FORCE_MEMORY: "1",
    },
  },
});
