#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  getAuthenticatedClient,
  hasToken,
} from "./auth.js";
import { GSCClient } from "./gsc-client.js";
import { TOOL_DEFINITIONS, handleToolCall } from "./tools.js";

// Check if this is a setup command
const args = process.argv.slice(2);
if (args.includes("--setup") || args.includes("setup")) {
  // Dynamic import for setup to keep main entry clean
  import("./setup.js").then((setup) => setup.runSetup());
} else {
  // Run as MCP server
  startServer();
}

async function startServer() {
  // Check for authentication
  if (!hasToken()) {
    console.error(`
╔══════════════════════════════════════════════════════════════════╗
║  Google Search Console MCP Server - Setup Required               ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Run: npx gsc-mcp-server --setup                                 ║
║                                                                  ║
║  This will open a browser for you to sign in with Google.        ║
╚══════════════════════════════════════════════════════════════════╝
`);
    process.exit(1);
  }

  // Get authenticated client
  const auth = await getAuthenticatedClient();
  if (!auth) {
    console.error("Session expired. Run: npx gsc-mcp-server --setup");
    process.exit(1);
  }

  const gscClient = new GSCClient(auth);

  // Create MCP server
  const server = new Server(
    {
      name: "gsc-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: TOOL_DEFINITIONS,
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return handleToolCall(gscClient, name, args || {});
  });

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await server.close();
    process.exit(0);
  });
}
