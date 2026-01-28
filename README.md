# Google Search Console MCP Server

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

> ⚠️ **Note**: While our app is pending Google verification, you'll need to create your own Google OAuth credentials. This is a one-time setup that takes about 5 minutes.

The setup wizard will:
1. Open Google Cloud Console
2. Guide you through creating OAuth credentials
3. Authenticate with your Google account

<details>
<summary><strong>📋 Google Cloud Console Steps (click to expand)</strong></summary>

1. **Create a project** at [console.cloud.google.com](https://console.cloud.google.com)

2. **Enable the Search Console API**
   - Go to APIs & Services → Library
   - Search "Google Search Console API"
   - Click Enable

3. **Configure OAuth consent screen**
   - Go to APIs & Services → OAuth consent screen
   - User Type: External → Create
   - Fill in app name and your email
   - Save and continue through the steps

4. **Add yourself as a test user**
   - OAuth consent screen → Test users
   - Add your Gmail address

5. **Create OAuth credentials**
   - Go to Credentials → Create Credentials → OAuth client ID
   - Application type: Desktop app
   - Click Create, then Download JSON

6. **Drag the downloaded JSON file** into the terminal when prompted

</details>

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

**"Access blocked" during sign-in?**
→ Add yourself as a test user in Google Cloud Console → OAuth consent screen → Test users

**"API not enabled" error?**
→ Enable the [Search Console API](https://console.cloud.google.com/apis/library/searchconsole.googleapis.com)

**"Permission denied" for a site?**
→ Make sure your Google account has access to that property in Search Console

**Need to re-authenticate?**
→ Run `npx gsc-mcp-server --setup` again

## Privacy

All data stays on your machine. See our [Privacy Policy](PRIVACY.md).

## License

MIT
