# Google Search Console MCP Server

An MCP server that connects Claude (or any MCP client) to Google Search Console. Query your search analytics, check URL indexing status, and manage sitemaps through natural conversation.

## Quick Start

### 1. Install and Setup

```bash
npx gsc-mcp-server --setup
```

This opens a guided wizard that will:
- Open Google Cloud Console for you to create OAuth credentials
- Walk you through the setup steps
- Authenticate with your Google account

### 2. Add to Claude Desktop

Add to your Claude Desktop config:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

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

Restart Claude Desktop.

### 3. Start Using It

Ask Claude things like:
- "What are my top search queries this month?"
- "Is my new blog post indexed?"
- "Show me pages with high impressions but low CTR"
- "Submit my sitemap at https://example.com/sitemap.xml"

## Available Tools

| Tool | Description |
|------|-------------|
| `gsc_list_sites` | List all your Search Console properties |
| `gsc_search_analytics` | Query clicks, impressions, CTR, and position data |
| `gsc_inspect_url` | Check if a URL is indexed |
| `gsc_list_sitemaps` | List submitted sitemaps |
| `gsc_get_sitemap` | Get sitemap details |
| `gsc_submit_sitemap` | Submit a new sitemap |
| `gsc_delete_sitemap` | Remove a sitemap |

## Search Analytics Parameters

The `gsc_search_analytics` tool supports:

- **siteUrl**: Your site (e.g., `https://example.com/` or `sc-domain:example.com`)
- **startDate / endDate**: Date range in YYYY-MM-DD format
- **dimensions**: Group by `date`, `country`, `device`, `page`, `query`
- **filters**: Filter by query, page, country, or device
- **rowLimit**: Up to 25,000 rows per request

## Configuration

Credentials are stored in `~/.gsc-mcp-server/`:
- `credentials.json` - Your OAuth credentials
- `token.json` - Auth token (auto-refreshes)

## Troubleshooting

**"Access blocked" during auth?**
Add yourself as a test user in Google Cloud Console → OAuth consent screen → Test users.

**"API not enabled" error?**
Enable the Search Console API: [Enable here](https://console.cloud.google.com/apis/library/searchconsole.googleapis.com)

**"Permission denied" for a site?**
Make sure your Google account has access to that Search Console property.

## Development

```bash
git clone https://github.com/sofianbettayeb/gsc-mcp-server.git
cd gsc-mcp-server
npm install
npm run build
npm run setup
```

## License

MIT
