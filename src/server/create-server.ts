import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig } from "../config/env.js";
import { CeloClientFactory } from "../clients/celo-client.js";
import { createAppContext } from "../context/app-context.js";
import { registerAllTools } from "../tools/index.js";
import { SERVER_INSTRUCTIONS } from "./instructions.js";

export function createServer(): McpServer {
  const config = loadConfig();
  const clientFactory = new CeloClientFactory(config);
  const clients = clientFactory.getClients();

  const server = new McpServer(
    { name: "celina", version: "0.2.0" },
    {
      instructions: SERVER_INSTRUCTIONS,
      capabilities: {
        tools: { listChanged: true },
        logging: {},
      },
    },
  );

  registerAllTools(
    server,
    createAppContext(clientFactory, clients.accountAddress),
  );

  return server;
}
