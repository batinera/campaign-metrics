import { Expose, Type } from 'class-transformer'
import { AdDto } from '@/facebook/dto'

export class SummaryDetailsDto {
  @Expose()
  account_id?: string

  @Expose()
  account_name?: string

  @Expose()
  campaigns?: { id: string; name: string }[]
}

export class SummaryMetricsDto {
  @Expose()
  spend: number

  @Expose()
  results: number

  @Expose()
  cpa: number

  @Expose()
  reach: number

  @Expose()
  impressions: number

  @Expose()
  ctr: number

  @Expose()
  cpm: number

  @Expose()
  @Type(() => SummaryDetailsDto)
  details?: SummaryDetailsDto
}

export class DailyChartPointDto {
  @Expose()
  date: string

  @Expose()
  spend: number

  @Expose()
  impressions: number
}

export class PerformanceByAdSetDto {
  @Expose()
  adSet: { id: string; name: string }

  @Expose()
  @Type(() => SummaryMetricsDto)
  summary: SummaryMetricsDto

  @Expose()
  @Type(() => DailyChartPointDto)
  chart: DailyChartPointDto[]

  @Expose()
  @Type(() => AdDto)
  ads: AdDto[]
}

export class PerformanceDto {
  @Expose()
  @Type(() => SummaryMetricsDto)
  summary: SummaryMetricsDto

  @Expose()
  @Type(() => DailyChartPointDto)
  chart: DailyChartPointDto[]

  @Expose()
  @Type(() => PerformanceByAdSetDto)
  byAdSet: PerformanceByAdSetDto[]

  @Expose()
  @Type(() => AdDto)
  ads: AdDto[]
}
