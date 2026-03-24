import { Resolver, Query, Args } from '@nestjs/graphql'
import { UseGuards, Logger } from '@nestjs/common'
import { JwtAuthGuard } from '@/facebook/auth'
import { FacebookService } from '@/facebook/service'
import { AdAccount } from '@/facebook/graphql/ad-account.type'
import { Campaign } from '@/facebook/graphql/campaign.type'
import { CampaignFilterInput } from '@/facebook/graphql/campaign-filter.input'
import { InsightsQueryDto } from '@/facebook/dto'

@Resolver()
@UseGuards(JwtAuthGuard)
export class FacebookResolver {
  private readonly logger = new Logger(FacebookResolver.name)

  constructor(private readonly facebookService: FacebookService) {}

  @Query(() => [AdAccount])
  async accounts(): Promise<AdAccount[]> {
    const data = await this.facebookService.getAdAccounts()
    return data.map((acc) => ({
      id: acc.id,
      accountId: acc.account_id,
      name: acc.name,
      currency: acc.currency,
    }))
  }

  @Query(() => [Campaign])
  async campaigns(
    @Args('filter', { nullable: true }) filter?: CampaignFilterInput,
  ): Promise<Campaign[]> {
    const dto = this.filterToDto(filter ?? {})

    const data = await this.facebookService.getCampaignsWithFullHierarchy(dto)

    return data.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      account_id: c.account_id,
      created_time: c.created_time,
      summary: c.summary,
      chart: c.chart,
      adSets: c.adSets.map((as) => ({
        id: as.id,
        name: as.name,
        status: as.status,
        campaign_id: as.campaign_id,
        summary: as.summary,
        chart: as.chart,
        ads: as.ads.map((ad) => ({
          id: ad.id,
          name: ad.name,
          status: ad.status,
          adset_id: ad.adset_id,
          campaign_id: ad.campaign_id,
          created_time: ad.created_time,
          creative: ad.creative,
        })),
      })),
    }))
  }

  private filterToDto(filter: Partial<CampaignFilterInput>): InsightsQueryDto {
    return {
      accountId: filter.accountId,
      campaignId: filter.campaignId,
      campaignIds: filter.campaignIds,
      status: filter.status,
      datePreset: filter.datePreset as InsightsQueryDto['datePreset'],
      dateStart: filter.dateStart,
      dateEnd: filter.dateEnd,
      sortBy: filter.sortBy ?? 'created_time',
      sortOrder: filter.sortOrder ?? 'desc',
    }
  }
}
