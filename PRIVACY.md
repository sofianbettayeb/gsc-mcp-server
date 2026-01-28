# Privacy Policy

**Google Search Console MCP Server**

Last updated: January 28, 2025

## Overview

Google Search Console MCP Server is an open-source tool that connects Claude (and other MCP clients) to your Google Search Console data. This privacy policy explains how the application handles your data.

## Data Collection and Storage

### What data is accessed
- Your Google Search Console search analytics (clicks, impressions, CTR, position)
- URL indexing status
- Sitemap information
- List of sites you have access to in Search Console

### Where data is stored
All data is stored **locally on your own computer**:
- OAuth credentials: `~/.gsc-mcp-server/credentials.json`
- Authentication token: `~/.gsc-mcp-server/token.json`

**No data is transmitted to or stored on any external servers.** The application runs entirely on your local machine.

## Third-Party Services

This application uses:
- **Google Search Console API** to retrieve your search data
- **Google OAuth 2.0** for authentication

Your data is subject to [Google's Privacy Policy](https://policies.google.com/privacy) when accessing their services.

## Data Sharing

We do **not**:
- Collect any personal information
- Store your data on external servers
- Share your data with third parties
- Track your usage
- Use analytics

## Data Security

- OAuth tokens are stored with restricted file permissions (readable only by you)
- Tokens are automatically refreshed and can be revoked at any time
- You can delete all stored data by removing the `~/.gsc-mcp-server/` directory

## Your Rights

You can at any time:
- Revoke access via [Google Account Permissions](https://myaccount.google.com/permissions)
- Delete local credentials by removing `~/.gsc-mcp-server/`
- Uninstall the application

## Open Source

This application is open source. You can review the code at:
https://github.com/sofianbettayeb/gsc-mcp-server

## Contact

For questions about this privacy policy:
- Email: sofianbettayeb@gmail.com
- GitHub Issues: https://github.com/sofianbettayeb/gsc-mcp-server/issues

## Changes

Any updates to this privacy policy will be reflected in this document with an updated date.
