import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppContext } from "../context/app-context.js";
import { addressSchema, tokenSymbolSchema } from "../schemas/common.js";
import type { ToolModule } from "./types.js";
import { err, ok } from "./helpers.js";

const uniswapInputSchema = z.object({
  tokenIn: tokenSymbolSchema.describe("Input token symbol or address"),
  tokenOut: tokenSymbolSchema.describe("Output token symbol or address"),
  amount: z.string().describe("Human-readable amount of tokenIn, e.g. 100"),
});

const uniswapWalletSchema = uniswapInputSchema.extend({
  recipient: addressSchema
    .optional()
    .describe("Address that receives output tokens (defaults to signer)"),
  slippageTolerance: z
    .number()
    .min(0)
    .max(20)
    .optional()
    .describe("Max slippage in percent (default 0.5)"),
  deadlineMinutes: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Transaction deadline in minutes (default 5)"),
});

export const uniswapTools: ToolModule = {
  register(server: McpServer, ctx: AppContext) {
    server.registerTool(
      "get_uniswap_quote",
      {
        title: "Get Uniswap Quote",
        description:
          "Get an expected Uniswap v4 swap output for a token pair on Celo mainnet (AMM pools). Read-only; no wallet required.",
        inputSchema: uniswapInputSchema,
        annotations: { readOnlyHint: true },
      },
      async ({ tokenIn, tokenOut, amount }) => {
        try {
          return ok(await ctx.uniswap.getSwapQuote(tokenIn, tokenOut, amount));
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "estimate_uniswap_swap",
      {
        title: "Estimate Uniswap Swap",
        description:
          "Estimate gas for a Uniswap v4 swap on Celo mainnet, including ERC-20 and Permit2 approvals when needed. Requires CELO_PRIVATE_KEY in MCP server env.",
        inputSchema: uniswapWalletSchema,
        annotations: { readOnlyHint: true },
      },
      async ({
        tokenIn,
        tokenOut,
        amount,
        recipient,
        slippageTolerance,
        deadlineMinutes,
      }) => {
        try {
          return ok(
            await ctx.uniswap.estimateSwap(tokenIn, tokenOut, amount, {
              recipient: recipient as `0x${string}` | undefined,
              slippageTolerance,
              deadlineMinutes,
            }),
          );
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "execute_uniswap_swap",
      {
        title: "Execute Uniswap Swap",
        description:
          "Execute a Uniswap v4 swap on Celo mainnet via Universal Router. Sends ERC-20 approve and Permit2 approvals first when needed, then the swap. Requires CELO_PRIVATE_KEY in MCP server env.",
        inputSchema: uniswapWalletSchema,
        annotations: {
          destructiveHint: true,
          openWorldHint: true,
        },
      },
      async ({
        tokenIn,
        tokenOut,
        amount,
        recipient,
        slippageTolerance,
        deadlineMinutes,
      }) => {
        try {
          return ok(
            await ctx.uniswap.executeSwap(tokenIn, tokenOut, amount, {
              recipient: recipient as `0x${string}` | undefined,
              slippageTolerance,
              deadlineMinutes,
            }),
          );
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );
  },
};
