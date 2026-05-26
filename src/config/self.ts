export const SELF_REGISTRY_ADDRESS =
  "0xaC3DF9ABf80d0F5c020C06B04Cced27763355944" as const;

export const SELF_API_BASE = "https://app.ai.self.xyz";

/** Network value for Self lifecycle REST APIs (register, refresh, deregister). */
export const SELF_API_NETWORK = "mainnet";

/** Query param for Self demo/gated HTTP endpoints on Celo mainnet. */
export const SELF_DEMO_NETWORK = "celo-mainnet";

export const SELF_CHAIN_ID = 42220;

export function selfDemoUrl(path: string, network = SELF_DEMO_NETWORK): string {
  const base = SELF_API_BASE.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const separator = normalizedPath.includes("?") ? "&" : "?";
  return `${base}${normalizedPath}${separator}network=${network}`;
}

export const SELF_SESSION_TTL_MS = 10 * 60 * 1000;

export const SELF_MAX_SESSIONS = 50;

export const SELF_DEFAULT_MAX_AGE_MS = 5 * 60 * 1000;

export const SELF_FETCH_MAX_BYTES = 10 * 1024;

/** Warning threshold for upcoming proof expiry (matches Self SDK isProofExpiringSoon). */
export const SELF_PROOF_EXPIRING_SOON_DAYS = 30;

export const SELF_HEADERS = {
  ADDRESS: "x-self-agent-address",
  SIGNATURE: "x-self-agent-signature",
  TIMESTAMP: "x-self-agent-timestamp",
  KEYTYPE: "x-self-agent-keytype",
  KEY: "x-self-agent-key",
} as const;

export type SelfRegistrationMode =
  | "linked"
  | "wallet-free"
  | "smartwallet"
  | "self-custody"
  | "ed25519"
  | "ed25519-linked";
