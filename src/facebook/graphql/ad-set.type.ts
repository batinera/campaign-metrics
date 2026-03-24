import { ObjectType, Field } from '@nestjs/graphql'
import { SummaryMetrics } from './summary-metrics.type'
import { DailyChartPoint } from './daily-chart-point.type'
import { Ad } from './ad.type'

@ObjectType()
export class AdSet {
  @Field()
  id: string

  @Field()
  name: string

  @Field(() => String)
  status: string

  @Field()
  campaign_id: string

  @Field(() => SummaryMetrics, { nullable: true })
  summary?: SummaryMetrics

  @Field(() => [DailyChartPoint], { defaultValue: [] })
  chart: DailyChartPoint[]

  @Field(() => [Ad])
  ads: Ad[]
}
