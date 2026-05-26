<p align="center">
  <img src="https://raw.githubusercontent.com/andrewkimjoseph/celina/main/assets/logo-yellow.png#gh-dark-mode-only" alt="Celina logo — yellow C with profile silhouette on black" width="160" />
  <img src="https://raw.githubusercontent.com/andrewkimjoseph/celina/main/assets/logo-black.png#gh-light-mode-only" alt="Celina logo — black C with profile silhouette" width="160" />
</p>

<h1 align="center">Celina — Celo MCP Server</h1>

<p align="center">
  <strong>Celina</strong> is an open-source <a href="https://modelcontextprotocol.io">Model Context Protocol</a> server that gives LLMs read + write access to <strong>Celo mainnet</strong> — balances, stablecoins, sends, and chain reads.
</p>

<p align="center">
  <a href="https://celina.andrewkimjoseph.com">Website</a>
  ·
  <a href="https://www.npmjs.com/package/@andrewkimjoseph/celina">npm</a>
</p>

## Install

```bash
npm i @andrewkimjoseph/celina
```

npm: [@andrewkimjoseph/celina](https://www.npmjs.com/package/@andrewkimjoseph/celina)

## Quick start

Celina is not meant to be run manually in a terminal for normal use. Your MCP client (Cursor, Claude Desktop, LM Studio, etc.) spawns it as a child process and talks to it over stdio. Install the package, then add it to your MCP config (see [Cursor / Claude Desktop config](#cursor--claude-desktop-config)).

**From npm:**

```bash
npm i @andrewkimjoseph/celina
```

**From source** (development):

```bash
npm install
npm run build
npm start
```

## Deploy to Render

This project includes a [Render Blueprint](render.yaml) for one-click deployment as a public Streamable HTTP MCP server.

### 1. Generate an RSA key pair

```bash
openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in private.pem -out public.pem
```

### 2. Deploy

1. Push this repo to GitHub
2. Render Dashboard → **New → Blueprint** → connect the repo
3. Set `WALLET_ENCRYPTION_PRIVATE_KEY` in the Render Environment tab (paste contents of `private.pem`)
4. (Optional) Add a custom domain in Render and set `ALLOWED_HOSTS` to that hostname (comma-separated if multiple)
5. Your MCP endpoint will be at your Render URL + `/mcp`

> **Note:** Free Render services spin down after ~15 minutes of inactivity. Cold starts can take 30–60 seconds and may cause MCP client timeouts. Use a Starter plan for always-on hosting.

## Cursor / Claude Desktop config

### Cursor — remote (recommended)

```json
{
  "mcpServers": {
    "celina": {
      "type": "streamable-http",
      "url": "https://mcp.celina.andrewkimjoseph.com/mcp"
    }
  }
}
```

> Custom domains must be listed in `ALLOWED_HOSTS` on the server. Render's default hostname (`RENDER_EXTERNAL_HOSTNAME`) is always allowed automatically.

### Claude Desktop — remote (free plan)

Claude Desktop's `claude_desktop_config.json` only supports local stdio servers — it does **not** accept `"type": "streamable-http"` with a `"url"`. Free-plan users should bridge the hosted server with [`mcp-remote`](https://github.com/geelen/mcp-remote). Install it once (`npm i -g mcp-remote`), then:

```json
{
  "mcpServers": {
    "celina": {
      "command": "mcp-remote",
      "args": [
        "https://mcp.celina.andrewkimjoseph.com/mcp",
        "--transport",
        "http-only"
      ]
    }
  }
}
```

Fully quit and relaunch Claude Desktop after editing the config (closing the window is not enough).

> **Pro / Max / Team / Enterprise:** you can skip `mcp-remote` and add `https://mcp.celina.andrewkimjoseph.com/mcp` under **Settings → Integrations** instead.

### Local stdio (npm)

After `npm i @andrewkimjoseph/celina`, point your MCP client at the installed entry file (use an absolute path):

```json
{
  "mcpServers": {
    "celina": {
      "command": "node",
      "args": ["/absolute/path/to/node_modules/@andrewkimjoseph/celina/build/index.js"]
    }
  }
}
```

### Local stdio (from source)

```json
{
  "mcpServers": {
    "celina": {
      "command": "node",
      "args": ["/absolute/path/to/celina/build/index.js"]
    }
  }
}
```

For local write tools, add a funded mainnet wallet:

```json
"env": {
  "CELO_PRIVATE_KEY": "0x..."
}
```

Never commit private keys. Use env vars only.

## Local LLM integration

Celina is an **MCP tool server**. A local LLM stack needs an **MCP client** that can connect to Celina and pass tool definitions to a model that supports **function / tool calling**.

Read-only tools (balances, blocks, GoodDollar status, etc.) work out of the box. For local write tools (`send_token`, `estimate_send`, `execute_mento_fx`), set `CELO_PRIVATE_KEY` in the MCP server `env` block (stdio) or use the [hosted encryption flow](#write-tools-hosted-mode) (HTTP).

### LM Studio (0.3.17+)

LM Studio can host MCP servers directly via `mcp.json` (same format as Cursor).

1. Open LM Studio → **Program** → **Install** → **Edit mcp.json**
2. Add Celina under `mcpServers`
3. In **Server Settings**, enable **Allow calling servers from mcp.json**
4. Chat with a tool-capable model (e.g. Qwen 2.5, Llama 3.1+)

```json
{
  "mcpServers": {
    "celina": {
      "command": "node",
      "args": ["/absolute/path/to/node_modules/@andrewkimjoseph/celina/build/index.js"],
      "env": {
        "CELO_PRIVATE_KEY": "0x..."
      }
    }
  }
}
```

Omit `CELO_PRIVATE_KEY` if you only need read-only chain queries.

### Open WebUI + Ollama

[Open WebUI](https://docs.openwebui.com/features/extensibility/mcp/) supports **streamable HTTP** MCP natively (not stdio).

**Hosted Celina (easiest):** Admin Settings → External Tools → **Add Server** → Type: **MCP (Streamable HTTP)** → URL:

```
https://mcp.celina.andrewkimjoseph.com/mcp
```

**Local HTTP server:** run Celina in HTTP mode, then point Open WebUI at it:

```bash
npm run build
npm run start:http
```

Add an External Tool with Type **MCP (Streamable HTTP)** and URL `http://localhost:10000/mcp`.

For write tools over HTTP, set `WALLET_ENCRYPTION_PRIVATE_KEY` in `.env` (see [Deploy to Render](#deploy-to-render)) and use the [encrypt-key flow](#write-tools-hosted-mode).

> If Open WebUI runs in Docker, use `http://host.docker.internal:10000/mcp` instead of `localhost`.

### Continue (VS Code)

[Continue](https://docs.continue.dev/customize/deep-dives/mcp) works with local models (Ollama, LM Studio, etc.) in **agent mode**.

Create `.continue/mcpServers/celina.yaml` in your workspace:

```yaml
name: Celina
version: 0.0.1
schema: v1
mcpServers:
  - name: celina
    type: stdio
    command: node
    args:
      - "/absolute/path/to/node_modules/@andrewkimjoseph/celina/build/index.js"
    env:
      CELO_PRIVATE_KEY: "0x..."
```

Alternatively, copy the [local stdio JSON](#local-stdio-npm) from the Cursor section into `.continue/mcpServers/mcp.json` — Continue picks up Claude/Cursor-style configs automatically.

### Test without an LLM

Use MCP Inspector to call Celina tools directly over stdio:

```bash
npm run build
npm run inspect
```

### Tips

- Use models with reliable tool-calling support; small or older models may skip tools or call them incorrectly.
- Start with read-only prompts, e.g. *"What's the USDm balance of 0x…?"* or *"Is this wallet GoodDollar whitelisted?"*
- Keep private keys in env vars only — never commit them to config files in git.

## Write tools (hosted mode)

Write tools (`send_token`, `estimate_send`, `execute_mento_fx`) accept an RSA-encrypted private key per request — never plaintext.

### Flow

1. Fetch the server's public key:
   - MCP tool: `get_wallet_encryption_public_key`
   - HTTP: `GET https://mcp.celina.andrewkimjoseph.com/public-key`
2. Encrypt your key locally:

```bash
npm run encrypt-key -- --url https://mcp.celina.andrewkimjoseph.com --key 0xYOUR_PRIVATE_KEY
```

3. Give the agent the encrypted blob (base64 output) along with your transaction details
4. The agent calls `send_token` with the `encryptedPrivateKey` parameter

The server decrypts the key ephemerally to sign the transaction — it is not stored.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CELO_RPC_URL_MAINNET` | Forno public RPC | Override mainnet RPC |
| `CELO_PRIVATE_KEY` | — | Local stdio write tools only |
| `SELF_AGENT_PRIVATE_KEY` | — | Self Agent ID signing/identity tools (separate from CELO wallet) |
| `SELF_AGENT_API_BASE` | `https://app.ai.self.xyz` | Override Self Agent ID REST API base URL |
| `WALLET_ENCRYPTION_PRIVATE_KEY` | — | RSA private key PEM for HTTP write tools |
| `ALLOWED_HOSTS` | — | Comma-separated custom hostnames (e.g. `mcp.celina.andrewkimjoseph.com`) |
| `PORT` | `10000` | HTTP server port (set by Render) |

Copy `.env.example` to `.env` for local development.

## Known tokens

All supported tokens live in a single registry (`src/config/chains.ts`):

| Category | Symbols |
|----------|---------|
| Native | `CELO` |
| Mento stablecoins | `USDm`, `EURm`, `BRLm`, `XOFm`, `KESm`, `PHPm`, `COPm`, `GBPm`, `CADm`, `AUDm`, `ZARm`, `GHSm`, `NGNm`, `JPYm`, `CHFm` |
| Bridged / third-party | `USDT`, `USDC`, `vEUR`, `vGBP`, `vCHF`, `USDM`, `USDA`, `EURA`, `USDGLO`, `BRLA`, `COPM` |
| GoodDollar | `GoodDollar`, `G$` (`0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A`) |

Token symbols are resolved case-insensitively. Legacy aliases `cUSD` and `cEUR` map to `USDm` and `EURm`. You can also pass any ERC-20 contract address directly.

- `get_celo_balances` — check specific tokens (defaults to `CELO` + `USDm`)
- `get_stablecoin_balances` — scan all registry stablecoins in one call (omits zero balances by default)

## Tools (v0.2)

| Tool | Type | Description |
|------|------|-------------|
| `get_network_status` | read | Mainnet chain ID, block, gas price |
| `get_block` | read | Block by number/hash/latest |
| `get_latest_blocks` | read | Recent blocks |
| `get_transaction` | read | Tx + receipt |
| `get_account` | read | CELO balance, nonce |
| `get_celo_balances` | read | CELO + ERC-20 balances (default: CELO + USDm) |
| `get_stablecoin_balances` | read | All registry stablecoins including GoodDollar |
| `get_token_info` | read | Token metadata |
| `get_wallet_encryption_public_key` | read | RSA public key for encrypting private keys |
| `estimate_send` | read* | Gas estimate (*needs encrypted or env key) |
| `send_token` | write | Send CELO or ERC-20 |
| `get_mento_fx_quote` | read | Mento FX expected output (no wallet) |
| `estimate_mento_fx` | read* | Mento FX gas estimate (*needs encrypted or env key) |
| `execute_mento_fx` | write | Execute Mento FX conversion |
| `supply_aave_usdt` | write | Supply USDT to Aave V3 on Celo |
| `withdraw_aave_usdt` | write | Withdraw USDT from Aave V3 on Celo |
| `get_gooddollar_whitelisting_info` | read | GoodDollar IdentityV4 whitelist status |
| `verify_self_agent` | read | Verify Self Agent ID on-chain by address |
| `lookup_self_agent` | read | Look up Self agent by numeric ID (ai.self.xyz) |
| `verify_self_request` | read | Verify signed Self Agent HTTP request headers |
| `register_self_agent` | write | Start Self agent registration (QR/deep link) |
| `check_self_registration` | read* | Poll registration/refresh/deregister session (*may return private key) |
| `get_self_identity` | read* | Current Self agent identity (*needs agent key) |
| `refresh_self_proof` | write | Renew human proof after on-chain expiry (`isProofFresh` false) |
| `deregister_self_agent` | write | Irreversibly revoke Self agent identity |
| `sign_self_request` | read* | Sign HTTP request with Self agent headers (*needs agent key) |
| `authenticated_self_fetch` | write | HTTP fetch with Self agent auth (*needs agent key) |

### Self Agent ID notes

- **Registration lifecycle APIs** (`register_self_agent`, `refresh_self_proof`, `deregister_self_agent`) use `network: "mainnet"` in the Self REST API request body.
- **Demo and gated HTTP endpoints** (e.g. `https://app.ai.self.xyz/api/demo/verify`) require the query param **`network=celo-mainnet`**, not `network=mainnet`.
- **QR scan URLs** use `/scan/{sessionToken}`, not `/qr/...`.
- **`refresh_self_proof`** only starts after on-chain proof expiry (`isProofFresh` is false); while fresh it returns a clear error instead of a QR that will fail on-chain. The 30-day `is_expiring_soon` flag (matching Self SDK `isProofExpiringSoon`) is for warnings only. Self SDK also documents deregister → re-register as an alternative renewal path.

Example authenticated demo call:

```text
authenticated_self_fetch
  method: POST
  url: https://app.ai.self.xyz/api/demo/verify?network=celo-mainnet
  body: {}
```

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

- [x] Mento FX routing (`get_mento_fx_quote`, `estimate_mento_fx`, `execute_mento_fx`)
- [x] Aave lending tools (`supply_aave_usdt`, `withdraw_aave_usdt`)
- [x] Self proof verification (`verify_self_agent`, `verify_self_request`, `ai.self.xyz`)
- [x] Self Agent ID check (`lookup_self_agent`, registration & lifecycle tools)

## Development

```bash
npm run dev          # watch TypeScript
npm run inspect      # MCP Inspector UI (stdio)
npm run start:http   # HTTP server on PORT (default 10000)
npm run encrypt-key  # encrypt a private key for write tools
```

## License

MIT
