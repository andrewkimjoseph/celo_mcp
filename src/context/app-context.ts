import type { CeloClientFactory } from "../clients/celo-client.js";
import type { EnsClientFactory } from "../clients/ens-client.js";
import { BlockchainService } from "../services/blockchain.service.js";
import { AccountService } from "../services/account.service.js";
import { TokenService } from "../services/token.service.js";
import { TransactionService } from "../services/transaction.service.js";
import { MentoFxService } from "../services/mento-fx.service.js";
import { GoodDollarService } from "../services/gooddollar.service.js";
import { AaveService } from "../services/aave.service.js";
import { SelfService } from "../services/self.service.js";
import { EnsService } from "../services/ens.service.js";

export interface AppContext {
  config: {
    hasWallet: boolean;
    walletAddress?: `0x${string}`;
    hasSelfAgentKey: boolean;
  };
  blockchain: BlockchainService;
  account: AccountService;
  token: TokenService;
  transaction: TransactionService;
  mentoFx: MentoFxService;
  gooddollar: GoodDollarService;
  aave: AaveService;
  self: SelfService;
  ens: EnsService;
}

export function createAppContext(
  clientFactory: CeloClientFactory,
  ensClientFactory: EnsClientFactory,
  walletAddress?: `0x${string}`,
  selfAgentPrivateKey?: `0x${string}`,
): AppContext {
  return {
    config: {
      hasWallet: Boolean(walletAddress),
      walletAddress,
      hasSelfAgentKey: Boolean(selfAgentPrivateKey),
    },
    blockchain: new BlockchainService(clientFactory),
    account: new AccountService(clientFactory),
    token: new TokenService(clientFactory),
    transaction: new TransactionService(clientFactory),
    mentoFx: new MentoFxService(clientFactory),
    gooddollar: new GoodDollarService(clientFactory),
    aave: new AaveService(clientFactory),
    self: new SelfService(clientFactory, selfAgentPrivateKey),
    ens: new EnsService(ensClientFactory),
  };
}
