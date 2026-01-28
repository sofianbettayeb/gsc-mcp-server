#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import open from "open";
import {
  hasCredentials,
  hasToken,
  saveCredentials,
  getCredentialsPath,
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
║                                                                  ║
║       This wizard takes about 2 minutes.                         ║
╚══════════════════════════════════════════════════════════════════╝
`);

  // Step 1: Check/set up credentials
  if (!hasCredentials()) {
    console.log("📋 STEP 1: Create Google OAuth Credentials\n");
    console.log("You need to create OAuth credentials (one-time setup).\n");

    const openBrowser = await question("Press Enter to open Google Cloud Console (or 's' to skip): ");

    if (openBrowser.toLowerCase() !== "s") {
      console.log("\n🌐 Opening Google Cloud Console...\n");
      await open("https://console.cloud.google.com/apis/credentials");
    }

    console.log(`
┌─────────────────────────────────────────────────────────────────┐
│  Follow these steps in Google Cloud Console:                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Create a new project (or select existing)                   │
│                                                                 │
│  2. Enable the Search Console API:                              │
│     → APIs & Services → Library → Search "Search Console API"   │
│     → Click Enable                                              │
│                                                                 │
│  3. Configure OAuth consent screen:                             │
│     → APIs & Services → OAuth consent screen                    │
│     → User Type: External → Create                              │
│     → Fill in app name, your email, and save                    │
│                                                                 │
│  4. Add yourself as a test user:                                │
│     → OAuth consent screen → Test users → Add Users             │
│     → Add your Gmail address                                    │
│                                                                 │
│  5. Create OAuth credentials:                                   │
│     → Credentials → Create Credentials → OAuth client ID        │
│     → Application type: "Desktop app"                           │
│     → Click Create, then Download JSON                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
`);

    const credentialsPath = await question(
      "Drag and drop your downloaded JSON file here (or paste path): "
    );

    // Clean up the path (remove quotes, trim whitespace)
    const cleanPath = credentialsPath.trim().replace(/^['"]|['"]$/g, "").replace(/\\ /g, " ");
    const resolvedPath = path.resolve(cleanPath);

    if (!fs.existsSync(resolvedPath)) {
      console.error(`\n❌ File not found: ${resolvedPath}`);
      console.log("\n💡 Tip: Try dragging the file directly into this terminal window.\n");
      rl.close();
      process.exit(1);
    }

    try {
      const content = fs.readFileSync(resolvedPath, "utf-8");
      const credentials = JSON.parse(content);

      // Extract credentials from Google's format
      let extracted;
      if (credentials.installed) {
        extracted = credentials.installed;
      } else if (credentials.web) {
        extracted = credentials.web;
      } else {
        extracted = credentials;
      }

      // Validate required fields
      if (!extracted.client_id || !extracted.client_secret) {
        throw new Error("Invalid credentials file: missing client_id or client_secret");
      }

      // Add localhost redirect URI if not present
      if (!extracted.redirect_uris || extracted.redirect_uris.length === 0) {
        extracted.redirect_uris = ["http://localhost:3000/oauth2callback"];
      }

      saveCredentials(extracted);
      console.log(`\n✅ Credentials saved!\n`);
    } catch (error) {
      console.error(
        `\n❌ Failed to read credentials: ${error instanceof Error ? error.message : error}`
      );
      rl.close();
      process.exit(1);
    }
  } else {
    console.log("✅ Step 1: Credentials already configured\n");
  }

  // Step 2: Authenticate with Google
  if (!hasToken()) {
    console.log("🔐 STEP 2: Sign in with Google\n");
    console.log("A browser window will open for you to sign in.\n");

    await question("Press Enter to open the browser...");

    try {
      await authenticateInteractive();
      console.log("\n✅ Authentication successful!\n");
    } catch (error) {
      console.error(
        `\n❌ Authentication failed: ${error instanceof Error ? error.message : error}`
      );
      console.log("\n💡 Common issues:");
      console.log("   • Make sure you added yourself as a test user");
      console.log("   • Check that Search Console API is enabled\n");
      rl.close();
      process.exit(1);
    }
  } else {
    console.log("✅ Step 2: Already authenticated\n");
  }

  // Step 3: Show configuration for Claude Desktop / MCP clients
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

  rl.close();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSetup();
}
