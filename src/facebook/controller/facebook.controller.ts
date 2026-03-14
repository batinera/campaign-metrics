import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { FacebookService } from "../service";
import { InsightsQueryDto } from "../dto";

@Controller("facebook")
export class FacebookController {
  constructor(private readonly facebookService: FacebookService) {}

  @Get("accounts")
  async getAccounts() {
    try {
      return await this.facebookService.getAdAccounts();
    } catch (e) {
      throw new HttpException(
        e?.message ?? "Error on listing accounts",
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Get("campaigns")
  async getCampaigns(@Query("accountId") accountId?: string) {
    try {
      return await this.facebookService.getCampaigns(accountId);
    } catch (e) {
      throw new HttpException(
        e?.message ?? "Error on listing campaigns",
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Get("insights")
  async getInsights(@Query() query: InsightsQueryDto) {
    try {
      const rows = await this.facebookService.getInsights(query);

      return this.facebookService.toCampaignMetrics(rows);
    } catch (e) {
      throw new HttpException(
        e?.message ?? "Error on getting insights",
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Get("insights/raw")
  async getInsightsRaw(@Query() query: InsightsQueryDto) {
    try {
      return await this.facebookService.getInsightsRaw(query);
    } catch (e) {
      throw new HttpException(
        e?.message ?? "Error on getting raw insights",
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Get("insights/daily")
  async getInsightsDaily(@Query() query: InsightsQueryDto) {
    try {
      const rows = await this.facebookService.getInsightsDaily(query);

      return this.facebookService.toDailyChart(rows);
    } catch (e) {
      throw new HttpException(
        e?.message ?? "Error on getting daily insights",
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
