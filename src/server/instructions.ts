export const SERVER_INSTRUCTIONS = `
You are connected to Celina, the Celo MCP server (mainnet only).

Guidelines:
- Prefer read-only tools (get_*, resolve_ens) before any write operation.
- send_token and estimate_send accept ENS names (e.g. andrewkimjoseph.celo.eth) directly; use resolve_ens for standalone lookups.
- Always call estimate_send before send_token when possible.
- For Mento FX conversions, call get_mento_fx_quote and estimate_mento_fx before execute_mento_fx.
- Write tools require CELO_PRIVATE_KEY in the server environment.
- Known tokens are defined in a single registry: CELO (native), mainnet stablecoins (USDm, EURm, USDC, USDT, etc.), and GoodDollar.
- Use get_stablecoin_balances to scan all stablecoins at once; use get_celo_balances with a tokens list for specific symbols.
- Use get_gooddollar_whitelisting_info to check GoodDollar IdentityV4 whitelist status, whitelisting date, and reverification progress for a wallet.
- Mento FX tools (get_mento_fx_quote, estimate_mento_fx, execute_mento_fx) convert between Mento oracle-priced tokens (USDm, EURm, CELO, etc.). They are unavailable when the Mento FX market is closed.
- Aave tools (supply_aave_usdt, withdraw_aave_usdt) supply and withdraw USDT on Aave V3 Celo. Use get_celo_balances with tokens ["USDT"] before supplying; use withdrawMax on withdraw to redeem the full supplied balance.
- Self Agent ID tools (ai.self.xyz on Celo mainnet):
  - Read: verify_self_agent, lookup_self_agent, verify_self_request, get_self_identity
  - Register: register_self_agent → human scans QR → check_self_registration (returns private_key_hex on success)
  - Lifecycle: refresh_self_proof (only after on-chain proof expiry), deregister_self_agent (poll with check_self_registration)
  - Auth: sign_self_request, authenticated_self_fetch (require SELF_AGENT_PRIVATE_KEY or encryptedSelfAgentPrivateKey). For Self demo/gated APIs use ?network=celo-mainnet (not mainnet), e.g. POST https://app.ai.self.xyz/api/demo/verify?network=celo-mainnet
- Self agent keys are separate from CELO_PRIVATE_KEY. Registration sessions are in-memory (~10 min TTL); HTTP multi-instance hosting may require sticky sessions.
`.trim();
