#!/usr/bin/env node

import express, { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { getAuthFromEnv } from "./auth.js";
import { GSCClient } from "./gsc-client.js";
import { createMcpServer } from "./server.js";

const PORT = Number(process.env.PORT || 8080);
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;

function isAuthorized(req: Request): boolean {
  if (!AUTH_TOKEN) {
    return true;
  }
  if (req.headers.authorization === `Bearer ${AUTH_TOKEN}`) {
    return true;
  }
  // Fallback for clients that can't send custom headers (e.g. claude.ai
  // custom connectors): the token as a URL path segment, /mcp/<token>
  return req.params.token === AUTH_TOKEN;
}

function unauthorized(res: Response): void {
  res.status(401).json({
    jsonrpc: "2.0",
    error: { code: -32001, message: "Unauthorized" },
    id: null,
  });
}

async function main() {
  let auth;
  try {
    auth = getAuthFromEnv();
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
  if (!auth) {
    console.error(`
Google Search Console MCP Server (HTTP) - credentials required

Set one of these credential configurations:

  Service account (recommended, GSC_READ_ONLY=true for read-only):
    GOOGLE_SERVICE_ACCOUNT_KEY       key JSON (raw or base64), or
    GOOGLE_SERVICE_ACCOUNT_KEY_FILE  path to the key JSON file

  OAuth client + refresh token:
    GOOGLE_CLIENT_ID
    GOOGLE_CLIENT_SECRET
    GOOGLE_REFRESH_TOKEN   (get one with: npx gsc-mcp-server --setup)

Optional:
  MCP_AUTH_TOKEN  shared secret required from MCP clients
  PORT            listen port (default 8080)

See https://github.com/sofianbettayeb/gsc-mcp-server#readme
`);
    process.exit(1);
  }

  const gscClient = new GSCClient(auth);

  const app = express();
  app.use(express.json({ limit: "4mb" }));

  app.get("/healthz", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  const handleMcp = async (req: Request, res: Response) => {
    if (!isAuthorized(req)) {
      unauthorized(res);
      return;
    }

    // Stateless mode: a fresh Server + transport per request, all sharing
    // one authenticated GSC client
    const server = createMcpServer(gscClient);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      transport.close();
      server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error("Error handling MCP request:", err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  };

  // Stateless streamable HTTP: sessions and server-initiated streams are
  // not supported, so GET/DELETE get 405 per the MCP spec
  const methodNotAllowed = (req: Request, res: Response) => {
    if (!isAuthorized(req)) {
      unauthorized(res);
      return;
    }
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed" },
      id: null,
    });
  };

  app.post("/mcp", handleMcp);
  app.post("/mcp/:token", handleMcp);
  app.get(["/mcp", "/mcp/:token"], methodNotAllowed);
  app.delete(["/mcp", "/mcp/:token"], methodNotAllowed);

  app.listen(PORT, () => {
    console.log(`gsc-mcp-server listening on port ${PORT}`);
    console.log(`MCP endpoint: /mcp${AUTH_TOKEN ? " (auth token required)" : " (no auth token set)"}`);
    if (!AUTH_TOKEN) {
      console.warn(
        "Warning: MCP_AUTH_TOKEN is not set. Anyone who can reach this server can query your Search Console data."
      );
    }
  });
}

main();
