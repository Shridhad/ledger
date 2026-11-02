import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  functions: {
    mcp: {
      name: "ledger mcp",
      source: "mcp/index.ts",
    },
  },
  preview: {
    realtime: {
      allowedOrigins: [
        "http://localhost:4567",
        "http://localhost:4570",
        "https://ledger-mocha-nine.vercel.app",
        "https://ledger-rollup.vercel.app",
      ],
    },
  },
});
