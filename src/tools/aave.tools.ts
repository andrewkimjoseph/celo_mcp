import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppContext } from "../context/app-context.js";
import { AAVE_SUPPORTED_SYMBOLS } from "@andrewkimjoseph/celina-sdk";
import { tokenSymbolSchema } from "../schemas/common.js";
import type { ToolModule } from "./types.js";
import { err, ok } from "./helpers.js";

const supportedTokens = AAVE_SUPPORTED_SYMBOLS.join(", ");

export const aaveTools: ToolModule = {
  register(server: McpServer, ctx: AppContext) {
    server.registerTool(
      "supply_aave",
      {
        title: "Supply Aave",
        description:
          `Supply (lend) tokens to Aave V3 on Celo mainnet. Supported: ${supportedTokens}. Deposits the underlying token and receives interest-bearing aTokens. Sends ERC-20 approval first if needed. CELO requires wrapped CELO (ERC-20), not native CELO. Requires CELO_PRIVATE_KEY in MCP server env.`,
        inputSchema: z.object({
          token: tokenSymbolSchema.describe(
            `Token to supply (${supportedTokens}; aliases cUSD/cEUR accepted)`,
          ),
          amount: z.string().describe("Human-readable token amount, e.g. 100"),
        }),
        annotations: {
          destructiveHint: true,
          openWorldHint: true,
        },
      },
      async ({ token, amount }) => {
        try {
          return ok(await ctx.aave.supply(token, amount));
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );

    server.registerTool(
      "withdraw_aave",
      {
        title: "Withdraw Aave",
        description:
          `Withdraw tokens from Aave V3 on Celo mainnet by redeeming aTokens. Supported: ${supportedTokens}. Requires CELO_PRIVATE_KEY in MCP server env.`,
        inputSchema: z.object({
          token: tokenSymbolSchema.describe(
            `Token to withdraw (${supportedTokens}; aliases cUSD/cEUR accepted)`,
          ),
          amount: z
            .string()
            .optional()
            .describe("Human-readable token amount, e.g. 100 (omit when withdrawMax is true)"),
          withdrawMax: z
            .boolean()
            .optional()
            .describe("Withdraw the full supplied balance from Aave for this token"),
        }),
        annotations: {
          destructiveHint: true,
          openWorldHint: true,
        },
      },
      async ({ token, amount, withdrawMax }) => {
        try {
          return ok(await ctx.aave.withdraw(token, amount, withdrawMax));
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );
  },
};
