import { erc20Abi } from "viem";
import { aavePoolAbi } from "../abis/aave-pool.js";
import type { CeloClientFactory, CeloClients } from "../clients/celo-client.js";
import { AAVE_POOL, AAVE_USDT, AAVE_USDT_A_TOKEN } from "../config/aave.js";
import { CELINA_DATA_SUFFIX } from "../config/celina-tag.js";
import { decryptPrivateKey } from "../crypto/wallet-key-crypto.js";
import { TokenService } from "./token.service.js";

export class AaveService {
  private readonly tokenService: TokenService;

  constructor(private readonly clientFactory: CeloClientFactory) {
    this.tokenService = new TokenService(clientFactory);
  }

  private resolveClients(encryptedPrivateKey?: string): CeloClients {
    if (encryptedPrivateKey) {
      const privateKey = decryptPrivateKey(encryptedPrivateKey);
      return this.clientFactory.getClientsForAccount(privateKey);
    }

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

  private async assertUsdtBalance(
    publicClient: CeloClients["public"],
    owner: `0x${string}`,
    amount: string,
  ) {
    const usdt = this.tokenService.resolveToken("USDT");
    const required = this.tokenService.parseAmount(amount, usdt.decimals);

    const balance = await publicClient.readContract({
      address: AAVE_USDT,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [owner],
    });

    if (balance < required) {
      throw new Error(
        `Insufficient USDT balance. Required ${amount} USDT, available ${balance.toString()} raw units.`,
      );
    }
  }

  private async assertSuppliedBalance(
    publicClient: CeloClients["public"],
    owner: `0x${string}`,
    amount: string,
  ) {
    const usdt = this.tokenService.resolveToken("USDT");
    const required = this.tokenService.parseAmount(amount, usdt.decimals);

    const balance = await publicClient.readContract({
      address: AAVE_USDT_A_TOKEN,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [owner],
    });

    if (balance < required) {
      throw new Error(
        `Insufficient Aave USDT supply balance. Required ${amount} USDT, available ${balance.toString()} raw aToken units.`,
      );
    }
  }

  private async ensureUsdtAllowance(
    publicClient: CeloClients["public"],
    wallet: NonNullable<CeloClients["wallet"]>,
    from: `0x${string}`,
    account: NonNullable<NonNullable<CeloClients["wallet"]>["account"]>,
    chain: NonNullable<CeloClients["public"]["chain"]>,
    amountWei: bigint,
  ): Promise<`0x${string}` | undefined> {
    const allowance = await publicClient.readContract({
      address: AAVE_USDT,
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
      address: AAVE_USDT,
      abi: erc20Abi,
      functionName: "approve",
      args: [AAVE_POOL, amountWei],
      dataSuffix: CELINA_DATA_SUFFIX,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: approvalHash });
    if (receipt.status === "reverted") {
      throw new Error(`USDT approval reverted: ${approvalHash}`);
    }

    return approvalHash;
  }

  async supplyUsdt(amount: string, encryptedPrivateKey?: string) {
    const clients = this.resolveClients(encryptedPrivateKey);
    const { publicClient, wallet, from, account, chain } = this.requireWallet(clients);

    await this.assertUsdtBalance(publicClient, from, amount);

    const usdt = this.tokenService.resolveToken("USDT");
    const amountWei = this.tokenService.parseAmount(amount, usdt.decimals);

    const approvalHash = await this.ensureUsdtAllowance(
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
      args: [AAVE_USDT, amountWei, from, 0],
      dataSuffix: CELINA_DATA_SUFFIX,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === "reverted") {
      throw new Error(`Aave supply reverted: ${hash}`);
    }

    return {
      from,
      amount,
      token: "USDT",
      market: AAVE_POOL,
      hash,
      approvalHash,
      operation: "SUPPLY",
    };
  }

  async withdrawUsdt(
    amount: string | undefined,
    encryptedPrivateKey?: string,
    withdrawMax?: boolean,
  ) {
    const clients = this.resolveClients(encryptedPrivateKey);
    const { publicClient, wallet, from, account, chain } = this.requireWallet(clients);

    if (!withdrawMax && !amount) {
      throw new Error("Provide amount or set withdrawMax to true.");
    }

    if (!withdrawMax && amount) {
      await this.assertSuppliedBalance(publicClient, from, amount);
    }

    const usdt = this.tokenService.resolveToken("USDT");
    const amountWei = withdrawMax
      ? await publicClient.readContract({
          address: AAVE_USDT_A_TOKEN,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [from],
        })
      : this.tokenService.parseAmount(amount!, usdt.decimals);

    if (amountWei === 0n) {
      throw new Error("No supplied USDT balance to withdraw.");
    }

    const hash = await wallet.writeContract({
      chain,
      account,
      address: AAVE_POOL,
      abi: aavePoolAbi,
      functionName: "withdraw",
      args: [AAVE_USDT, amountWei, from],
      dataSuffix: CELINA_DATA_SUFFIX,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === "reverted") {
      throw new Error(`Aave withdraw reverted: ${hash}`);
    }

    return {
      from,
      amount: withdrawMax ? "max" : amount!,
      token: "USDT",
      market: AAVE_POOL,
      hash,
      operation: "WITHDRAW",
      withdrawMax: Boolean(withdrawMax),
    };
  }
}
