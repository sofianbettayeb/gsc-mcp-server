#!/usr/bin/env node

import * as readline from "readline";
import {
  hasCredentials,
  hasToken,
  authenticateInteractive,
  getCredentialsPath,
  loadCredentials,
} from "./auth.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

export async function runSetup() {
  console.log(`
Google Search Console MCP Server - Setup
`);

  if (!hasCredentials()) {
    console.error(`No OAuth client found.

This server requires your own Google Cloud OAuth client:

  1. Go to https://console.cloud.google.com/
  2. Create a project and enable the Search Console API
  3. Create OAuth 2.0 credentials (Desktop app)
  4. Then either:
     - export GOOGLE_CLIENT_ID=... and GOOGLE_CLIENT_SECRET=..., or
     - save the downloaded client JSON to ${getCredentialsPath()}

Run this setup again afterwards.
`);
    rl.close();
    process.exit(1);
  }

  // Check if already authenticated
  if (hasToken()) {
    console.log("Already authenticated with Google.\n");
    showConfig();
    rl.close();
    return;
  }

  // Authenticate with Google
  console.log("Sign in with Google\n");
  console.log("A browser window will open for you to sign in with your Google account.");
  console.log("Make sure to use an account that has access to Google Search Console.\n");

  await question("Press Enter to open the browser...");

  try {
    const client = await authenticateInteractive();
    console.log("\nAuthentication successful!\n");

    const refreshToken = client.credentials.refresh_token;
    if (refreshToken) {
      const credentials = loadCredentials();
      console.log(`To deploy this server remotely (HTTP mode), set these environment
variables on your host:

  GOOGLE_CLIENT_ID=${credentials?.client_id || "<your client id>"}
  GOOGLE_CLIENT_SECRET=<your client secret>
  GOOGLE_REFRESH_TOKEN=${refreshToken}

Keep the refresh token secret: it grants access to your Search Console data.
`);
    }

    showConfig();
  } catch (error) {
    console.error(
      `\nAuthentication failed: ${error instanceof Error ? error.message : error}`
    );
    console.log("\nTry running the setup again.\n");
    rl.close();
    process.exit(1);
  }

  rl.close();
}

function showConfig() {
  console.log(`Setup complete.

For local use with Claude Desktop, add this to your config:

  macOS:   ~/Library/Application Support/Claude/claude_desktop_config.json
  Windows: %APPDATA%\\Claude\\claude_desktop_config.json

  {
    "mcpServers": {
      "google-search-console": {
        "command": "npx",
        "args": ["-y", "gsc-mcp-server"]
      }
    }
  }

Then restart Claude Desktop and try asking:
  "What are my top search queries this month?"
  "Is https://example.com/my-page indexed?"
  "Show me pages with high impressions but low CTR"

For remote use (claude.ai connectors, Claude Code on the web), see the
Remote deployment section of the README.
`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSetup();
}
