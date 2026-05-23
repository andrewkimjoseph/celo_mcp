export type CeloNetwork = "mainnet" | "sepolia";

export interface AppConfig {
  defaultNetwork: CeloNetwork;
  rpcUrls: Partial<Record<CeloNetwork, string>>;
  privateKey?: `0x${string}`;
}

export function loadConfig(): AppConfig {
  const defaultNetwork =
    process.env.CELO_NETWORK === "sepolia" ? "sepolia" : "mainnet";

  return {
    defaultNetwork,
    rpcUrls: {
      mainnet: process.env.CELO_RPC_URL_MAINNET,
      sepolia: process.env.CELO_RPC_URL_SEPOLIA,
    },
    privateKey: process.env.CELO_PRIVATE_KEY as `0x${string}` | undefined,
  };
}
