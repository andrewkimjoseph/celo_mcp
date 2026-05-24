export const SERVER_INSTRUCTIONS = `
You are connected to the Celo MCP server (mainnet only).

Guidelines:
- Prefer read-only tools (get_*) before any write operation.
- Always call estimate_send before send_token when possible.
- Write tools require CELO_PRIVATE_KEY in the server environment.
- Known tokens: CELO (native), cUSD, cEUR, cREAL.
- Use get_stablecoin_balances for Mento and other local stablecoins (USDm, EURm, USDC, USDT, etc.).

Future tools (add as new modules in src/tools/): lend on Aave, Self verify, Self Agent ID check.
`.trim();
