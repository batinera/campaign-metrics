import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'
import {
  GRAPH_API_BASE,
  INSIGHTS_FIELDS,
  INSIGHTS_FIELDS_ADSET,
  AD_FIELDS,
  CAMPAIGN_FIELDS,
  DAILY_INSIGHTS_FIELDS,
  DAILY_INSIGHTS_FIELDS_ADSET,
  ADSET_FIELDS,
} from '@/facebook/constants'
import {
  InsightsQueryDto,
  AdAccountDto,
  CampaignDto,
  CampaignWithAdSetsDto,
  AdSetDto,
  AdDto,
  AdsByAdSetDto,
  PerformanceDto,
  SummaryMetricsDto,
  DailyChartPointDto,
  LevelDto,
} from '@/facebook/dto'

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

  async getAdAccounts(): Promise<AdAccountDto[]> {
    const { data } = await this.client.get<{ data: AdAccountDto[] }>('/me/adaccounts', {
      params: { fields: 'id,account_id,name,currency' },
    })
    return data.data ?? []
  }

  async getCampaigns(dto: InsightsQueryDto = {}): Promise<CampaignWithAdSetsDto[]> {
    const level = Object.assign(new LevelDto(), { campaigns: 'campaigns' })
    const params = {
      fields: CAMPAIGN_FIELDS,
      ...this.filterParams(dto, level),
    }
    const campaigns = await this.fetchFromAccounts<CampaignDto>(
      '/campaigns',
      params,
      dto,
      'campaigns',
    )
    const sortedCampaigns = this.sortItems(campaigns, dto)
    const adSetParams = {
      fields: ADSET_FIELDS,
      ...this.filterParams(dto, Object.assign(new LevelDto(), { ad: 'ad' })),
    }
    const adSets = await this.fetchFromAccounts<AdSetDto>('/adsets', adSetParams, dto, 'adsets')
    const adSetsByCampaign = this.groupAdSetsByCampaign(adSets)
    return sortedCampaigns.map((c) => ({
      ...c,
      adSets: adSetsByCampaign.get(c.id) ?? [],
    }))
  }

  private groupAdSetsByCampaign(adSets: AdSetDto[]): Map<string, AdSetDto[]> {
    const map = new Map<string, AdSetDto[]>()
    for (const as of adSets) {
      const list = map.get(as.campaign_id) ?? []
      list.push(as)
      map.set(as.campaign_id, list)
    }
    return map
  }

  private async fetchFromAccounts<T>(
    path: string,
    params: Record<string, unknown>,
    dto: InsightsQueryDto,
    resourceLabel: string,
  ): Promise<T[]> {
    if (dto.accountId) {
      const { data } = await this.client.get<{ data: T[] }>(`/${dto.accountId}${path}`, { params })
      return data.data ?? []
    }

    const accounts = await this.getAdAccounts()
    const results: T[] = []

    for (const acc of accounts) {
      try {
        const { data } = await this.client.get<{ data: T[] }>(`/${acc.id}${path}`, { params })
        if (data.data) results.push(...data.data)
      } catch (e) {
        this.logger.error(`Error fetching ${resourceLabel} for account ${acc.id}: ${e.message}`)
      }
    }
    return results
  }

  private sortItems<T extends { name: string; created_time: string }>(
    items: T[],
    dto: InsightsQueryDto,
  ): T[] {
    const { sortBy = 'created_time', sortOrder = 'desc' } = dto

    return items.sort((a, b) => {
      let comparison = 0
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name)
      } else {
        comparison = new Date(a.created_time).getTime() - new Date(b.created_time).getTime()
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })
  }

  private timeParams(dto: InsightsQueryDto): Record<string, string | number | object> {
    if (dto.datePreset) return { date_preset: dto.datePreset }
    if (dto.dateStart && dto.dateEnd) {
      return { time_range: JSON.stringify({ since: dto.dateStart, until: dto.dateEnd }) }
    }
    return { date_preset: 'last_7d' }
  }

  private filterParams(dto: InsightsQueryDto, level: LevelDto): Record<string, string> {
    const filters: Array<{ field: string; operator: string; value: string[] }> = []

    const idField = level.campaigns ? 'id' : 'campaign.id'
    if (dto.campaignId) {
      filters.push({ field: idField, operator: 'IN', value: [dto.campaignId] })
    }

    if (dto.campaignIds && dto.campaignIds.length > 0) {
      filters.push({ field: idField, operator: 'IN', value: dto.campaignIds })
    }

    if (dto.status) {
      const statusField =
        level.ad || level.campaigns ? 'effective_status' : 'campaign.effective_status'
      filters.push({ field: statusField, operator: 'IN', value: [String(dto.status)] })
    }

    return filters.length > 0 ? { filtering: JSON.stringify(filters) } : {}
  }

  async getInsights(dto: InsightsQueryDto): Promise<InsightRow[]> {
    return this.getInsightRows(dto, { daily: false })
  }

  async getInsightsDaily(dto: InsightsQueryDto): Promise<InsightRow[]> {
    return this.getInsightRows(dto, { daily: true })
  }

  private getInsightLevel(dto: InsightsQueryDto): LevelDto {
    return dto.accountId ||
      dto.campaignId ||
      (dto.campaignIds && dto.campaignIds.length > 0) ||
      dto.status
      ? Object.assign(new LevelDto(), { campaign: 'campaign' })
      : Object.assign(new LevelDto(), { account: 'account' })
  }

  private async getInsightRows(
    dto: InsightsQueryDto,
    options: { daily?: boolean },
  ): Promise<InsightRow[]> {
    const levelDto = this.getInsightLevel(dto)
    const fields = options.daily
      ? DAILY_INSIGHTS_FIELDS
      : `${INSIGHTS_FIELDS},account_id,account_name`
    const params = {
      fields,
      ...(options.daily && { time_increment: 1 }),
      ...this.timeParams(dto),
      ...this.filterParams(dto, levelDto),
      level: levelDto.campaign || levelDto.account || 'account',
    }
    return this.fetchFromAccounts<InsightRow>(
      '/insights',
      params,
      dto,
      options.daily ? 'daily insights' : 'insights',
    )
  }

  async getAds(dto: InsightsQueryDto): Promise<AdsByAdSetDto[]> {
    const level = Object.assign(new LevelDto(), { ad: 'ad' })
    const params = { fields: AD_FIELDS, ...this.filterParams(dto, level) }
    const ads = await this.fetchFromAccounts<AdDto>('/ads', params, dto, 'ads')
    return this.groupAdsByAdSet(ads)
  }

  private groupAdsByAdSet(ads: AdDto[]): AdsByAdSetDto[] {
    const byAdSet = new Map<string, { adSet: { id: string; name: string }; ads: AdDto[] }>()
    for (const ad of ads) {
      const id = ad.adset_id
      const name = ad.adset?.name ?? ad.adset_id
      const existing = byAdSet.get(id)
      if (existing) {
        existing.ads.push(ad)
      } else {
        byAdSet.set(id, { adSet: { id, name }, ads: [ad] })
      }
    }
    return Array.from(byAdSet.values())
  }

  async getPerformanceData(dto: InsightsQueryDto): Promise<PerformanceDto> {
    const [summaryRows, dailyRows, adsetSummaryRows, adsetDailyRows, adsFlat] = await Promise.all([
      this.getInsights(dto),
      this.getInsightsDaily(dto),
      this.getInsightRowsAtAdSetLevel(dto, { daily: false }),
      this.getInsightRowsAtAdSetLevel(dto, { daily: true }),
      this.fetchAdsFlat(dto),
    ])

    const byAdSet = this.buildByAdSet(adsetSummaryRows, adsetDailyRows, adsFlat)

    return {
      summary: this.toSummaryMetrics(summaryRows),
      chart: this.toDailyChart(dailyRows),
      byAdSet,
      ads: adsFlat,
    }
  }

  private async fetchAdsFlat(dto: InsightsQueryDto): Promise<AdDto[]> {
    const level = Object.assign(new LevelDto(), { ad: 'ad' })
    const params = { fields: AD_FIELDS, ...this.filterParams(dto, level) }
    return this.fetchFromAccounts<AdDto>('/ads', params, dto, 'ads')
  }

  private async getInsightRowsAtAdSetLevel(
    dto: InsightsQueryDto,
    options: { daily?: boolean },
  ): Promise<InsightRow[]> {
    const levelDto = this.getInsightLevel(dto)
    const fields = options.daily ? DAILY_INSIGHTS_FIELDS_ADSET : INSIGHTS_FIELDS_ADSET
    const params = {
      fields,
      ...(options.daily && { time_increment: 1 }),
      ...this.timeParams(dto),
      ...this.filterParams(dto, levelDto),
      level: 'adset',
    }
    return this.fetchFromAccounts<InsightRow>(
      '/insights',
      params,
      dto,
      options.daily ? 'adset daily insights' : 'adset insights',
    )
  }

  private buildByAdSet(
    adsetSummaryRows: InsightRow[],
    adsetDailyRows: InsightRow[],
    ads: AdDto[],
  ): PerformanceDto['byAdSet'] {
    const adSetIds = new Set<string>()
    for (const r of adsetSummaryRows) {
      if (r.adset_id && r.adset_name) adSetIds.add(r.adset_id)
    }
    if (adSetIds.size === 0) {
      for (const r of adsetDailyRows) {
        if (r.adset_id && r.adset_name) adSetIds.add(r.adset_id)
      }
    }
    if (adSetIds.size === 0) {
      for (const ad of ads) adSetIds.add(ad.adset_id)
    }

    const byAdSet: PerformanceDto['byAdSet'] = []
    for (const adSetId of adSetIds) {
      const adsetName =
        adsetSummaryRows.find((r) => r.adset_id === adSetId)?.adset_name ??
        adsetDailyRows.find((r) => r.adset_id === adSetId)?.adset_name ??
        ads.find((a) => a.adset_id === adSetId)?.adset?.name ??
        adSetId

      const summaryRows = adsetSummaryRows.filter((r) => r.adset_id === adSetId)
      const dailyRows = adsetDailyRows.filter((r) => r.adset_id === adSetId)
      const adSetAds = ads.filter((a) => a.adset_id === adSetId)

      byAdSet.push({
        adSet: { id: adSetId, name: adsetName },
        summary: this.toSummaryMetrics(summaryRows),
        chart: this.toDailyChart(dailyRows),
        ads: adSetAds,
      })
    }
    return byAdSet
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
}
