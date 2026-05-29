import type { createCelinaClient } from "@andrewkimjoseph/celina-sdk";
import type { PreparedTx, UniswapSwapParams } from "@andrewkimjoseph/celina-sdk";
import { type Hex } from "viem";
import type { CeloClientFactory, CeloClients } from "../clients/celo-client.js";

type CelinaClient = ReturnType<typeof createCelinaClient>;

export class UniswapService {
  constructor(
    private readonly clientFactory: CeloClientFactory,
    private readonly sdk: CelinaClient,
  ) {}

  private requireClients(): CeloClients {
    const clients = this.clientFactory.getClients();
    if (!clients.wallet || !clients.accountAddress) {
      throw new Error(
        "No wallet configured. Set CELO_PRIVATE_KEY in the MCP server env.",
      );
    }
    return clients;
  }

  getSwapQuote(
    tokenIn: string,
    tokenOut: string,
    amount: string,
  ): ReturnType<CelinaClient["uniswap"]["getSwapQuote"]> {
    return this.sdk.uniswap.getSwapQuote(tokenIn, tokenOut, amount);
  }

  estimateSwap(
    tokenIn: string,
    tokenOut: string,
    amount: string,
    params?: UniswapSwapParams,
  ): ReturnType<CelinaClient["uniswap"]["estimateSwap"]> {
    const { accountAddress: from } = this.requireClients();
    if (!from) {
      throw new Error("Wallet address unavailable.");
    }
    return this.sdk.uniswap.estimateSwap(from, tokenIn, tokenOut, amount, params);
  }

  private async executePreparedStep(
    wallet: NonNullable<CeloClients["wallet"]>,
    publicClient: CeloClients["public"],
    step: PreparedTx,
  ): Promise<`0x${string}`> {
    const account = wallet.account;
    if (!account) {
      throw new Error("Wallet account unavailable.");
    }

    const chain = publicClient.chain;
    if (!chain) {
      throw new Error("Chain configuration missing.");
    }

    // Prepared steps from celina-sdk already include the CELINA calldata suffix.
    return wallet.sendTransaction({
      chain,
      account,
      to: step.to,
      data: step.data as Hex | undefined,
      value: step.value ? BigInt(step.value) : undefined,
    });
  }

  async executeSwap(
    tokenIn: string,
    tokenOut: string,
    amount: string,
    params?: UniswapSwapParams,
  ): Promise<{
    from: `0x${string}`;
    recipient: `0x${string}`;
    stepHashes: `0x${string}`[];
    hash: `0x${string}`;
    status: "success" | "reverted";
    slippageTolerance: number;
    deadlineMinutes: number;
    protocol: "uniswap_v4";
    network: "mainnet";
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    expectedOut: string;
    routeHops: number;
    indexSource?: string;
    route: { pools: unknown[] };
  }> {
    const { public: client, wallet, accountAddress: from } =
      this.requireClients();

    if (!wallet || !from) {
      throw new Error(
        "Wallet client unavailable. Set CELO_PRIVATE_KEY in the MCP server env.",
      );
    }

    const prepared = await this.sdk.uniswap.prepareSwap(
      from,
      tokenIn,
      tokenOut,
      amount,
      params,
    );

    const stepHashes: `0x${string}`[] = [];

    for (const step of prepared.steps) {
      const hash = await this.executePreparedStep(wallet, client, step);
      stepHashes.push(hash);
      await client.waitForTransactionReceipt({ hash });
    }

    const hash = stepHashes[stepHashes.length - 1]!;
    const receipt = await client.waitForTransactionReceipt({ hash });
    const quote = await this.sdk.uniswap.getSwapQuote(tokenIn, tokenOut, amount);

    return {
      ...quote,
      from,
      recipient: params?.recipient ?? from,
      stepHashes,
      hash,
      status: receipt.status,
      slippageTolerance: params?.slippageTolerance ?? 0.5,
      deadlineMinutes: params?.deadlineMinutes ?? 5,
    };
  }
}
