import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  functions: {
    mcp: {
      name: "ledger mcp",
      source: "mcp/index.ts",
    },
  },
});
