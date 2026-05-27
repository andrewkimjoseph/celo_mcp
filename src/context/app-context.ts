/**
 * Application context: SDK read services + local wallet-backed write services.
 *
 * Reads (blockchain, token, gooddollar, ens) come from celina-sdk.
 * Writes (transaction, mentoFx, aave, self) use CeloClientFactory with CELO_PRIVATE_KEY
 * because MCP agents sign server-side — unlike celina-agent where the user signs in-browser.
 */
import { createCelinaClient } from "@andrewkimjoseph/celina-sdk";
import type { CeloClientFactory } from "../clients/celo-client.js";
import { TransactionService } from "../services/transaction.service.js";
import { MentoFxService } from "../services/mento-fx.service.js";
import { AaveService } from "../services/aave.service.js";
import { SelfService } from "../services/self.service.js";
import type { AppConfig } from "../config/env.js";

export interface AppContext {
  /** Whether `CELO_PRIVATE_KEY` is configured for server-side signing. */
  config: {
    hasWallet: boolean;
    walletAddress?: `0x${string}`;
    hasSelfAgentKey: boolean;
  };
  /** From celina-sdk — public RPC reads only. */
  blockchain: ReturnType<typeof createCelinaClient>["blockchain"];
  account: ReturnType<typeof createCelinaClient>["account"];
  token: ReturnType<typeof createCelinaClient>["token"];
  /** Local service — signs sends with `CELO_PRIVATE_KEY`. */
  transaction: TransactionService;
  mentoFx: MentoFxService;
  aave: AaveService;
  gooddollar: ReturnType<typeof createCelinaClient>["gooddollar"];
  /** Self Agent ID — requires `SELF_AGENT_PRIVATE_KEY`. */
  self: SelfService;
  ens: ReturnType<typeof createCelinaClient>["ens"];
}

/**
 * Compose MCP tool context: celina-sdk reads plus wallet-backed write services.
 * Writes sign server-side; celina-agent uses prepare* + user wallet instead.
 */
export function createAppContext(
  clientFactory: CeloClientFactory,
  config: AppConfig,
  walletAddress?: `0x${string}`,
  selfAgentPrivateKey?: `0x${string}`,
): AppContext {
  const sdk = createCelinaClient({
    rpcUrl: config.rpcUrl,
    ethRpcUrl: config.ethRpcUrl,
  });

  return {
    config: {
      hasWallet: Boolean(walletAddress),
      walletAddress,
      hasSelfAgentKey: Boolean(selfAgentPrivateKey),
    },
    blockchain: sdk.blockchain,
    account: sdk.account,
    token: sdk.token,
    transaction: new TransactionService(clientFactory),
    mentoFx: new MentoFxService(clientFactory),
    aave: new AaveService(clientFactory),
    gooddollar: sdk.gooddollar,
    self: new SelfService(clientFactory, selfAgentPrivateKey),
    ens: sdk.ens,
  };
}
