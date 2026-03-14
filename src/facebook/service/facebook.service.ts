import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
import {
  GRAPH_API_BASE,
  INSIGHTS_FIELDS,
} from "../constants/facebook.constants";
import type { InsightsQueryDto } from "../dto";

export interface AdAccount {
  id: string;
  account_id: string;
  name: string;
  currency?: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: string;
}

export interface ActionItem {
  action_type: string;
  value: string;
}

export interface InsightRow {
  date_start?: string;
  date_stop?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  cpm?: string;
  ctr?: string;
  frequency?: string;
  actions?: ActionItem[];
  cost_per_action_type?: ActionItem[];
}

export interface InsightsResponse {
  data: InsightRow[];
  paging?: { next?: string; previous?: string };
}

export interface CampaignMetrics {
  usedValue: number;
  results: number;
  costPerResult: number;
  reach: number;
  impressions: number;
  linkClicks: number;
  ctr: number;
  cpm: number;
  frequency: number;
}

export interface DailyDataPoint {
  date: string;
  spend: number;
  impressions: number;
}

@Injectable()
export class FacebookService {
  private readonly logger = new Logger(FacebookService.name);
  private readonly client: AxiosInstance;
  private readonly accessToken: string;

  constructor(private config: ConfigService) {
    this.accessToken = this.config.get<string>("FACEBOOK_ACCESS_TOKEN", "");
    this.client = axios.create({
      baseURL: GRAPH_API_BASE,
      timeout: 30000,
      params: { access_token: this.accessToken },
    });
  }

  private ensureToken(): void {
    if (!this.accessToken) {
      throw new Error("FACEBOOK_ACCESS_TOKEN not configured. Define in .env.");
    }
  }

  async getAdAccounts(): Promise<AdAccount[]> {
    this.ensureToken();

    const { data } = await this.client.get<{ data: AdAccount[] }>(
      "/me/adaccounts",
      {
        params: {
          fields: "id,account_id,name,currency",
          access_token: this.accessToken,
        },
      },
    );

    return data.data ?? [];
  }

  async resolveAccountId(accountId?: string): Promise<string> {
    if (accountId) return accountId;

    const accounts = await this.getAdAccounts();

    if (!accounts.length) {
      throw new Error("No ad accounts found for this token.");
    }

    return accounts[0].id;
  }

  async getCampaigns(accountId?: string): Promise<Campaign[]> {
    this.ensureToken();

    const actId = await this.resolveAccountId(accountId);

    const { data } = await this.client.get<{ data: Campaign[] }>(
      `/${actId}/campaigns`,
      {
        params: {
          fields: "id,name,status",
          access_token: this.accessToken,
        },
      },
    );

    return data.data ?? [];
  }

  private timeParams(dto: InsightsQueryDto): Record<string, string | object> {
    if (dto.datePreset) {
      return { date_preset: dto.datePreset };
    }

    if (dto.dateStart && dto.dateEnd) {
      return {
        time_range: JSON.stringify({
          since: dto.dateStart,
          until: dto.dateEnd,
        }),
      };
    }

    return { date_preset: "last_7d" };
  }

  private async fetchInsights(
    target: string,
    params: Record<string, string | object | number>,
  ): Promise<InsightRow[]> {
    const { data } = await this.client.get<InsightsResponse>(target, {
      params,
    });

    return data?.data ?? [];
  }

  async getInsights(dto: InsightsQueryDto): Promise<InsightRow[]> {
    this.ensureToken();

    const actId = await this.resolveAccountId(dto.accountId);

    const isCampaignQuery = !!dto.campaignId;

    const target = isCampaignQuery
      ? `/${dto.campaignId}/insights`
      : `/${actId}/insights`;

    const params: Record<string, string | object | number> = {
      fields: INSIGHTS_FIELDS,
      access_token: this.accessToken,
      ...this.timeParams(dto),
      ...(isCampaignQuery ? {} : { level: "campaign" }),
    };

    const rows = await this.fetchInsights(target, params);

    if (rows.length === 0) {
      this.logger.warn(`No insights found for ${target}`);
    }

    return rows;
  }

  async getInsightsRaw(dto: InsightsQueryDto): Promise<{
    url: string;
    params: Record<string, unknown>;
    response: InsightsResponse;
  }> {
    this.ensureToken();

    const actId = await this.resolveAccountId(dto.accountId);

    const target = dto.campaignId
      ? `/${dto.campaignId}/insights`
      : `/${actId}/insights`;

    const params: Record<string, string | object | number> = {
      fields: INSIGHTS_FIELDS,
      access_token: "[REDACTED]",
      ...this.timeParams(dto),
    };

    const { data } = await this.client.get<InsightsResponse>(target, {
      params: { ...params, access_token: this.accessToken },
    });

    return {
      url: `${GRAPH_API_BASE}${target}`,
      params: { ...params, access_token: "[REDACTED]" },
      response: data as InsightsResponse,
    };
  }

  async getInsightsDaily(dto: InsightsQueryDto): Promise<InsightRow[]> {
    this.ensureToken();

    const actId = await this.resolveAccountId(dto.accountId);

    const target = dto.campaignId
      ? `/${dto.campaignId}/insights`
      : `/${actId}/insights`;

    const baseParams: Record<string, string | number | object> = {
      fields: "spend,impressions",
      access_token: this.accessToken,
      time_increment: 1,
      ...this.timeParams(dto),
    };

    let rows = await this.fetchInsights(target, baseParams);

    if (rows.length === 0 && !dto.campaignId) {
      const byCampaign = await this.fetchInsights(target, {
        ...baseParams,
        level: "campaign",
      });

      if (byCampaign.length > 0) {
        rows = this.aggregateDailyByDate(byCampaign);
      }
    }

    return rows;
  }

  private aggregateDailyByDate(rows: InsightRow[]): InsightRow[] {
    const byDate: Record<string, { spend: number; impressions: number }> = {};

    for (const r of rows) {
      const key = r.date_start ?? r.date_stop ?? "";
      if (!key) continue;

      if (!byDate[key]) byDate[key] = { spend: 0, impressions: 0 };

      byDate[key].spend += this.parseNum(r.spend);

      byDate[key].impressions += this.parseNum(r.impressions);
    }
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date_start, tot]) => ({
        date_start,
        date_stop: date_start,
        spend: String(tot.spend),
        impressions: String(tot.impressions),
      }));
  }

  private parseNum(value: string | undefined): number {
    if (value == null || value === "") return 0;

    const n = parseFloat(String(value).replace(/,/g, "."));

    return Number.isFinite(n) ? n : 0;
  }

  private sumAction(actions: ActionItem[] | undefined, type: string): number {
    if (!Array.isArray(actions)) return 0;

    const item = actions.find(
      (a) => a.action_type?.toLowerCase() === type.toLowerCase(),
    );

    return item ? this.parseNum(item.value) : 0;
  }

  private aggregateInsightRows(rows: InsightRow[]): InsightRow {
    if (rows.length === 0) return {};

    if (rows.length === 1) return rows[0];

    let spend = 0;

    let impressions = 0;

    let reach = 0;

    const actionsByType: Record<string, number> = {};
    const costByType: Record<string, number> = {};

    for (const r of rows) {
      spend += this.parseNum(r.spend);
      impressions += this.parseNum(r.impressions);
      reach += this.parseNum(r.reach);

      for (const a of r.actions ?? []) {
        const k = (a.action_type ?? "").toLowerCase();
        actionsByType[k] = (actionsByType[k] ?? 0) + this.parseNum(a.value);
      }

      for (const c of r.cost_per_action_type ?? []) {
        const k = (c.action_type ?? "").toLowerCase();
        costByType[k] = (costByType[k] ?? 0) + this.parseNum(c.value);
      }
    }

    const actions: ActionItem[] = Object.entries(actionsByType).map(
      ([action_type, value]) => ({ action_type, value: String(value) }),
    );

    const cost_per_action_type: ActionItem[] = Object.entries(costByType).map(
      ([action_type, value]) => ({ action_type, value: String(value) }),
    );

    const linkClicks = actionsByType["link_click"] ?? 0;

    const ctr = impressions > 0 ? (linkClicks / impressions) * 100 : 0;

    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;

    const frequency = reach > 0 ? impressions / reach : 0;

    return {
      date_start: rows[0].date_start,
      date_stop: rows[0].date_stop,
      spend: String(spend),
      impressions: String(impressions),
      reach: String(reach),
      ctr: String(ctr),
      cpm: String(cpm),
      frequency: String(frequency),
      actions: actions.length ? actions : undefined,
      cost_per_action_type: cost_per_action_type.length
        ? cost_per_action_type
        : undefined,
    };
  }

  toCampaignMetrics(rows: InsightRow[]): CampaignMetrics {
    const row =
      rows.length > 1 ? this.aggregateInsightRows(rows) : (rows[0] ?? {});

    const spend = this.parseNum(row.spend);

    const impressions = this.parseNum(row.impressions);

    const reach = this.parseNum(row.reach);

    const linkClicks = this.sumAction(row.actions, "link_click");

    const results = linkClicks || this.parseNum(row.impressions);

    const costPerResult = results > 0 ? spend / results : 0;

    return {
      usedValue: spend,
      results: results,
      costPerResult: costPerResult,
      reach: reach,
      impressions: impressions,
      linkClicks: linkClicks,
      ctr: this.parseNum(row.ctr),
      cpm: this.parseNum(row.cpm),
      frequency: this.parseNum(row.frequency),
    };
  }

  toDailyChart(rows: InsightRow[]): DailyDataPoint[] {
    return (rows ?? []).map((r) => ({
      date: r.date_start ?? r.date_stop ?? "",
      spend: this.parseNum(r.spend),
      impressions: this.parseNum(r.impressions),
    }));
  }
}
