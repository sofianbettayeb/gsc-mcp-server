# Google Search Console MCP Server

<img width="459" height="209" alt="image" src="https://github.com/user-attachments/assets/d0cec128-c0b3-443c-a6e7-54b63e10db71" />

Connect Claude to your Google Search Console data. Query search analytics, check indexing status, and manage sitemaps through natural conversation.

Runs in 2 modes:

- **Remote (HTTP)**: a long-lived HTTP service you deploy anywhere, then add to claude.ai as a custom connector or to Claude Code as an HTTP MCP server. Works from web and cloud sessions.
- **Local (stdio)**: the classic `npx gsc-mcp-server` setup for Claude Desktop on your machine.

> **Breaking change in v2**: the bundled shared OAuth client has been removed. Every deployment now needs its own Google Cloud credentials. See [Create your Google credentials](#1-create-your-google-credentials).

## Available Tools

| Tool | Description |
|------|-------------|
| `gsc_list_sites` | List all your Search Console properties |
| `gsc_search_analytics` | Query clicks, impressions, CTR, and position |
| `gsc_inspect_url` | Check if a URL is indexed |
| `gsc_list_sitemaps` | List submitted sitemaps |
| `gsc_get_sitemap` | Get sitemap details |
| `gsc_submit_sitemap` | Submit a new sitemap |
| `gsc_delete_sitemap` | Remove a sitemap |

## 1. Create your Google credentials

Pick one of the 2 options. Both require a Google Cloud project with the **Search Console API** enabled ([console.cloud.google.com](https://console.cloud.google.com/) > APIs & Services > Enable APIs > Search Console API).

### Option A: Service account (recommended for remote deployments)

No browser flow, no token expiry headaches.

1. In Google Cloud Console, go to IAM & Admin > Service Accounts > Create.
2. Create a JSON key for it and download the file.
3. In [Google Search Console](https://search.google.com/search-console), open each property > Settings > Users and permissions > Add user, and add the service account's email (`something@project.iam.gserviceaccount.com`). Grant "Full" for sitemap management or "Restricted" for read-only analytics.

Set `GSC_READ_ONLY=true` on the server if you only want the read-only Search Console scope requested.

### Option B: OAuth client + refresh token

Uses your own Google account's access.

1. In Google Cloud Console, go to APIs & Services > Credentials > Create Credentials > OAuth client ID > **Desktop app**.
2. Note the client ID and client secret.
3. Get a refresh token by running the setup flow locally:

```bash
GOOGLE_CLIENT_ID=your-client-id GOOGLE_CLIENT_SECRET=your-client-secret npx gsc-mcp-server --setup
```

A browser opens for Google sign-in. When it finishes, the terminal prints the `GOOGLE_REFRESH_TOKEN` value to use in your deployment.

## 2. Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Option A | Service account key JSON, raw or base64-encoded |
| `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` | Option A (alt) | Path to the key JSON file |
| `GOOGLE_CLIENT_ID` | Option B | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Option B | OAuth client secret |
| `GOOGLE_REFRESH_TOKEN` | Option B | Refresh token from `--setup` |
| `MCP_AUTH_TOKEN` | Strongly recommended | Shared secret MCP clients must present. Without it, anyone who can reach the server can read your GSC data |
| `PORT` | No | HTTP listen port, default `8080` |
| `GSC_READ_ONLY` | No | `true` to request only the read-only Search Console scope |

Service account credentials take precedence if both configurations are set.

## 3. Remote deployment (HTTP)

Run it as a normal Node HTTP service:

```bash
npm install && npm run build
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=/path/to/key.json MCP_AUTH_TOKEN=$(openssl rand -hex 24) npm start
```

Or via npx without cloning:

```bash
npx -p gsc-mcp-server gsc-mcp-server-http
```

The MCP endpoint is `POST /mcp` (streamable HTTP, stateless). A health check is at `GET /healthz`.

It works on any host that runs Node 18+: Railway, Render, Fly.io, Replit, or a VPS behind a reverse proxy. A `Dockerfile` is included:

```bash
docker build -t gsc-mcp-server .
docker run -p 8080:8080 -e GOOGLE_SERVICE_ACCOUNT_KEY="$(cat key.json)" -e MCP_AUTH_TOKEN=your-secret gsc-mcp-server
```

Put it behind HTTPS. claude.ai requires an `https://` URL for custom connectors, so use your host's built-in TLS (Railway/Render/Fly/Replit all provide it) or a reverse proxy like Caddy on a VPS.

### Authentication of MCP clients

If `MCP_AUTH_TOKEN` is set, the server accepts either:

- `Authorization: Bearer <token>` header, or
- the token as a path segment: `https://your-host/mcp/<token>` (for clients that can't send custom headers, like claude.ai custom connectors)

### Connect from claude.ai (custom connector)

1. Go to claude.ai > Settings > Connectors > Add custom connector.
2. Enter the URL: `https://your-host/mcp/<your MCP_AUTH_TOKEN>`
3. Save. The GSC tools become available in claude.ai chats and Claude Code web/cloud sessions.

### Connect from Claude Code (CLI)

```bash
claude mcp add --transport http google-search-console https://your-host/mcp --header "Authorization: Bearer your-secret"
```

## 4. Local use with Claude Desktop (stdio)

### Run setup

```bash
GOOGLE_CLIENT_ID=your-client-id GOOGLE_CLIENT_SECRET=your-client-secret npx gsc-mcp-server --setup
```

Alternatively, save the OAuth client JSON downloaded from Google Cloud Console to `~/.gsc-mcp-server/credentials.json` and run `npx gsc-mcp-server --setup` without env vars.

### Add to Claude Desktop

Open your Claude Desktop config file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the server configuration:

```json
{
  "mcpServers": {
    "google-search-console": {
      "command": "npx",
      "args": ["-y", "gsc-mcp-server"]
    }
  }
}
```

Then restart Claude Desktop.

## Usage

Once connected, ask Claude things like:

| What you want | Example prompt |
|---------------|----------------|
| Top search queries | "What are my top 10 search queries this month?" |
| Page performance | "How is my /blog page performing in search?" |
| Check indexing | "Is https://mysite.com/new-post indexed?" |
| Compare periods | "Compare my search traffic this week vs last week" |
| Find opportunities | "Show me queries with high impressions but low CTR" |
| Manage sitemaps | "List my sitemaps" or "Submit my new sitemap" |

## Troubleshooting

**"Permission denied" for a site?**
Make sure the Google account (or service account) has access to that property in Search Console.

**Server exits with "credentials required"?**
Set the environment variables from the table above. The server no longer ships with built-in credentials.

**Need to re-authenticate locally?**
Run `npx gsc-mcp-server --setup` again.

**401 Unauthorized from the remote server?**
Your client isn't presenting `MCP_AUTH_TOKEN`. Use the bearer header or put the token in the URL path.

## Privacy

See our [Privacy Policy](PRIVACY.md).

## License

MIT

## About Me

I'm **Sofian Bettayeb**.

By day, I'm a martech consultant, working with billion-dollar brands. By night, I build tools like **AI SEO Copilot** (15k+ installs), **AEO Copilot**, and blueprints like **Webflow SEO Checklist** (1k+ downloads) to help my Webflow friends make money with SEO and AEO.

In between, I ride my bikes and play with my kids in Bern, Switzerland.

[GitHub](https://github.com/sofianbettayeb)
