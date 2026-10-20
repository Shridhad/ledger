import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  functions: {
    mcp: {
      name: "ledger mcp",
      source: "functions/mcp/index.ts",
    },
  },
});
