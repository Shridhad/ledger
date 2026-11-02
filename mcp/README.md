# Ledger MCP

MCP server on **Neon Functions** (Streamable HTTP). Same Neon Auth OAuth Provider as Ledger/Rollup. Agents sign in as the user, then call tools against the same `tasks` table (`../ledger/src/db/schema`).

Live: https://br-steep-sun-b5lukx3v-mcp.compute.c-7.us-east-2.aws.neon.tech/mcp  
Workspace: [root README](../README.md)

## Tools

| Tool | Purpose |
|---|---|
| `whoami` | Signed-in user id |
| `list_tasks` | List tasks (`status`, `query`, `limit`) |
| `create_task` | New task |
| `update_task` | Patch fields |
| `complete_task` | Mark shipped |

Auth: `@neon/oauth/mcp` (`createMcpAuth`, `withAuth`). Resource identifier is `MCP_RESOURCE` (this function’s URL).

## Cursor

Add a streamable HTTP server named **Ledger**:

```json
{
  "mcpServers": {
    "Ledger": {
      "url": "https://br-steep-sun-b5lukx3v-mcp.compute.c-7.us-east-2.aws.neon.tech/mcp"
    }
  }
}
```

Login/consent are Ledger’s hosted pages. After you approve, try:

- Who am I?
- List my open tasks
- Create a p1 task titled “Write the demo README”

## Deploy

From the **repo root** (`neon.ts` points at `mcp/index.ts`):

```bash
npm run mcp:deploy -- --env MCP_RESOURCE=https://br-steep-sun-b5lukx3v-mcp.compute.c-7.us-east-2.aws.neon.tech/mcp
```

Needs `DATABASE_URL` and `NEON_AUTH_BASE_URL` on the function as well. After you change the public MCP URL, update `MCP_RESOURCE` and the OAuth Provider resource list.

Entry: `mcp/index.ts` (not `functions/mcp`).

## Related

- [Ledger](../ledger/README.md) — data and hosted login
- [Rollup](../rollup/README.md) — browser OAuth client of the same Auth instance
