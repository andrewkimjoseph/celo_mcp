import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppContext } from "../context/app-context.js";
import type { ToolModule } from "./types.js";
import { addressOrEnsSchema, tokenSymbolSchema } from "../schemas/common.js";
import { err, ok } from "./helpers.js";

const encryptedPrivateKeySchema = z
  .string()
  .optional()
  .describe(
    "RSA-OAEP encrypted private key (base64). Encrypt locally with get_wallet_encryption_public_key.",
  );

export const transactionTools: ToolModule = {
  register(server: McpServer, ctx: AppContext) {
    server.registerTool(
      "estimate_send",
      {
        title: "Estimate Send",
        description:
          "Estimates gas for sending CELO or an ERC-20 token on mainnet. Accepts a 0x address or ENS name as recipient. Requires encryptedPrivateKey (hosted) or CELO_PRIVATE_KEY (local).",
        inputSchema: z.object({
          to: addressOrEnsSchema,
          token: tokenSymbolSchema.default("CELO"),
          amount: z.string().describe("Human-readable amount, e.g. 1.5"),
          encryptedPrivateKey: encryptedPrivateKeySchema,
        }),
        annotations: { readOnlyHint: true },
      },
      async ({ to, token, amount, encryptedPrivateKey }) => {
        try {
          const { address, ens } = await ctx.ens.resolveAddressOrEns(to);
          const estimate = await ctx.transaction.estimateSend(
            address,
            token,
            amount,
            encryptedPrivateKey,
          );
          return ok(ens ? { ...estimate, ens } : estimate);
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "send_token",
      {
        title: "Send Token",
        description:
          "Send CELO or an ERC-20 token on mainnet. Accepts a 0x address or ENS name as recipient. User must encrypt their private key with the server's public key (get_wallet_encryption_public_key) before calling.",
        inputSchema: z.object({
          to: addressOrEnsSchema,
          token: tokenSymbolSchema.default("CELO"),
          amount: z.string().describe("Human-readable amount, e.g. 0.01"),
          encryptedPrivateKey: encryptedPrivateKeySchema,
        }),
        annotations: {
          destructiveHint: true,
          openWorldHint: true,
        },
      },
      async ({ to, token, amount, encryptedPrivateKey }) => {
        try {
          const { address, ens } = await ctx.ens.resolveAddressOrEns(to);
          const result = await ctx.transaction.sendToken(
            address,
            token,
            amount,
            encryptedPrivateKey,
          );
          return ok(ens ? { ...result, ens } : result);
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );
  },
};
