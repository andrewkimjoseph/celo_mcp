import type { CeloNetwork } from "../config/env.js";
import type { CeloClientFactory } from "../clients/celo-client.js";
import { BlockchainService } from "../services/blockchain.service.js";
import { AccountService } from "../services/account.service.js";
import { TokenService } from "../services/token.service.js";
import { TransactionService } from "../services/transaction.service.js";

export interface AppContext {
  config: {
    defaultNetwork: CeloNetwork;
    hasWallet: boolean;
    walletAddress?: `0x${string}`;
  };
  blockchain: BlockchainService;
  account: AccountService;
  token: TokenService;
  transaction: TransactionService;
}

export function createAppContext(
  clientFactory: CeloClientFactory,
  defaultNetwork: CeloNetwork,
  walletAddress?: `0x${string}`,
): AppContext {
  return {
    config: {
      defaultNetwork,
      hasWallet: Boolean(walletAddress),
      walletAddress,
    },
    blockchain: new BlockchainService(clientFactory),
    account: new AccountService(clientFactory),
    token: new TokenService(clientFactory),
    transaction: new TransactionService(clientFactory, walletAddress),
  };
}
