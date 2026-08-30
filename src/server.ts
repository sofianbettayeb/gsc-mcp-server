import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { GSCClient } from "./gsc-client.js";
import { TOOL_DEFINITIONS, handleToolCall } from "./tools.js";

/**
 * Build an MCP Server wired to the GSC tool handlers.
 * Transport-agnostic: callers connect it to stdio or streamable HTTP.
 */
export function createMcpServer(gscClient: GSCClient): Server {
  const server = new Server(
    {
      name: "gsc-mcp-server",
      version: "2.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: TOOL_DEFINITIONS,
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return handleToolCall(gscClient, name, args || {});
  });

  return server;
}
