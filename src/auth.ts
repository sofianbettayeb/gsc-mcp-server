import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import open from "open";

const SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/webmasters",
];

// Default OAuth credentials - users can authenticate directly without creating their own
const DEFAULT_CREDENTIALS = {
  client_id: "349293510875-bpesdfm0s1frkfakltovgqm7n9vq8vi6.apps.googleusercontent.com",
  client_secret: "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",
  redirect_uris: ["http://localhost:3000/oauth2callback"],
};

const CONFIG_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || ".",
  ".gsc-mcp-server"
);
const TOKEN_PATH = path.join(CONFIG_DIR, "token.json");
const CREDENTIALS_PATH = path.join(CONFIG_DIR, "credentials.json");

interface Credentials {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
}

interface TokenData {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
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

export function hasCredentials(): boolean {
  // Always true since we have default credentials
  return true;
}

export function hasCustomCredentials(): boolean {
  return fs.existsSync(CREDENTIALS_PATH);
}

export function hasToken(): boolean {
  return fs.existsSync(TOKEN_PATH);
}

export function loadCredentials(): Credentials {
  // Try to load user's custom credentials first
  if (hasCustomCredentials()) {
    try {
      const content = fs.readFileSync(CREDENTIALS_PATH, "utf-8");
      const data = JSON.parse(content);
      // Support both formats: direct credentials or Google's downloaded format
      if (data.installed) {
        return data.installed;
      }
      if (data.web) {
        return data.web;
      }
      return data;
    } catch {
      // Fall through to default credentials
    }
  }
  // Return default credentials
  return DEFAULT_CREDENTIALS;
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

export async function getAuthenticatedClient(): Promise<OAuth2Client | null> {
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
        scope: SCOPES,
        prompt: "consent",
      });

      console.log("\n🔐 Opening browser for Google authentication...\n");
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
