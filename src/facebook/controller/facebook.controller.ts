import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ErrorCode } from '@/common/enums'
import { JwtAuthGuard } from '@/facebook/auth'
import { InsightsQueryDto } from '@/facebook/dto'
import { FacebookService } from '@/facebook/service'

@Controller('facebook')
@UseGuards(JwtAuthGuard)
export class FacebookController {
  constructor(private readonly facebookService: FacebookService) {}

  @Get('accounts')
  async getAccounts() {
    try {
      return await this.facebookService.getAdAccounts()
    } catch {
      throw ErrorCode.FB_API_ERROR
    }
  }

  @Get('metrics')
  async getMetrics(@Query() query: InsightsQueryDto) {
    try {
      const rows = await this.facebookService.getInsights(query)
      return this.facebookService.toSummaryMetrics(rows)
    } catch {
      throw ErrorCode.FB_API_ERROR
    }
  }

  @Get('chart')
  async getChart(@Query() query: InsightsQueryDto) {
    try {
      const rows = await this.facebookService.getInsightsDaily(query)
      return this.facebookService.toDailyChart(rows)
    } catch {
      throw ErrorCode.FB_API_ERROR
    }
  }
}
