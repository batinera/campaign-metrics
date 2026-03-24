import { Injectable, Logger } from '@nestjs/common'
import { FacebookAPIHelper } from './facebook-api.helper'
import { InsightsQueryDto, SummaryMetricsDto, DailyChartPointDto } from '@/facebook/dto'
import {
  INSIGHTS_FIELDS,
  INSIGHTS_FIELDS_ADSET,
  DAILY_INSIGHTS_FIELDS,
  DAILY_INSIGHTS_FIELDS_ADSET,
} from '@/facebook/constants'

export interface InsightRow {
  date_start?: string
  date_stop?: string
  spend?: string
  impressions?: string
  reach?: string
  campaign_id?: string
  campaign_name?: string
  adset_id?: string
  adset_name?: string
  account_id?: string
  account_name?: string
  actions?: { action_type: string; value: string }[]
}

@Injectable()
export class FacebookInsightsService {
  private readonly logger = new Logger(FacebookInsightsService.name)

  constructor(private readonly apiHelper: FacebookAPIHelper) {}

  async getCampaignInsights(
    campaignId: string,
    dto: InsightsQueryDto,
    daily: boolean = false,
  ): Promise<InsightRow[]> {
    const fields = daily ? DAILY_INSIGHTS_FIELDS : `${INSIGHTS_FIELDS},account_id,account_name`
    const params = {
      fields,
      level: 'campaign',
      ...(daily && { time_increment: 1 }),
      ...this.timeParams(dto),
    }
    return this.apiHelper.fetchOptional<InsightRow>(`/${campaignId}/insights`, params)
  }

  async getAdSetInsights(
    adSetId: string,
    dto: InsightsQueryDto,
    daily: boolean = false,
  ): Promise<InsightRow[]> {
    const fields = daily ? DAILY_INSIGHTS_FIELDS_ADSET : INSIGHTS_FIELDS_ADSET
    const params = {
      fields,
      level: 'adset',
      ...(daily && { time_increment: 1 }),
      ...this.timeParams(dto),
    }
    return this.apiHelper.fetchOptional<InsightRow>(`/${adSetId}/insights`, params)
  }

  async getAccountInsights(
    accountId: string,
    dto: InsightsQueryDto,
    daily: boolean = false,
  ): Promise<InsightRow[]> {
    const fields = daily ? DAILY_INSIGHTS_FIELDS : `${INSIGHTS_FIELDS},account_id,account_name`
    const params = {
      fields,
      level: 'account',
      ...(daily && { time_increment: 1 }),
      ...this.timeParams(dto),
      ...(dto.status && {
        filtering: JSON.stringify([
          { field: 'campaign.effective_status', operator: 'IN', value: [String(dto.status)] },
        ]),
      }),
    }
    return this.apiHelper.fetchOptional<InsightRow>(`/${accountId}/insights`, params)
  }

  toSummaryMetrics(rows: InsightRow[]): SummaryMetricsDto {
    const acc = rows.reduce(
      (a, r) => {
        const parsed = this.parseInsightRow(r)
        return {
          spend: a.spend + parsed.spend,
          impressions: a.impressions + parsed.impressions,
          reach: a.reach + parsed.reach,
          linkClicks: a.linkClicks + parsed.linkClicks,
          campaigns:
            parsed.campaignId && parsed.campaignName
              ? a.campaigns.set(parsed.campaignId, parsed.campaignName)
              : a.campaigns,
          accountId: a.accountId || parsed.accountId,
          accountName: a.accountName || parsed.accountName,
        }
      },
      {
        spend: 0,
        impressions: 0,
        reach: 0,
        linkClicks: 0,
        campaigns: new Map<string, string>(),
        accountId: '',
        accountName: '',
      },
    )

    const campaigns = Array.from(acc.campaigns.entries()).map(([id, name]) => ({ id, name }))

    return {
      spend: Number(acc.spend.toFixed(2)),
      results: acc.linkClicks,
      cpa: acc.linkClicks > 0 ? Number((acc.spend / acc.linkClicks).toFixed(2)) : 0,
      reach: acc.reach,
      impressions: acc.impressions,
      ctr: acc.impressions > 0 ? Number(((acc.linkClicks / acc.impressions) * 100).toFixed(2)) : 0,
      cpm: acc.impressions > 0 ? Number(((acc.spend / acc.impressions) * 1000).toFixed(2)) : 0,
      details: {
        account_id: acc.accountId || undefined,
        account_name: acc.accountName || undefined,
        campaigns: campaigns.length > 0 ? campaigns : undefined,
      },
    }
  }

  toDailyChart(rows: InsightRow[]): DailyChartPointDto[] {
    const byDate: Record<string, { spend: number; impressions: number }> = {}

    for (const r of rows) {
      const date = r.date_start || ''
      if (!date) continue
      if (!byDate[date]) byDate[date] = { spend: 0, impressions: 0 }
      byDate[date].spend += parseFloat(r.spend || '0')
      byDate[date].impressions += parseInt(r.impressions || '0', 10)
    }

    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, val]) => ({
        date,
        spend: Number(val.spend.toFixed(2)),
        impressions: val.impressions,
      }))
  }

  private parseInsightRow(r: InsightRow): {
    spend: number
    impressions: number
    reach: number
    linkClicks: number
    campaignId?: string
    campaignName?: string
    accountId?: string
    accountName?: string
  } {
    const linkClicks = parseInt(
      r.actions?.find((a) => a.action_type === 'link_click')?.value || '0',
      10,
    )
    return {
      spend: parseFloat(r.spend || '0'),
      impressions: parseInt(r.impressions || '0', 10),
      reach: parseInt(r.reach || '0', 10),
      linkClicks,
      campaignId: r.campaign_id,
      campaignName: r.campaign_name,
      accountId: r.account_id,
      accountName: r.account_name,
    }
  }

  private timeParams(dto: InsightsQueryDto): Record<string, string | number | object> {
    if (dto.datePreset) return { date_preset: dto.datePreset }
    if (dto.dateStart && dto.dateEnd) {
      return { time_range: JSON.stringify({ since: dto.dateStart, until: dto.dateEnd }) }
    }
    return { date_preset: 'last_7d' }
  }
}
