import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ErrorCode } from '@/common/enums'
import { JwtAuthGuard } from '@/facebook/auth'
import {
  InsightsQueryDto,
  AdAccountDto,
  CampaignWithAdSetsDto,
  AdsByAdSetDto,
  PerformanceDto,
} from '@/facebook/dto'
import { FacebookService } from '@/facebook/service'

@Controller('facebook')
@UseGuards(JwtAuthGuard)
export class FacebookController {
  constructor(private readonly facebookService: FacebookService) {}

  @Get('accounts')
  async getAccounts(): Promise<AdAccountDto[]> {
    try {
      return await this.facebookService.getAdAccounts()
    } catch {
      throw ErrorCode.FB_API_ERROR
    }
  }

  @Get('campaigns')
  async getCampaigns(@Query() query: InsightsQueryDto): Promise<CampaignWithAdSetsDto[]> {
    try {
      return await this.facebookService.getCampaigns(query)
    } catch {
      throw ErrorCode.FB_API_ERROR
    }
  }

  @Get('ads')
  async getAds(@Query() query: InsightsQueryDto): Promise<AdsByAdSetDto[]> {
    try {
      return await this.facebookService.getAds(query)
    } catch {
      throw ErrorCode.FB_API_ERROR
    }
  }

  @Get('performance')
  async getPerformance(@Query() query: InsightsQueryDto): Promise<PerformanceDto> {
    try {
      return await this.facebookService.getPerformanceData(query)
    } catch {
      throw ErrorCode.FB_API_ERROR
    }
  }
}
