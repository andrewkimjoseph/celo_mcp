import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppContext } from "../context/app-context.js";
import type { ToolModule } from "./types.js";
import {
  getEncryptionInfo,
  isWalletEncryptionConfigured,
} from "../crypto/wallet-key-crypto.js";
import { err, ok } from "./helpers.js";

export const walletTools: ToolModule = {
  register(server: McpServer, _ctx: AppContext) {
    server.registerTool(
      "get_wallet_encryption_public_key",
      {
        title: "Get Wallet Encryption Public Key",
        description:
          "Returns the server's RSA public key for encrypting private keys before write operations.",
        inputSchema: {},
        annotations: { readOnlyHint: true },
      },
      async () => {
        try {
          if (!isWalletEncryptionConfigured()) {
            return err(
              "Wallet encryption is not configured. For local stdio mode, set CELO_PRIVATE_KEY instead.",
            );
          }
          return ok(getEncryptionInfo());
        } catch (error) {
          return err(error instanceof Error ? error.message : String(error));
        }
      },
    );
  },
};
