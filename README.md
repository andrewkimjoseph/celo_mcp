# Celo MCP

Open-source [Model Context Protocol](https://modelcontextprotocol.io) server that gives LLMs read + write access to Celo — balances, sends, swaps (quote stub), and chain reads.

## Quick start

```bash
npm install
npm run build
npm start
```

## Cursor / Claude Desktop config

Add to your MCP settings (`.cursor/mcp.json` or Claude Desktop config):

```json
{
  "mcpServers": {
    "celo": {
      "command": "node",
      "args": ["/absolute/path/to/celo_mcp/build/index.js"],
      "env": {
        "CELO_NETWORK": "mainnet"
      }
    }
  }
}
```

For write tools (`send_token`, `estimate_send`), add a funded wallet:

```json
"env": {
  "CELO_NETWORK": "sepolia",
  "CELO_PRIVATE_KEY": "0x..."
}
```

Never commit private keys. Use env vars only.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CELO_NETWORK` | `mainnet` | `mainnet` or `sepolia` |
| `CELO_RPC_URL_MAINNET` | Forno public RPC | Override mainnet RPC |
| `CELO_RPC_URL_SEPOLIA` | Forno Sepolia RPC | Override testnet RPC |
| `CELO_PRIVATE_KEY` | — | Enables write tools |

Copy `.env.example` to `.env` for local development.

## Tools (v0.1)

| Tool | Type | Description |
|------|------|-------------|
| `get_network_status` | read | Chain ID, block, gas price |
| `get_block` | read | Block by number/hash/latest |
| `get_latest_blocks` | read | Recent blocks |
| `get_transaction` | read | Tx + receipt |
| `get_account` | read | CELO balance, nonce |
| `get_celo_balances` | read | CELO + ERC-20 balances |
| `get_token_info` | read | Token metadata |
| `estimate_send` | read* | Gas estimate (*needs wallet) |
| `send_token` | write | Send CELO or ERC-20 |
| `get_swap_quote` | read | Swap preview (routing stub) |

## Adding a new tool

1. Create `src/tools/my-feature.tools.ts` implementing `ToolModule`:

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppContext } from "../context/app-context.js";
import type { ToolModule } from "./types.js";

export const myFeatureTools: ToolModule = {
  register(server, ctx) {
    server.registerTool("my_tool", { /* ... */ }, async (args) => { /* ... */ });
  },
};
```

2. Append to `toolModules` in `src/tools/index.ts`.
3. Add domain logic in `src/services/` if needed.
4. Rebuild: `npm run build`.

No changes to `src/index.ts` or server bootstrap required.

## Roadmap

- [ ] Mento / DEX swap routing (`execute_swap`)
- [ ] Aave lending tools
- [ ] Self proof verification (`ai.self.xyz`)
- [ ] Self Agent ID check

## Development

```bash
npm run dev      # watch TypeScript
npm run inspect  # MCP Inspector UI
```

## License

MIT
