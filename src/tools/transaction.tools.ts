import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppContext } from "../context/app-context.js";
import type { ToolModule } from "./types.js";
import {
  addressSchema,
  networkSchema,
  resolveNetwork,
  tokenSymbolSchema,
} from "../schemas/common.js";
import { err, ok } from "./helpers.js";

export const transactionTools: ToolModule = {
  register(server: McpServer, ctx: AppContext) {
    server.registerTool(
      "estimate_send",
      {
        title: "Estimate Send",
        description:
          "Estimates gas for sending CELO or an ERC-20 token. Requires CELO_PRIVATE_KEY.",
        inputSchema: z.object({
          to: addressSchema,
          token: tokenSymbolSchema.default("CELO"),
          amount: z.string().describe("Human-readable amount, e.g. 1.5"),
          network: networkSchema.optional(),
        }),
        annotations: { readOnlyHint: true },
      },
      async ({ to, token, amount, network }) => {
        try {
          const resolved = resolveNetwork(network, ctx.config.defaultNetwork);
          return ok(
            await ctx.transaction.estimateSend(
              resolved,
              to as `0x${string}`,
              token,
              amount,
            ),
          );
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
          "Send CELO or an ERC-20 token from the configured wallet. Requires CELO_PRIVATE_KEY.",
        inputSchema: z.object({
          to: addressSchema,
          token: tokenSymbolSchema.default("CELO"),
          amount: z.string().describe("Human-readable amount, e.g. 0.01"),
          network: networkSchema.optional(),
        }),
        annotations: {
          destructiveHint: true,
          openWorldHint: true,
        },
      },
      async ({ to, token, amount, network }) => {
        try {
          const resolved = resolveNetwork(network, ctx.config.defaultNetwork);
          return ok(
            await ctx.transaction.sendToken(
              resolved,
              to as `0x${string}`,
              token,
              amount,
            ),
          );
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "get_swap_quote",
      {
        title: "Get Swap Quote",
        description:
          "Preview a token swap on Celo. Routing integration is stubbed for v0.1.",
        inputSchema: z.object({
          fromToken: tokenSymbolSchema,
          toToken: tokenSymbolSchema,
          amount: z.string(),
          network: networkSchema.optional(),
        }),
        annotations: { readOnlyHint: true },
      },
      async ({ fromToken, toToken, amount, network }) => {
        try {
          const resolved = resolveNetwork(network, ctx.config.defaultNetwork);
          return ok(
            await ctx.transaction.getSwapQuote(
              resolved,
              fromToken,
              toToken,
              amount,
            ),
          );
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );
  },
};
