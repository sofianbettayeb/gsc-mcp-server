#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { getAuthenticatedClient, hasCredentials } from "./auth.js";
import { GSCClient } from "./gsc-client.js";
import { createMcpServer } from "./server.js";

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
  if (!hasCredentials()) {
    console.error(`
Google Search Console MCP Server - OAuth client required

This server no longer ships with shared OAuth credentials. Create your
own OAuth client in Google Cloud Console (enable the Search Console
API), then either:

  1. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment
     variables, or
  2. Save the downloaded client JSON to ~/.gsc-mcp-server/credentials.json

Then run: npx gsc-mcp-server --setup

See https://github.com/sofianbettayeb/gsc-mcp-server#readme
`);
    process.exit(1);
  }

  // Get authenticated client (env credentials first, then saved token)
  const auth = await getAuthenticatedClient();
  if (!auth) {
    console.error("Not authenticated or session expired. Run: npx gsc-mcp-server --setup");
    process.exit(1);
  }

  const gscClient = new GSCClient(auth);
  const server = createMcpServer(gscClient);

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
