import { isAddress } from "viem";
import { findKnownToken } from "./chains.js";

/** Aave V3 on Celo mainnet — from bgd-labs/aave-address-book AaveV3Celo */
export const AAVE_POOL = "0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402" as const;
export const AAVE_CHAIN_ID = 42220;

export type AaveAsset = {
  symbol: string;
  underlying: `0x${string}`;
  aToken: `0x${string}`;
};

export const AAVE_ASSETS: Record<string, AaveAsset> = {
  USDT: {
    symbol: "USDT",
    underlying: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
    aToken: "0xDeE98402A302e4D707fB9bf2bac66fAEEc31e8Df",
  },
  WETH: {
    symbol: "WETH",
    underlying: "0xD221812de1BD094f35587EE8E174B07B6167D9Af",
    aToken: "0xf385280F36e009C157697D25E0B802EfaBfd789c",
  },
  USDm: {
    symbol: "USDm",
    underlying: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    aToken: "0xBba98352628B0B0c4b40583F593fFCb630935a45",
  },
  USDC: {
    symbol: "USDC",
    underlying: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
    aToken: "0xFF8309b9e99bfd2D4021bc71a362aBD93dBd4785",
  },
  CELO: {
    symbol: "CELO",
    underlying: "0x471EcE3750Da237f93B8E339c536989b8978a438",
    aToken: "0xC3e77dC389537Db1EEc7C33B95Cf3beECA71A209",
  },
  EURm: {
    symbol: "EURm",
    underlying: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
    aToken: "0x34c02571094e08E935B8cf8dC10F1Ad6795f1f81",
  },
};

export const AAVE_SUPPORTED_SYMBOLS = [
  "USDT",
  "WETH",
  "USDm",
  "USDC",
  "CELO",
  "EURm",
] as const;

export function resolveAaveAsset(token: string): AaveAsset {
  const normalized = token.trim();
  const known = findKnownToken(normalized);

  if (known) {
    const byKnownSymbol = AAVE_ASSETS[known.symbol];
    if (byKnownSymbol) {
      return byKnownSymbol;
    }
  }

  if (isAddress(normalized)) {
    const lower = normalized.toLowerCase();
    const byAddress = Object.values(AAVE_ASSETS).find(
      (asset) => asset.underlying.toLowerCase() === lower,
    );
    if (byAddress) {
      return byAddress;
    }
  }

  const bySymbol = Object.values(AAVE_ASSETS).find(
    (asset) => asset.symbol.toLowerCase() === normalized.toLowerCase(),
  );
  if (bySymbol) {
    return bySymbol;
  }

  throw new Error(
    `Token "${token}" is not supported on Aave V3 Celo. Supported: ${AAVE_SUPPORTED_SYMBOLS.join(", ")}.`,
  );
}
