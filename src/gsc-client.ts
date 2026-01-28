import { google, searchconsole_v1 } from "googleapis";
import { OAuth2Client } from "google-auth-library";

export interface SearchAnalyticsQuery {
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimensions?: (
    | "date"
    | "country"
    | "device"
    | "page"
    | "query"
    | "searchAppearance"
  )[];
  type?: "web" | "image" | "video" | "news" | "discover" | "googleNews";
  dimensionFilterGroups?: {
    groupType?: "and";
    filters: {
      dimension: string;
      operator: "equals" | "notEquals" | "contains" | "notContains";
      expression: string;
    }[];
  }[];
  aggregationType?: "auto" | "byPage" | "byProperty";
  rowLimit?: number;
  startRow?: number;
}

export interface SearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface UrlInspectionResult {
  inspectionResult: {
    inspectionResultLink?: string;
    indexStatusResult?: {
      verdict?: string;
      coverageState?: string;
      robotsTxtState?: string;
      indexingState?: string;
      lastCrawlTime?: string;
      pageFetchState?: string;
      googleCanonical?: string;
      userCanonical?: string;
      sitemap?: string[];
      referringUrls?: string[];
      crawledAs?: string;
    };
    mobileUsabilityResult?: {
      verdict?: string;
      issues?: { issueType?: string; severity?: string; message?: string }[];
    };
    richResultsResult?: {
      verdict?: string;
      detectedItems?: {
        richResultType?: string;
        items?: { name?: string; issues?: unknown[] }[];
      }[];
    };
  };
}

export interface SitemapInfo {
  path: string;
  lastSubmitted?: string;
  isPending?: boolean;
  isSitemapsIndex?: boolean;
  lastDownloaded?: string;
  warnings?: string;
  errors?: string;
  contents?: {
    type?: string;
    submitted?: string;
    indexed?: string;
  }[];
}

export interface SiteInfo {
  siteUrl: string;
  permissionLevel?: string;
}

export class GSCClient {
  private searchconsole: searchconsole_v1.Searchconsole;

  constructor(auth: OAuth2Client) {
    this.searchconsole = google.searchconsole({ version: "v1", auth });
  }

  /**
   * List all verified sites in Search Console
   */
  async listSites(): Promise<SiteInfo[]> {
    const response = await this.searchconsole.sites.list();
    return (
      response.data.siteEntry?.map((site) => ({
        siteUrl: site.siteUrl || "",
        permissionLevel: site.permissionLevel || undefined,
      })) || []
    );
  }

  /**
   * Query search analytics data
   */
  async querySearchAnalytics(
    query: SearchAnalyticsQuery
  ): Promise<SearchAnalyticsRow[]> {
    const response = await this.searchconsole.searchanalytics.query({
      siteUrl: query.siteUrl,
      requestBody: {
        startDate: query.startDate,
        endDate: query.endDate,
        dimensions: query.dimensions,
        type: query.type,
        dimensionFilterGroups: query.dimensionFilterGroups,
        aggregationType: query.aggregationType,
        rowLimit: query.rowLimit || 1000,
        startRow: query.startRow || 0,
      },
    });

    return (
      response.data.rows?.map((row) => ({
        keys: row.keys || [],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      })) || []
    );
  }

  /**
   * Inspect a URL for indexing status
   */
  async inspectUrl(
    siteUrl: string,
    inspectionUrl: string
  ): Promise<UrlInspectionResult> {
    const response = await this.searchconsole.urlInspection.index.inspect({
      requestBody: {
        siteUrl,
        inspectionUrl,
      },
    });

    return response.data as UrlInspectionResult;
  }

  /**
   * List all sitemaps for a site
   */
  async listSitemaps(siteUrl: string): Promise<SitemapInfo[]> {
    const response = await this.searchconsole.sitemaps.list({ siteUrl });
    return (
      response.data.sitemap?.map((sitemap) => ({
        path: sitemap.path || "",
        lastSubmitted: sitemap.lastSubmitted || undefined,
        isPending: sitemap.isPending || undefined,
        isSitemapsIndex: sitemap.isSitemapsIndex || undefined,
        lastDownloaded: sitemap.lastDownloaded || undefined,
        warnings: sitemap.warnings?.toString() || undefined,
        errors: sitemap.errors?.toString() || undefined,
        contents: sitemap.contents?.map((c) => ({
          type: c.type || undefined,
          submitted: c.submitted?.toString() || undefined,
          indexed: c.indexed?.toString() || undefined,
        })),
      })) || []
    );
  }

  /**
   * Get details about a specific sitemap
   */
  async getSitemap(siteUrl: string, feedpath: string): Promise<SitemapInfo> {
    const response = await this.searchconsole.sitemaps.get({
      siteUrl,
      feedpath,
    });
    const sitemap = response.data;
    return {
      path: sitemap.path || "",
      lastSubmitted: sitemap.lastSubmitted || undefined,
      isPending: sitemap.isPending || undefined,
      isSitemapsIndex: sitemap.isSitemapsIndex || undefined,
      lastDownloaded: sitemap.lastDownloaded || undefined,
      warnings: sitemap.warnings?.toString() || undefined,
      errors: sitemap.errors?.toString() || undefined,
      contents: sitemap.contents?.map((c) => ({
        type: c.type || undefined,
        submitted: c.submitted?.toString() || undefined,
        indexed: c.indexed?.toString() || undefined,
      })),
    };
  }

  /**
   * Submit a new sitemap
   */
  async submitSitemap(siteUrl: string, feedpath: string): Promise<void> {
    await this.searchconsole.sitemaps.submit({ siteUrl, feedpath });
  }

  /**
   * Delete a sitemap
   */
  async deleteSitemap(siteUrl: string, feedpath: string): Promise<void> {
    await this.searchconsole.sitemaps.delete({ siteUrl, feedpath });
  }
}
