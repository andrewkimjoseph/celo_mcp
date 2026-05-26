import { toCoinType } from "viem";
import { celo } from "viem/chains";
import { getEnsAddress, normalize } from "viem/ens";
import {
  ENS_CCIP_GATEWAY,
  type EnsClientFactory,
} from "../clients/ens-client.js";

export type EnsResolveChain = "celo" | "ethereum";

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export type ResolvedRecipient = {
  address: `0x${string}`;
  ens?: {
    name: string;
    normalizedName: string;
    resolvedVia?: "celo" | "ethereum";
  };
};

export class EnsService {
  constructor(private readonly ensClientFactory: EnsClientFactory) {}

  async resolveEns(name: string, chain: EnsResolveChain = "celo") {
    const trimmedName = name.trim();
    const normalizedName = normalize(trimmedName);
    const client = this.ensClientFactory.getClient();
    const gatewayUrls = [ENS_CCIP_GATEWAY];

    if (chain === "ethereum") {
      const address = await getEnsAddress(client, {
        name: normalizedName,
        gatewayUrls,
      });

      if (!address) {
        throw new Error(
          `ENS name "${trimmedName}" has no Ethereum address record`,
        );
      }

      return {
        name: trimmedName,
        normalizedName,
        address,
        coinType: "60",
        chain: "ethereum" as const,
      };
    }

    const celoCoinType = toCoinType(celo.id);
    let address = await getEnsAddress(client, {
      name: normalizedName,
      coinType: celoCoinType,
      gatewayUrls,
    });

    let coinType = celoCoinType.toString();
    let resolvedVia: "celo" | "ethereum" = "celo";

    if (!address) {
      address = await getEnsAddress(client, {
        name: normalizedName,
        gatewayUrls,
      });
      coinType = "60";
      resolvedVia = "ethereum";
    }

    if (!address) {
      throw new Error(
        `ENS name "${trimmedName}" could not be resolved to an address`,
      );
    }

    return {
      name: trimmedName,
      normalizedName,
      address,
      coinType,
      chain: "celo" as const,
      resolvedVia,
    };
  }

  async resolveAddressOrEns(input: string): Promise<ResolvedRecipient> {
    const trimmed = input.trim();

    if (ADDRESS_PATTERN.test(trimmed)) {
      return { address: trimmed as `0x${string}` };
    }

    const resolved = await this.resolveEns(trimmed);
    return {
      address: resolved.address as `0x${string}`,
      ens: {
        name: resolved.name,
        normalizedName: resolved.normalizedName,
        ...(resolved.chain === "celo"
          ? { resolvedVia: resolved.resolvedVia }
          : {}),
      },
    };
  }
}
