import type { PreparedTx } from "@andrewkimjoseph/celina-sdk";
import { type Hex } from "viem";
import type { CeloClients } from "../clients/celo-client.js";

export interface ExecutedPreparedFlow {
  stepHashes: `0x${string}`[];
  hash: `0x${string}`;
  status: "success" | "reverted";
}

export function requireWalletClients(clients: CeloClients): CeloClients & {
  wallet: NonNullable<CeloClients["wallet"]>;
  accountAddress: `0x${string}`;
} {
  if (!clients.wallet || !clients.accountAddress) {
    throw new Error(
      "No wallet configured. Set CELO_PRIVATE_KEY in the MCP server env.",
    );
  }

  return {
    ...clients,
    wallet: clients.wallet,
    accountAddress: clients.accountAddress,
  };
}

/**
 * Sign and broadcast prepared SDK steps sequentially with the MCP server wallet.
 * Prepared steps already include the CELINA calldata suffix.
 */
export async function executePreparedFlow(
  clients: CeloClients,
  steps: PreparedTx[],
): Promise<ExecutedPreparedFlow> {
  const { wallet, public: publicClient } = requireWalletClients(clients);

  const account = wallet.account;
  if (!account) {
    throw new Error("Wallet account unavailable.");
  }

  const chain = publicClient.chain;
  if (!chain) {
    throw new Error("Chain configuration missing.");
  }

  const stepHashes: `0x${string}`[] = [];

  for (const step of steps) {
    const hash = await wallet.sendTransaction({
      chain,
      account,
      to: step.to,
      data: step.data as Hex | undefined,
      value: step.value ? BigInt(step.value) : undefined,
    });

    stepHashes.push(hash);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === "reverted") {
      throw new Error(`Transaction reverted: ${hash} (${step.description})`);
    }
  }

  const hash = stepHashes[stepHashes.length - 1]!;
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  return {
    stepHashes,
    hash,
    status: receipt.status,
  };
}
