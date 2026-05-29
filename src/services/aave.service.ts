import {
  AAVE_POOL,
  resolveAaveAsset,
  type createCelinaClient,
} from "@andrewkimjoseph/celina-sdk";
import type { CeloClientFactory } from "../clients/celo-client.js";
import { executePreparedFlow, requireWalletClients } from "./execute-prepared-flow.js";

type CelinaClient = ReturnType<typeof createCelinaClient>;

export class AaveService {
  constructor(
    private readonly clientFactory: CeloClientFactory,
    private readonly sdk: CelinaClient,
  ) {}

  async supply(token: string, amount: string) {
    const clients = requireWalletClients(this.clientFactory.getClients());
    const { accountAddress: from } = clients;
    const asset = resolveAaveAsset(token);

    const prepared = await this.sdk.aave.prepareSupply(from, token, amount);
    const { stepHashes, hash } = await executePreparedFlow(clients, prepared.steps);

    return {
      from,
      amount,
      token: asset.symbol,
      market: AAVE_POOL,
      hash,
      approvalHash: stepHashes.length > 1 ? stepHashes[0] : undefined,
      operation: "SUPPLY" as const,
    };
  }

  async withdraw(
    token: string,
    amount: string | undefined,
    withdrawMax?: boolean,
  ) {
    const clients = requireWalletClients(this.clientFactory.getClients());
    const { accountAddress: from } = clients;
    const asset = resolveAaveAsset(token);

    const prepared = await this.sdk.aave.prepareWithdraw(
      from,
      token,
      amount,
      withdrawMax,
    );
    const { hash } = await executePreparedFlow(clients, prepared.steps);

    return {
      from,
      amount: withdrawMax ? "max" : amount!,
      token: asset.symbol,
      market: AAVE_POOL,
      hash,
      operation: "WITHDRAW" as const,
      withdrawMax: Boolean(withdrawMax),
    };
  }
}
