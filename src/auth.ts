import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import open from "open";

const FULL_SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/webmasters",
];
const READONLY_SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];

export function getScopes(): string[] {
  return process.env.GSC_READ_ONLY === "true" ? READONLY_SCOPES : FULL_SCOPES;
}

const CONFIG_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || ".",
  ".gsc-mcp-server"
);
const TOKEN_PATH = path.join(CONFIG_DIR, "token.json");
const CREDENTIALS_PATH = path.join(CONFIG_DIR, "credentials.json");

interface Credentials {
  client_id: string;
  client_secret: string;
  redirect_uris?: string[];
}

interface TokenData {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
}

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

export function getCredentialsPath(): string {
  return CREDENTIALS_PATH;
}

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function hasCustomCredentials(): boolean {
  return fs.existsSync(CREDENTIALS_PATH);
}

export function hasToken(): boolean {
  return fs.existsSync(TOKEN_PATH);
}

/**
 * Load an OAuth client id/secret for this deployment.
 *
 * Order of precedence:
 *   1. GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET environment variables
 *   2. ~/.gsc-mcp-server/credentials.json (a file you downloaded from
 *      Google Cloud Console, "installed" or "web" format)
 *
 * There is no bundled fallback: every deployment must supply its own
 * OAuth client.
 */
export function loadCredentials(): Credentials | null {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }
  if (hasCustomCredentials()) {
    try {
      const content = fs.readFileSync(CREDENTIALS_PATH, "utf-8");
      const data = JSON.parse(content);
      if (data.installed) return data.installed;
      if (data.web) return data.web;
      return data;
    } catch {
      return null;
    }
  }
  return null;
}

export function hasCredentials(): boolean {
  return loadCredentials() !== null;
}

export function saveCredentials(credentials: Credentials): void {
  ensureConfigDir();
  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2), {
    mode: 0o600,
  });
}

function loadToken(): TokenData | null {
  if (!hasToken()) {
    return null;
  }
  try {
    const content = fs.readFileSync(TOKEN_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function saveToken(token: TokenData): void {
  ensureConfigDir();
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2), { mode: 0o600 });
}

export function createOAuth2Client(credentials: Credentials): OAuth2Client {
  const redirectUri =
    credentials.redirect_uris?.[0] || "http://localhost:3000/oauth2callback";
  return new google.auth.OAuth2(
    credentials.client_id,
    credentials.client_secret,
    redirectUri
  );
}

function parseServiceAccountKey(raw: string): {
  client_email: string;
  private_key: string;
} | null {
  const tryParse = (s: string) => {
    try {
      const data = JSON.parse(s);
      if (data.client_email && data.private_key) return data;
    } catch {
      // not JSON
    }
    return null;
  };
  // Accept raw JSON or base64-encoded JSON (easier to store in some hosts)
  return (
    tryParse(raw) || tryParse(Buffer.from(raw, "base64").toString("utf-8"))
  );
}

/**
 * Build an authenticated Google client purely from environment variables.
 * Used by the remote HTTP server, and preferred by the stdio server too.
 *
 * Supported configurations:
 *   1. Service account:
 *      GOOGLE_SERVICE_ACCOUNT_KEY      full key JSON (or base64 of it)
 *      GOOGLE_SERVICE_ACCOUNT_KEY_FILE path to the key JSON file
 *      (add the service account's email to your GSC properties)
 *   2. OAuth client + refresh token:
 *      GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
 *
 * Set GSC_READ_ONLY=true to restrict the service account to the
 * read-only Search Console scope.
 *
 * Returns null if neither configuration is present.
 */
export function getAuthFromEnv(): OAuth2Client | null {
  let keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyRaw && process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
    try {
      keyRaw = fs.readFileSync(
        process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
        "utf-8"
      );
    } catch {
      throw new Error(
        `Could not read GOOGLE_SERVICE_ACCOUNT_KEY_FILE: ${process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE}`
      );
    }
  }
  if (keyRaw) {
    const key = parseServiceAccountKey(keyRaw);
    if (!key) {
      throw new Error(
        "GOOGLE_SERVICE_ACCOUNT_KEY is set but is not valid service account JSON (raw or base64)."
      );
    }
    // JWT extends OAuth2Client, so downstream code is unchanged
    return new google.auth.JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: getScopes(),
    });
  }

  const {
    GOOGLE_CLIENT_ID: clientId,
    GOOGLE_CLIENT_SECRET: clientSecret,
    GOOGLE_REFRESH_TOKEN: refreshToken,
  } = process.env;
  if (clientId && clientSecret && refreshToken) {
    const client = new google.auth.OAuth2(clientId, clientSecret);
    client.setCredentials({ refresh_token: refreshToken });
    return client;
  }

  return null;
}

/**
 * Get an authenticated client for the stdio (local) server.
 * Environment-based credentials win; otherwise fall back to the token
 * saved by `npx gsc-mcp-server --setup`.
 */
export async function getAuthenticatedClient(): Promise<OAuth2Client | null> {
  const envClient = getAuthFromEnv();
  if (envClient) {
    return envClient;
  }

  const credentials = loadCredentials();
  if (!credentials) {
    return null;
  }

  const oauth2Client = createOAuth2Client(credentials);
  const token = loadToken();

  if (!token) {
    return null;
  }

  oauth2Client.setCredentials(token);

  // Check if token needs refresh
  if (token.expiry_date && token.expiry_date < Date.now()) {
    try {
      const { credentials: newCredentials } =
        await oauth2Client.refreshAccessToken();
      saveToken(newCredentials as TokenData);
      oauth2Client.setCredentials(newCredentials);
    } catch {
      // Token refresh failed, need to re-authenticate
      return null;
    }
  }

  return oauth2Client;
}

function errorPage(title: string, message: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Error - GSC MCP Server</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .card {
            background: white;
            border-radius: 16px;
            padding: 48px;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            max-width: 420px;
          }
          .icon {
            width: 64px;
            height: 64px;
            background: #ef4444;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
          }
          .icon svg { width: 32px; height: 32px; color: white; }
          h1 { font-size: 24px; color: #1f2937; margin-bottom: 12px; }
          p { color: #6b7280; line-height: 1.6; }
          .hint { margin-top: 24px; font-size: 14px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">
            <svg fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h1>${title}</h1>
          <p>${message}</p>
          <p class="hint">You can close this window.</p>
        </div>
      </body>
    </html>
  `;
}

export async function authenticateInteractive(): Promise<OAuth2Client> {
  const credentials = loadCredentials();
  if (!credentials) {
    throw new Error(
      "No OAuth client configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, " +
        `or save your Google Cloud OAuth client JSON to ${CREDENTIALS_PATH}. ` +
        "See the README for how to create one."
    );
  }

  // Start local server to receive the callback
  const port = 3000;
  const redirectUri = `http://localhost:${port}/oauth2callback`;

  // Create client with the correct redirect URI for interactive auth
  const oauth2Client = new google.auth.OAuth2(
    credentials.client_id,
    credentials.client_secret,
    redirectUri
  );

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url || "", `http://localhost:${port}`);

        if (url.pathname === "/oauth2callback") {
          const code = url.searchParams.get("code");
          const error = url.searchParams.get("error");

          if (error) {
            res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
            res.end(errorPage("Authentication Failed", error));
            server.close();
            reject(new Error(`OAuth error: ${error}`));
            return;
          }

          if (!code) {
            res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
            res.end(errorPage("No Authorization Code", "No authorization code was received from Google."));
            server.close();
            reject(new Error("No authorization code received"));
            return;
          }

          // Exchange code for tokens
          const { tokens } = await oauth2Client.getToken(code);
          oauth2Client.setCredentials(tokens);
          saveToken(tokens as TokenData);

          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <title>Connected - GSC MCP Server</title>
                <style>
                  * { margin: 0; padding: 0; box-sizing: border-box; }
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  }
                  .card {
                    background: white;
                    border-radius: 16px;
                    padding: 48px;
                    text-align: center;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    max-width: 420px;
                  }
                  .icon {
                    width: 64px;
                    height: 64px;
                    background: #10b981;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 24px;
                  }
                  .icon svg { width: 32px; height: 32px; color: white; }
                  h1 { font-size: 24px; color: #1f2937; margin-bottom: 12px; }
                  p { color: #6b7280; line-height: 1.6; }
                  .hint { margin-top: 24px; font-size: 14px; color: #9ca3af; }
                </style>
              </head>
              <body>
                <div class="card">
                  <div class="icon">
                    <svg fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <h1>Authentication Successful!</h1>
                  <p>Google Search Console MCP Server is now connected to your account.</p>
                  <p class="hint">You can close this window and return to your terminal.</p>
                </div>
              </body>
            </html>
          `);

          server.close();
          resolve(oauth2Client);
        } else {
          res.writeHead(404);
          res.end("Not found");
        }
      } catch (err) {
        res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
        res.end(errorPage("Error", err instanceof Error ? err.message : "An unknown error occurred."));
        server.close();
        reject(err);
      }
    });

    server.listen(port, () => {
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: getScopes(),
        prompt: "consent",
      });

      console.log("\nOpening browser for Google authentication...\n");
      console.log("If the browser doesn't open, visit this URL manually:");
      console.log(`\n${authUrl}\n`);

      open(authUrl).catch(() => {
        // Browser open failed, user will need to copy URL manually
      });
    });

    server.on("error", (err) => {
      reject(
        new Error(
          `Failed to start authentication server on port ${port}: ${err.message}`
        )
      );
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error("Authentication timed out after 5 minutes"));
    }, 5 * 60 * 1000);
  });
}
