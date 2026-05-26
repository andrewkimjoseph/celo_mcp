import { erc20Abi } from "viem";
import { aavePoolAbi } from "../abis/aave-pool.js";
import type { CeloClientFactory, CeloClients } from "../clients/celo-client.js";
import {
  AAVE_POOL,
  resolveAaveAsset,
  type AaveAsset,
} from "../config/aave.js";
import { CELINA_DATA_SUFFIX } from "../config/celina-tag.js";
import { TokenService } from "./token.service.js";

export class AaveService {
  private readonly tokenService: TokenService;

  constructor(private readonly clientFactory: CeloClientFactory) {
    this.tokenService = new TokenService(clientFactory);
  }

  private requireClients(): CeloClients {
    const clients = this.clientFactory.getClients();
    if (!clients.wallet || !clients.accountAddress) {
      throw new Error(
        "No wallet configured. Set CELO_PRIVATE_KEY in the MCP server env.",
      );
    }

    return clients;
  }

  private requireWallet(clients: CeloClients) {
    const { public: publicClient, wallet, accountAddress: from } = clients;

    if (!wallet || !from) {
      throw new Error(
        "Wallet client unavailable. Set CELO_PRIVATE_KEY in the MCP server env.",
      );
    }

    const account = wallet.account;
    if (!account) {
      throw new Error("Wallet account unavailable.");
    }

    const chain = publicClient.chain;
    if (!chain) {
      throw new Error("Chain configuration missing.");
    }

    return { publicClient, wallet, from, account, chain };
  }

  private async assertUnderlyingBalance(
    asset: AaveAsset,
    publicClient: CeloClients["public"],
    owner: `0x${string}`,
    amount: string,
  ) {
    const token = this.tokenService.resolveToken(asset.symbol);
    const required = this.tokenService.parseAmount(amount, token.decimals);

    const balance = await publicClient.readContract({
      address: asset.underlying,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [owner],
    });

    if (balance < required) {
      const celoHint =
        asset.symbol === "CELO"
          ? " Aave requires wrapped CELO (ERC-20), not native CELO."
          : "";
      throw new Error(
        `Insufficient ${asset.symbol} balance. Required ${amount} ${asset.symbol}, available ${balance.toString()} raw units.${celoHint}`,
      );
    }
  }

  private async assertATokenBalance(
    asset: AaveAsset,
    publicClient: CeloClients["public"],
    owner: `0x${string}`,
    amount: string,
  ) {
    const token = this.tokenService.resolveToken(asset.symbol);
    const required = this.tokenService.parseAmount(amount, token.decimals);

    const balance = await publicClient.readContract({
      address: asset.aToken,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [owner],
    });

    if (balance < required) {
      throw new Error(
        `Insufficient Aave ${asset.symbol} supply balance. Required ${amount} ${asset.symbol}, available ${balance.toString()} raw aToken units.`,
      );
    }
  }

  private async ensureAllowance(
    underlying: `0x${string}`,
    tokenSymbol: string,
    publicClient: CeloClients["public"],
    wallet: NonNullable<CeloClients["wallet"]>,
    from: `0x${string}`,
    account: NonNullable<NonNullable<CeloClients["wallet"]>["account"]>,
    chain: NonNullable<CeloClients["public"]["chain"]>,
    amountWei: bigint,
  ): Promise<`0x${string}` | undefined> {
    const allowance = await publicClient.readContract({
      address: underlying,
      abi: erc20Abi,
      functionName: "allowance",
      args: [from, AAVE_POOL],
    });

    if (allowance >= amountWei) {
      return undefined;
    }

    const approvalHash = await wallet.writeContract({
      chain,
      account,
      address: underlying,
      abi: erc20Abi,
      functionName: "approve",
      args: [AAVE_POOL, amountWei],
      dataSuffix: CELINA_DATA_SUFFIX,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: approvalHash });
    if (receipt.status === "reverted") {
      throw new Error(`${tokenSymbol} approval reverted: ${approvalHash}`);
    }

    return approvalHash;
  }

  async supply(token: string, amount: string) {
    const asset = resolveAaveAsset(token);
    const clients = this.requireClients();
    const { publicClient, wallet, from, account, chain } = this.requireWallet(clients);

    await this.assertUnderlyingBalance(asset, publicClient, from, amount);

    const resolved = this.tokenService.resolveToken(asset.symbol);
    const amountWei = this.tokenService.parseAmount(amount, resolved.decimals);

    const approvalHash = await this.ensureAllowance(
      asset.underlying,
      asset.symbol,
      publicClient,
      wallet,
      from,
      account,
      chain,
      amountWei,
    );

    const hash = await wallet.writeContract({
      chain,
      account,
      address: AAVE_POOL,
      abi: aavePoolAbi,
      functionName: "supply",
      args: [asset.underlying, amountWei, from, 0],
      dataSuffix: CELINA_DATA_SUFFIX,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === "reverted") {
      throw new Error(`Aave supply reverted: ${hash}`);
    }

    return {
      from,
      amount,
      token: asset.symbol,
      market: AAVE_POOL,
      hash,
      approvalHash,
      operation: "SUPPLY",
    };
  }

  async withdraw(
    token: string,
    amount: string | undefined,
    withdrawMax?: boolean,
  ) {
    const asset = resolveAaveAsset(token);
    const clients = this.requireClients();
    const { publicClient, wallet, from, account, chain } = this.requireWallet(clients);

    if (!withdrawMax && !amount) {
      throw new Error("Provide amount or set withdrawMax to true.");
    }

    if (!withdrawMax && amount) {
      await this.assertATokenBalance(asset, publicClient, from, amount);
    }

    const resolved = this.tokenService.resolveToken(asset.symbol);
    const amountWei = withdrawMax
      ? await publicClient.readContract({
          address: asset.aToken,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [from],
        })
      : this.tokenService.parseAmount(amount!, resolved.decimals);

    if (amountWei === 0n) {
      throw new Error(`No supplied ${asset.symbol} balance to withdraw.`);
    }

    const hash = await wallet.writeContract({
      chain,
      account,
      address: AAVE_POOL,
      abi: aavePoolAbi,
      functionName: "withdraw",
      args: [asset.underlying, amountWei, from],
      dataSuffix: CELINA_DATA_SUFFIX,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === "reverted") {
      throw new Error(`Aave withdraw reverted: ${hash}`);
    }

    return {
      from,
      amount: withdrawMax ? "max" : amount!,
      token: asset.symbol,
      market: AAVE_POOL,
      hash,
      operation: "WITHDRAW",
      withdrawMax: Boolean(withdrawMax),
    };
  }
}
