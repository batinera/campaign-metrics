import { Injectable, Logger } from '@nestjs/common'
import { ErrorCode } from '@/common/enums'
import { FacebookAPIHelper } from './facebook-api.helper'
import { FacebookInsightsService } from './facebook-insights.service'
import { CAMPAIGN_FIELDS, ADSET_FIELDS, AD_FIELDS } from '@/facebook/constants'
import {
  InsightsQueryDto,
  AdAccountDto,
  CampaignDto,
  AdSetDto,
  AdDto,
  SummaryMetricsDto,
  DailyChartPointDto,
} from '@/facebook/dto'

@Injectable()
export class FacebookService {
  private readonly logger = new Logger(FacebookService.name)

  constructor(
    private readonly apiHelper: FacebookAPIHelper,
    private readonly insightsService: FacebookInsightsService,
  ) {}

  async getAdAccounts(): Promise<AdAccountDto[]> {
    const accounts = await this.apiHelper.fetchList<AdAccountDto>('/me/adaccounts', {
      fields: 'id,account_id,name,currency',
    })

    if (accounts.length === 0) {
      throw ErrorCode.ACCOUNT_NOT_FOUND
    }

    return accounts
  }

  async getCampaignsWithFullHierarchy(dto: InsightsQueryDto = {}): Promise<
    Array<
      CampaignDto & {
        summary: SummaryMetricsDto
        chart: DailyChartPointDto[]
        adSets: Array<
          AdSetDto & {
            summary: SummaryMetricsDto
            chart: DailyChartPointDto[]
            ads: AdDto[]
          }
        >
      }
    >
  > {
    const campaigns = await this.fetchCampaigns(dto)

    const sorted = this.sortCampaigns(campaigns, dto)

    if (dto.campaignId || (dto.campaignIds && dto.campaignIds.length > 0)) {
      return this.buildHierarchyFromCampaigns(sorted, dto)
    }

    return this.buildHierarchyFromAccount(sorted, dto)
  }

  private async fetchCampaigns(dto: InsightsQueryDto): Promise<CampaignDto[]> {
    if (dto.campaignId) {
      const campaign = await this.apiHelper.fetchRequired<CampaignDto>(`/${dto.campaignId}`, {
        fields: CAMPAIGN_FIELDS,
      })
      return [campaign]
    }

    if (dto.campaignIds && dto.campaignIds.length > 0) {
      const campaigns: CampaignDto[] = []
      for (const id of dto.campaignIds) {
        try {
          const campaign = await this.apiHelper.fetchRequired<CampaignDto>(`/${id}`, {
            fields: CAMPAIGN_FIELDS,
          })
          campaigns.push(campaign)
        } catch (error) {
          if (error === ErrorCode.CAMPAIGN_NOT_FOUND) {
            this.logger.warn(`Campaign ${id} not found, skipping`)
          } else {
            throw error
          }
        }
      }
      if (campaigns.length === 0) {
        throw ErrorCode.CAMPAIGN_NOT_FOUND
      }
      return campaigns
    }

    if (dto.accountId) {
      return this.fetchCampaignsFromAccount(dto.accountId, dto)
    }

    const accounts = await this.getAdAccounts()
    const allCampaigns: CampaignDto[] = []
    for (const account of accounts) {
      const campaigns = await this.fetchCampaignsFromAccount(account.id, dto)
      allCampaigns.push(...campaigns)
    }
    return allCampaigns
  }

  private async fetchCampaignsFromAccount(
    accountId: string,
    dto: InsightsQueryDto,
  ): Promise<CampaignDto[]> {
    const params: Record<string, unknown> = { fields: CAMPAIGN_FIELDS }

    if (dto.status) {
      params.filtering = JSON.stringify([
        { field: 'effective_status', operator: 'IN', value: [String(dto.status)] },
      ])
    }

    return this.apiHelper.fetchList<CampaignDto>(`/${accountId}/campaigns`, params)
  }

  private async buildHierarchyFromCampaigns(
    campaigns: CampaignDto[],
    dto: InsightsQueryDto,
  ): Promise<
    Array<
      CampaignDto & {
        summary: SummaryMetricsDto
        chart: DailyChartPointDto[]
        adSets: Array<
          AdSetDto & {
            summary: SummaryMetricsDto
            chart: DailyChartPointDto[]
            ads: AdDto[]
          }
        >
      }
    >
  > {
    const adSetsByCampaign = await this.fetchAllAdSetsForCampaigns(campaigns, dto)
    const allAdSets = Array.from(adSetsByCampaign.values()).flat()

    const [campaignInsightsMap, adSetInsightsMap, adSetAdsMap] = await Promise.all([
      this.fetchAllCampaignInsights(campaigns, dto),
      this.fetchAllAdSetInsights(allAdSets, dto),
      this.fetchAllAdsForAdSets(allAdSets, dto),
    ])

    return campaigns.map((campaign) => {
      const campaignAdSets = adSetsByCampaign.get(campaign.id) ?? []
      const insights = campaignInsightsMap.get(campaign.id)

      const adSetsWithMetrics = campaignAdSets.map((adSet) => {
        const adSetInsights = adSetInsightsMap.get(adSet.id)
        return {
          ...adSet,
          summary: adSetInsights?.summary ?? this.insightsService.toSummaryMetrics([]),
          chart: adSetInsights?.chart ?? [],
          ads: adSetAdsMap.get(adSet.id) ?? [],
        }
      })

      return {
        ...campaign,
        summary: insights?.summary ?? this.insightsService.toSummaryMetrics([]),
        chart: insights?.chart ?? [],
        adSets: adSetsWithMetrics,
      }
    })
  }

  private async buildHierarchyFromAccount(
    campaigns: CampaignDto[],
    dto: InsightsQueryDto,
  ): Promise<
    Array<
      CampaignDto & {
        summary: SummaryMetricsDto
        chart: DailyChartPointDto[]
        adSets: Array<
          AdSetDto & {
            summary: SummaryMetricsDto
            chart: DailyChartPointDto[]
            ads: AdDto[]
          }
        >
      }
    >
  > {
    if (campaigns.length === 0) {
      return []
    }

    let accountId = dto.accountId
    if (!accountId && campaigns[0]?.account_id) {
      const rawId = campaigns[0].account_id
      accountId = rawId.startsWith('act_') ? rawId : `act_${rawId}`
    }
    if (!accountId) {
      throw ErrorCode.ACCOUNT_NOT_FOUND
    }

    const [summaryRows, dailyRows, allAdSets, allAds] = await Promise.all([
      this.insightsService.getAccountInsights(accountId, dto, false),
      this.insightsService.getAccountInsights(accountId, dto, true),
      this.fetchAdSetsFromAccount(accountId, dto),
      this.fetchAdsFromAccount(accountId, dto),
    ])

    const adSetInsightsMap = await this.fetchAllAdSetInsights(allAdSets, dto)

    const adSetsByCampaign = this.groupBy(allAdSets, 'campaign_id')
    const adsByAdSet = this.groupBy(allAds, 'adset_id')

    return campaigns.map((campaign) => {
      const campaignAdSets = adSetsByCampaign.get(campaign.id) ?? []
      const campaignSummary = summaryRows.filter((r) => r.campaign_id === campaign.id)
      const campaignDaily = dailyRows.filter((r) => r.campaign_id === campaign.id)

      const adSetsWithMetrics = campaignAdSets.map((adSet) => {
        const adSetInsights = adSetInsightsMap.get(adSet.id)
        return {
          ...adSet,
          summary: adSetInsights?.summary ?? this.insightsService.toSummaryMetrics([]),
          chart: adSetInsights?.chart ?? [],
          ads: adsByAdSet.get(adSet.id) ?? [],
        }
      })

      return {
        ...campaign,
        summary: this.insightsService.toSummaryMetrics(campaignSummary),
        chart: this.insightsService.toDailyChart(campaignDaily),
        adSets: adSetsWithMetrics,
      }
    })
  }

  private async fetchAdSetsForCampaign(
    campaignId: string,
    dto: InsightsQueryDto,
  ): Promise<AdSetDto[]> {
    const params: Record<string, unknown> = { fields: ADSET_FIELDS }

    if (dto.status) {
      params.filtering = JSON.stringify([
        { field: 'effective_status', operator: 'IN', value: [String(dto.status)] },
      ])
    }

    return this.apiHelper.fetchOptional<AdSetDto>(`/${campaignId}/adsets`, params)
  }

  private async fetchAdSetsFromAccount(
    accountId: string,
    dto: InsightsQueryDto,
  ): Promise<AdSetDto[]> {
    const params: Record<string, unknown> = { fields: ADSET_FIELDS }

    if (dto.status) {
      params.filtering = JSON.stringify([
        { field: 'effective_status', operator: 'IN', value: [String(dto.status)] },
      ])
    }

    return this.apiHelper.fetchList<AdSetDto>(`/${accountId}/adsets`, params)
  }

  private async fetchAdsForAdSet(adSetId: string, dto: InsightsQueryDto): Promise<AdDto[]> {
    const params: Record<string, unknown> = { fields: AD_FIELDS }

    if (dto.status) {
      params.filtering = JSON.stringify([
        { field: 'effective_status', operator: 'IN', value: [String(dto.status)] },
      ])
    }

    return this.apiHelper.fetchOptional<AdDto>(`/${adSetId}/ads`, params)
  }

  private async fetchAdsFromAccount(accountId: string, dto: InsightsQueryDto): Promise<AdDto[]> {
    const params: Record<string, unknown> = { fields: AD_FIELDS }

    if (dto.status) {
      params.filtering = JSON.stringify([
        { field: 'effective_status', operator: 'IN', value: [String(dto.status)] },
      ])
    }

    return this.apiHelper.fetchList<AdDto>(`/${accountId}/ads`, params)
  }

  private async fetchAllAdSetsForCampaigns(
    campaigns: CampaignDto[],
    dto: InsightsQueryDto,
  ): Promise<Map<string, AdSetDto[]>> {
    const results = await Promise.all(
      campaigns.map(async (campaign) => ({
        campaignId: campaign.id,
        adSets: await this.fetchAdSetsForCampaign(campaign.id, dto),
      })),
    )

    const map = new Map<string, AdSetDto[]>()
    for (const { campaignId, adSets } of results) {
      map.set(campaignId, adSets)
    }
    return map
  }

  private async fetchAllCampaignInsights(
    campaigns: CampaignDto[],
    dto: InsightsQueryDto,
  ): Promise<Map<string, { summary: SummaryMetricsDto; chart: DailyChartPointDto[] }>> {
    const results = await Promise.all(
      campaigns.map(async (campaign) => {
        const [summaryRows, dailyRows] = await Promise.all([
          this.insightsService.getCampaignInsights(campaign.id, dto, false),
          this.insightsService.getCampaignInsights(campaign.id, dto, true),
        ])
        return {
          campaignId: campaign.id,
          summary: this.insightsService.toSummaryMetrics(summaryRows),
          chart: this.insightsService.toDailyChart(dailyRows),
        }
      }),
    )

    const map = new Map<string, { summary: SummaryMetricsDto; chart: DailyChartPointDto[] }>()
    for (const { campaignId, summary, chart } of results) {
      map.set(campaignId, { summary, chart })
    }
    return map
  }

  private async fetchAllAdSetInsights(
    adSets: AdSetDto[],
    dto: InsightsQueryDto,
  ): Promise<Map<string, { summary: SummaryMetricsDto; chart: DailyChartPointDto[] }>> {
    const results = await Promise.all(
      adSets.map(async (adSet) => {
        const [summaryRows, dailyRows] = await Promise.all([
          this.insightsService.getAdSetInsights(adSet.id, dto, false),
          this.insightsService.getAdSetInsights(adSet.id, dto, true),
        ])
        return {
          adSetId: adSet.id,
          summary: this.insightsService.toSummaryMetrics(summaryRows),
          chart: this.insightsService.toDailyChart(dailyRows),
        }
      }),
    )

    const map = new Map<string, { summary: SummaryMetricsDto; chart: DailyChartPointDto[] }>()
    for (const { adSetId, summary, chart } of results) {
      map.set(adSetId, { summary, chart })
    }
    return map
  }

  private async fetchAllAdsForAdSets(
    adSets: AdSetDto[],
    dto: InsightsQueryDto,
  ): Promise<Map<string, AdDto[]>> {
    const results = await Promise.all(
      adSets.map(async (adSet) => ({
        adSetId: adSet.id,
        ads: await this.fetchAdsForAdSet(adSet.id, dto),
      })),
    )

    const map = new Map<string, AdDto[]>()
    for (const { adSetId, ads } of results) {
      map.set(adSetId, ads)
    }
    return map
  }

  private sortCampaigns(campaigns: CampaignDto[], dto: InsightsQueryDto): CampaignDto[] {
    const { sortBy = 'created_time', sortOrder = 'desc' } = dto

    return campaigns.sort((a, b) => {
      const comparison =
        sortBy === 'name'
          ? a.name.localeCompare(b.name)
          : new Date(a.created_time).getTime() - new Date(b.created_time).getTime()
      return sortOrder === 'desc' ? -comparison : comparison
    })
  }

  private groupBy<T>(items: T[], key: keyof T): Map<string, T[]> {
    const map = new Map<string, T[]>()
    for (const item of items) {
      const value = String(item[key])
      const list = map.get(value) ?? []
      list.push(item)
      map.set(value, list)
    }
    return map
  }
}
