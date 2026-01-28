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
  return fs.existsSync(CREDENTIALS_PATH);
}

export function hasToken(): boolean {
  return fs.existsSync(TOKEN_PATH);
}

export function loadCredentials(): Credentials | null {
  if (!hasCredentials()) {
    return null;
  }
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
    return null;
  }
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

export async function authenticateInteractive(): Promise<OAuth2Client> {
  const credentials = loadCredentials();
  if (!credentials) {
    throw new Error(
      `No credentials found. Please save your Google OAuth credentials to ${CREDENTIALS_PATH}`
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
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end(`
              <html>
                <body style="font-family: system-ui; padding: 40px; text-align: center;">
                  <h1>❌ Authentication Failed</h1>
                  <p>Error: ${error}</p>
                  <p>You can close this window.</p>
                </body>
              </html>
            `);
            server.close();
            reject(new Error(`OAuth error: ${error}`));
            return;
          }

          if (!code) {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end(`
              <html>
                <body style="font-family: system-ui; padding: 40px; text-align: center;">
                  <h1>❌ No Authorization Code</h1>
                  <p>No authorization code received.</p>
                  <p>You can close this window.</p>
                </body>
              </html>
            `);
            server.close();
            reject(new Error("No authorization code received"));
            return;
          }

          // Exchange code for tokens
          const { tokens } = await oauth2Client.getToken(code);
          oauth2Client.setCredentials(tokens);
          saveToken(tokens as TokenData);

          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(`
            <html>
              <body style="font-family: system-ui; padding: 40px; text-align: center;">
                <h1>✅ Authentication Successful!</h1>
                <p>Google Search Console MCP Server is now connected.</p>
                <p>You can close this window and return to your terminal.</p>
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
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <body style="font-family: system-ui; padding: 40px; text-align: center;">
              <h1>❌ Error</h1>
              <p>${err instanceof Error ? err.message : "Unknown error"}</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
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
