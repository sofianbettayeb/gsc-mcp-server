#!/usr/bin/env node

import * as readline from "readline";
import {
  hasToken,
  authenticateInteractive,
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
╔══════════════════════════════════════════════════════════════════╗
║       Google Search Console MCP Server - Setup                   ║
╚══════════════════════════════════════════════════════════════════╝
`);

  // Check if already authenticated
  if (hasToken()) {
    console.log("✅ Already authenticated with Google!\n");
    showConfig();
    rl.close();
    return;
  }

  // Authenticate with Google
  console.log("🔐 Sign in with Google\n");
  console.log("A browser window will open for you to sign in with your Google account.");
  console.log("Make sure to use an account that has access to Google Search Console.\n");

  await question("Press Enter to open the browser...");

  try {
    await authenticateInteractive();
    console.log("\n✅ Authentication successful!\n");
    showConfig();
  } catch (error) {
    console.error(
      `\n❌ Authentication failed: ${error instanceof Error ? error.message : error}`
    );
    console.log("\n💡 Try running the setup again.\n");
    rl.close();
    process.exit(1);
  }

  rl.close();
}

function showConfig() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    ✅ Setup Complete!                            ║
╚══════════════════════════════════════════════════════════════════╝

Add this to your Claude Desktop config:

  macOS:   ~/Library/Application Support/Claude/claude_desktop_config.json
  Windows: %APPDATA%\\Claude\\claude_desktop_config.json

┌─────────────────────────────────────────────────────────────────┐
│  {                                                              │
│    "mcpServers": {                                              │
│      "google-search-console": {                                 │
│        "command": "npx",                                        │
│        "args": ["-y", "gsc-mcp-server"]                         │
│      }                                                          │
│    }                                                            │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘

Then restart Claude Desktop and try asking:
  "What are my top search queries this month?"
  "Is https://example.com/my-page indexed?"
  "Show me pages with high impressions but low CTR"
`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSetup();
}
