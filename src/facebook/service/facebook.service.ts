import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'
import { GRAPH_API_BASE, INSIGHTS_FIELDS } from '@/facebook/constants'
import type { InsightsQueryDto } from '@/facebook/dto'

export interface AdAccount {
  id: string
  account_id: string
  name: string
  currency?: string
}

export interface InsightRow {
  date_start?: string
  date_stop?: string
  spend?: string
  impressions?: string
  reach?: string
  actions?: { action_type: string; value: string }[]
}

export interface SummaryMetrics {
  spend: number
  results: number
  cpa: number
  reach: number
  impressions: number
  ctr: number
  cpm: number
}

export interface DailyChartPoint {
  date: string
  spend: number
  impressions: number
}

@Injectable()
export class FacebookService {
  private readonly logger = new Logger(FacebookService.name)
  private readonly client: AxiosInstance
  private readonly accessToken: string

  constructor(private readonly config: ConfigService) {
    this.accessToken = this.config.get<string>('FACEBOOK_ACCESS_TOKEN', '')
    this.client = axios.create({
      baseURL: GRAPH_API_BASE,
      timeout: 30000,
      params: { access_token: this.accessToken },
    })
  }

  async getAdAccounts(): Promise<AdAccount[]> {
    const { data } = await this.client.get<{ data: AdAccount[] }>('/me/adaccounts', {
      params: { fields: 'id,account_id,name,currency' },
    })
    return data.data ?? []
  }

  private timeParams(dto: InsightsQueryDto): Record<string, string | number | object> {
    if (dto.datePreset) return { date_preset: dto.datePreset }
    if (dto.dateStart && dto.dateEnd) {
      return { time_range: JSON.stringify({ since: dto.dateStart, until: dto.dateEnd }) }
    }
    return { date_preset: 'last_7d' }
  }

  async getInsights(dto: InsightsQueryDto): Promise<InsightRow[]> {
    if (dto.accountId) {
      const { data } = await this.client.get<{ data: InsightRow[] }>(`/${dto.accountId}/insights`, {
        params: { fields: INSIGHTS_FIELDS, ...this.timeParams(dto), level: 'account' },
      })
      return data.data ?? []
    }

    const accounts = await this.getAdAccounts()
    const allInsights: InsightRow[] = []

    for (const acc of accounts) {
      try {
        const { data } = await this.client.get<{ data: InsightRow[] }>(`/${acc.id}/insights`, {
          params: { fields: INSIGHTS_FIELDS, ...this.timeParams(dto), level: 'account' },
        })
        if (data.data) allInsights.push(...data.data)
      } catch (e) {
        this.logger.error(`Error fetching insights for account ${acc.id}: ${e.message}`)
      }
    }
    return allInsights
  }

  async getInsightsDaily(dto: InsightsQueryDto): Promise<InsightRow[]> {
    const params = {
      fields: 'spend,impressions',
      time_increment: 1,
      ...this.timeParams(dto),
      level: 'account',
    }

    if (dto.accountId) {
      const { data } = await this.client.get<{ data: InsightRow[] }>(`/${dto.accountId}/insights`, {
        params,
      })
      return data.data ?? []
    }

    const accounts = await this.getAdAccounts()
    const dailyRows: InsightRow[] = []
    for (const acc of accounts) {
      try {
        const { data } = await this.client.get<{ data: InsightRow[] }>(`/${acc.id}/insights`, {
          params,
        })
        if (data.data) dailyRows.push(...data.data)
      } catch (e) {
        this.logger.error(`Error daily insights for account ${acc.id}: ${e.message}`)
      }
    }
    return dailyRows
  }

  toSummaryMetrics(rows: InsightRow[]): SummaryMetrics {
    let spend = 0,
      impressions = 0,
      reach = 0,
      linkClicks = 0

    for (const r of rows) {
      spend += parseFloat(r.spend || '0')
      impressions += parseInt(r.impressions || '0', 10)
      reach += parseInt(r.reach || '0', 10)
      const clicks = r.actions?.find((a) => a.action_type === 'link_click')?.value
      linkClicks += parseInt(clicks || '0', 10)
    }

    return {
      spend: Number(spend.toFixed(2)),
      results: linkClicks,
      cpa: linkClicks > 0 ? Number((spend / linkClicks).toFixed(2)) : 0,
      reach,
      impressions,
      ctr: impressions > 0 ? Number(((linkClicks / impressions) * 100).toFixed(2)) : 0,
      cpm: impressions > 0 ? Number(((spend / impressions) * 1000).toFixed(2)) : 0,
    }
  }

  toDailyChart(rows: InsightRow[]): DailyChartPoint[] {
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
}
