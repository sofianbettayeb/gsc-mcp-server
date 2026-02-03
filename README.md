# Google Search Console MCP Server

<img width="459" height="209" alt="image" src="https://github.com/user-attachments/assets/d0cec128-c0b3-443c-a6e7-54b63e10db71" />

Connect Claude to your Google Search Console data. Query search analytics, check indexing status, and manage sitemaps through natural conversation.

## Prerequisites

- **Node.js 18+** installed
- **Google Search Console** account with at least one verified property
- **Claude Desktop** app installed

## Installation

### 1. Run Setup

```bash
npx gsc-mcp-server --setup
```

This will open a browser for you to sign in with your Google account. That's it!

### 2. Add to Claude Desktop

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

If you already have other MCP servers, add it with a comma:

```json
{
  "mcpServers": {
    "other-server": { ... },
    "google-search-console": {
      "command": "npx",
      "args": ["-y", "gsc-mcp-server"]
    }
  }
}
```

### 3. Restart Claude Desktop

Quit and reopen Claude Desktop to load the new server.

## Usage

Once configured, ask Claude things like:

| What you want | Example prompt |
|---------------|----------------|
| Top search queries | "What are my top 10 search queries this month?" |
| Page performance | "How is my /blog page performing in search?" |
| Check indexing | "Is https://mysite.com/new-post indexed?" |
| Compare periods | "Compare my search traffic this week vs last week" |
| Find opportunities | "Show me queries with high impressions but low CTR" |
| Manage sitemaps | "List my sitemaps" or "Submit my new sitemap" |

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

## Troubleshooting

**"Permission denied" for a site?**
→ Make sure your Google account has access to that property in Search Console

**Need to re-authenticate?**
→ Run `npx gsc-mcp-server --setup` again

**Session expired?**
→ Run `npx gsc-mcp-server --setup` to sign in again

## Using Your Own OAuth Credentials (Optional)

The server works out of the box with shared OAuth credentials. For production use or higher rate limits, you can use your own:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable the **Search Console API**
3. Create OAuth 2.0 credentials (Desktop app)
4. Save credentials to `~/.gsc-mcp-server/credentials.json`
5. Run `npx gsc-mcp-server --setup` to authenticate

## Privacy

All data stays on your machine. See our [Privacy Policy](PRIVACY.md).

## License

MIT

## About Me

I'm **Sofian Bettayeb**.

By day, I'm a martech consultant, working with billion-dollar brands. By night, I build tools like **AI SEO Copilot** (15k+ installs), **AEO Copilot**, and blueprints like **Webflow SEO Checklist** (1k+ downloads) to help my Webflow friends make money with SEO and AEO.

In between, I ride my bikes and play with my kids in Bern, Switzerland.

[GitHub](https://github.com/sofianbettayeb)
