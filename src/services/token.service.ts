import { erc20Abi, formatUnits, isAddress, parseUnits } from "viem";
import { KNOWN_TOKENS } from "../config/chains.js";
import { resolveStablecoins } from "../config/stablecoins.js";
import type { CeloClientFactory } from "../clients/celo-client.js";

export interface ResolvedToken {
  address: `0x${string}` | "native";
  symbol: string;
  decimals: number;
}

export class TokenService {
  constructor(private readonly clientFactory: CeloClientFactory) {}

  resolveToken(token: string): ResolvedToken {
    const normalized = token.trim();
    const upper = normalized.toUpperCase();

    if (upper === "CELO" || upper === "NATIVE") {
      return { address: "native", symbol: "CELO", decimals: 18 };
    }

    const known = KNOWN_TOKENS[upper];
    if (known) {
      return known;
    }

    if (isAddress(normalized)) {
      return {
        address: normalized,
        symbol: normalized,
        decimals: 18,
      };
    }

    throw new Error(
      `Unknown token "${token}". Use CELO, cUSD, cEUR, cREAL, or a contract address.`,
    );
  }

  async getTokenInfo(token: string) {
    const resolved = this.resolveToken(token);

    if (resolved.address === "native") {
      return {
        ...resolved,
        network: "mainnet",
        name: "Celo",
      };
    }

    const { public: client } = this.clientFactory.getClients();
    const address = resolved.address;

    const [name, symbol, decimals] = await Promise.all([
      client.readContract({
        address,
        abi: erc20Abi,
        functionName: "name",
      }),
      client.readContract({
        address,
        abi: erc20Abi,
        functionName: "symbol",
      }),
      client.readContract({
        address,
        abi: erc20Abi,
        functionName: "decimals",
      }),
    ]);

    return {
      network: "mainnet",
      address,
      name,
      symbol,
      decimals: Number(decimals),
    };
  }

  async getBalances(
    address: `0x${string}`,
    tokens: string[] = ["CELO", "cUSD"],
  ) {
    const { public: client } = this.clientFactory.getClients();

    const balances = await Promise.all(
      tokens.map(async (tokenInput) => {
        const token = this.resolveToken(tokenInput);

        if (token.address === "native") {
          const balance = await client.getBalance({ address });
          return {
            token: token.symbol,
            address: "native",
            raw: balance.toString(),
            formatted: formatUnits(balance, token.decimals),
          };
        }

        const balance = await client.readContract({
          address: token.address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        });

        const decimals =
          token.symbol === token.address
            ? Number(
                await client.readContract({
                  address: token.address,
                  abi: erc20Abi,
                  functionName: "decimals",
                }),
              )
            : token.decimals;

        return {
          token: token.symbol,
          address: token.address,
          raw: balance.toString(),
          formatted: formatUnits(balance, decimals),
        };
      }),
    );

    return { network: "mainnet", address, balances };
  }

  async getStablecoinBalances(
    address: `0x${string}`,
    options?: {
      stablecoins?: string[];
      includeZero?: boolean;
    },
  ) {
    const coins = resolveStablecoins(options?.stablecoins);
    const { public: client } = this.clientFactory.getClients();

    const results = await client.multicall({
      contracts: coins.map((coin) => ({
        address: coin.address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      })),
      allowFailure: true,
    });

    const balances = coins.map((coin, index) => {
      const result = results[index];

      if (result.status === "failure") {
        return {
          symbol: coin.symbol,
          address: coin.address,
          issuer: coin.issuer,
          useCase: coin.useCase,
          raw: "0",
          formatted: "0",
          readError: true,
        };
      }

      const raw = result.result as bigint;
      return {
        symbol: coin.symbol,
        address: coin.address,
        issuer: coin.issuer,
        useCase: coin.useCase,
        raw: raw.toString(),
        formatted: formatUnits(raw, coin.decimals),
      };
    });

    const stablecoins = options?.includeZero
      ? balances
      : balances.filter((balance) => balance.raw !== "0");

    return {
      network: "mainnet",
      address,
      totalChecked: coins.length,
      stablecoins,
    };
  }

  parseAmount(amount: string, decimals: number): bigint {
    return parseUnits(amount, decimals);
  }
}
