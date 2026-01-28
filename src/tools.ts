import { z } from "zod";
import { GSCClient } from "./gsc-client.js";

// Zod schemas for tool parameters
export const listSitesSchema = z.object({});

export const searchAnalyticsSchema = z.object({
  siteUrl: z
    .string()
    .describe(
      "The site URL to query (e.g., 'https://example.com/' or 'sc-domain:example.com')"
    ),
  startDate: z
    .string()
    .describe("Start date in YYYY-MM-DD format (e.g., '2024-01-01')"),
  endDate: z
    .string()
    .describe("End date in YYYY-MM-DD format (e.g., '2024-01-31')"),
  dimensions: z
    .array(
      z.enum([
        "date",
        "country",
        "device",
        "page",
        "query",
        "searchAppearance",
      ])
    )
    .optional()
    .describe(
      "Dimensions to group results by (e.g., ['query', 'page', 'date'])"
    ),
  type: z
    .enum(["web", "image", "video", "news", "discover", "googleNews"])
    .optional()
    .default("web")
    .describe("Search type to filter by"),
  query: z
    .string()
    .optional()
    .describe("Filter results to only include this search query"),
  page: z
    .string()
    .optional()
    .describe("Filter results to only include this page URL"),
  country: z.string().optional().describe("Filter by country code (e.g., 'USA', 'GBR')"),
  device: z
    .enum(["DESKTOP", "MOBILE", "TABLET"])
    .optional()
    .describe("Filter by device type"),
  rowLimit: z
    .number()
    .min(1)
    .max(25000)
    .optional()
    .default(1000)
    .describe("Maximum number of rows to return (default: 1000, max: 25000)"),
  startRow: z
    .number()
    .min(0)
    .optional()
    .default(0)
    .describe("Starting row for pagination (default: 0)"),
});

export const urlInspectionSchema = z.object({
  siteUrl: z
    .string()
    .describe(
      "The site URL that owns this URL (e.g., 'https://example.com/' or 'sc-domain:example.com')"
    ),
  inspectionUrl: z
    .string()
    .describe("The fully-qualified URL to inspect (e.g., 'https://example.com/page')"),
});

export const listSitemapsSchema = z.object({
  siteUrl: z.string().describe("The site URL to list sitemaps for"),
});

export const getSitemapSchema = z.object({
  siteUrl: z.string().describe("The site URL that owns the sitemap"),
  feedpath: z.string().describe("The URL of the sitemap to retrieve"),
});

export const submitSitemapSchema = z.object({
  siteUrl: z.string().describe("The site URL to submit the sitemap for"),
  feedpath: z.string().describe("The URL of the sitemap to submit"),
});

export const deleteSitemapSchema = z.object({
  siteUrl: z.string().describe("The site URL that owns the sitemap"),
  feedpath: z.string().describe("The URL of the sitemap to delete"),
});

// Tool definitions for MCP
export const TOOL_DEFINITIONS = [
  {
    name: "gsc_list_sites",
    description:
      "List all sites (properties) you have access to in Google Search Console. Returns site URLs and permission levels.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "gsc_search_analytics",
    description:
      "Query search analytics data from Google Search Console. Get clicks, impressions, CTR, and position data. You can group by dimensions (date, country, device, page, query) and filter by various criteria.",
    inputSchema: {
      type: "object" as const,
      properties: {
        siteUrl: {
          type: "string",
          description:
            "The site URL to query (e.g., 'https://example.com/' or 'sc-domain:example.com')",
        },
        startDate: {
          type: "string",
          description: "Start date in YYYY-MM-DD format",
        },
        endDate: {
          type: "string",
          description: "End date in YYYY-MM-DD format",
        },
        dimensions: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "date",
              "country",
              "device",
              "page",
              "query",
              "searchAppearance",
            ],
          },
          description: "Dimensions to group results by",
        },
        type: {
          type: "string",
          enum: ["web", "image", "video", "news", "discover", "googleNews"],
          description: "Search type to filter by",
        },
        query: {
          type: "string",
          description: "Filter results to only include this search query",
        },
        page: {
          type: "string",
          description: "Filter results to only include this page URL",
        },
        country: {
          type: "string",
          description: "Filter by country code (e.g., 'USA')",
        },
        device: {
          type: "string",
          enum: ["DESKTOP", "MOBILE", "TABLET"],
          description: "Filter by device type",
        },
        rowLimit: {
          type: "number",
          description: "Maximum rows to return (default: 1000, max: 25000)",
        },
        startRow: {
          type: "number",
          description: "Starting row for pagination",
        },
      },
      required: ["siteUrl", "startDate", "endDate"],
    },
  },
  {
    name: "gsc_inspect_url",
    description:
      "Inspect a URL to get its indexing status in Google Search. Returns index status, crawl information, mobile usability, and rich results data.",
    inputSchema: {
      type: "object" as const,
      properties: {
        siteUrl: {
          type: "string",
          description:
            "The site URL that owns this URL (e.g., 'https://example.com/')",
        },
        inspectionUrl: {
          type: "string",
          description: "The fully-qualified URL to inspect",
        },
      },
      required: ["siteUrl", "inspectionUrl"],
    },
  },
  {
    name: "gsc_list_sitemaps",
    description: "List all sitemaps submitted for a site in Google Search Console.",
    inputSchema: {
      type: "object" as const,
      properties: {
        siteUrl: {
          type: "string",
          description: "The site URL to list sitemaps for",
        },
      },
      required: ["siteUrl"],
    },
  },
  {
    name: "gsc_get_sitemap",
    description: "Get detailed information about a specific sitemap.",
    inputSchema: {
      type: "object" as const,
      properties: {
        siteUrl: {
          type: "string",
          description: "The site URL that owns the sitemap",
        },
        feedpath: {
          type: "string",
          description: "The URL of the sitemap",
        },
      },
      required: ["siteUrl", "feedpath"],
    },
  },
  {
    name: "gsc_submit_sitemap",
    description: "Submit a new sitemap to Google Search Console for crawling.",
    inputSchema: {
      type: "object" as const,
      properties: {
        siteUrl: {
          type: "string",
          description: "The site URL to submit the sitemap for",
        },
        feedpath: {
          type: "string",
          description: "The URL of the sitemap to submit",
        },
      },
      required: ["siteUrl", "feedpath"],
    },
  },
  {
    name: "gsc_delete_sitemap",
    description: "Delete a sitemap from Google Search Console.",
    inputSchema: {
      type: "object" as const,
      properties: {
        siteUrl: {
          type: "string",
          description: "The site URL that owns the sitemap",
        },
        feedpath: {
          type: "string",
          description: "The URL of the sitemap to delete",
        },
      },
      required: ["siteUrl", "feedpath"],
    },
  },
];

// Tool handler
export async function handleToolCall(
  client: GSCClient,
  toolName: string,
  args: Record<string, unknown>
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  try {
    switch (toolName) {
      case "gsc_list_sites": {
        const sites = await client.listSites();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(sites, null, 2),
            },
          ],
        };
      }

      case "gsc_search_analytics": {
        const params = searchAnalyticsSchema.parse(args);

        // Build dimension filter groups if filters are provided
        const dimensionFilterGroups: {
          groupType: "and";
          filters: {
            dimension: string;
            operator: "equals" | "contains";
            expression: string;
          }[];
        }[] = [];

        const filters: {
          dimension: string;
          operator: "equals" | "contains";
          expression: string;
        }[] = [];

        if (params.query) {
          filters.push({
            dimension: "query",
            operator: "contains",
            expression: params.query,
          });
        }
        if (params.page) {
          filters.push({
            dimension: "page",
            operator: "contains",
            expression: params.page,
          });
        }
        if (params.country) {
          filters.push({
            dimension: "country",
            operator: "equals",
            expression: params.country,
          });
        }
        if (params.device) {
          filters.push({
            dimension: "device",
            operator: "equals",
            expression: params.device,
          });
        }

        if (filters.length > 0) {
          dimensionFilterGroups.push({
            groupType: "and",
            filters,
          });
        }

        const rows = await client.querySearchAnalytics({
          siteUrl: params.siteUrl,
          startDate: params.startDate,
          endDate: params.endDate,
          dimensions: params.dimensions as (
            | "date"
            | "country"
            | "device"
            | "page"
            | "query"
            | "searchAppearance"
          )[],
          type: params.type,
          dimensionFilterGroups:
            dimensionFilterGroups.length > 0 ? dimensionFilterGroups : undefined,
          rowLimit: params.rowLimit,
          startRow: params.startRow,
        });

        // Format the response with summary stats
        const totalClicks = rows.reduce((sum, row) => sum + row.clicks, 0);
        const totalImpressions = rows.reduce(
          (sum, row) => sum + row.impressions,
          0
        );
        const avgCtr =
          totalImpressions > 0 ? totalClicks / totalImpressions : 0;
        const avgPosition =
          rows.length > 0
            ? rows.reduce((sum, row) => sum + row.position, 0) / rows.length
            : 0;

        const summary = {
          totalRows: rows.length,
          totalClicks,
          totalImpressions,
          averageCtr: avgCtr,
          averagePosition: avgPosition,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ summary, rows }, null, 2),
            },
          ],
        };
      }

      case "gsc_inspect_url": {
        const params = urlInspectionSchema.parse(args);
        const result = await client.inspectUrl(
          params.siteUrl,
          params.inspectionUrl
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "gsc_list_sitemaps": {
        const params = listSitemapsSchema.parse(args);
        const sitemaps = await client.listSitemaps(params.siteUrl);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(sitemaps, null, 2),
            },
          ],
        };
      }

      case "gsc_get_sitemap": {
        const params = getSitemapSchema.parse(args);
        const sitemap = await client.getSitemap(params.siteUrl, params.feedpath);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(sitemap, null, 2),
            },
          ],
        };
      }

      case "gsc_submit_sitemap": {
        const params = submitSitemapSchema.parse(args);
        await client.submitSitemap(params.siteUrl, params.feedpath);
        return {
          content: [
            {
              type: "text",
              text: `Successfully submitted sitemap: ${params.feedpath}`,
            },
          ],
        };
      }

      case "gsc_delete_sitemap": {
        const params = deleteSitemapSchema.parse(args);
        await client.deleteSitemap(params.siteUrl, params.feedpath);
        return {
          content: [
            {
              type: "text",
              text: `Successfully deleted sitemap: ${params.feedpath}`,
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${toolName}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${toolName}: ${message}`,
        },
      ],
      isError: true,
    };
  }
}
