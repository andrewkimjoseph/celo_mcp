import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { AppConfig, CeloNetwork } from "../config/env.js";
import { CHAINS, DEFAULT_RPC_URLS } from "../config/chains.js";

export interface CeloClients {
  public: PublicClient;
  wallet?: WalletClient;
  accountAddress?: `0x${string}`;
}

export class CeloClientFactory {
  private readonly cache = new Map<CeloNetwork, CeloClients>();

  constructor(private readonly config: AppConfig) {}

  getClients(network: CeloNetwork): CeloClients {
    const cached = this.cache.get(network);
    if (cached) {
      return cached;
    }

    const chain = CHAINS[network];
    const rpcUrl =
      this.config.rpcUrls[network] ?? DEFAULT_RPC_URLS[network];
    const transport = http(rpcUrl);

    const publicClient = createPublicClient({ chain, transport });

    let wallet: WalletClient | undefined;
    let accountAddress: `0x${string}` | undefined;

    if (this.config.privateKey) {
      const account = privateKeyToAccount(this.config.privateKey);
      accountAddress = account.address;
      wallet = createWalletClient({
        account,
        chain,
        transport,
      });
    }

    const clients: CeloClients = {
      public: publicClient,
      wallet,
      accountAddress,
    };

    this.cache.set(network, clients);
    return clients;
  }
}
