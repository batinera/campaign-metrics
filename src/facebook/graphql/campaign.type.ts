import { ObjectType, Field } from '@nestjs/graphql'
import { SummaryMetrics } from './summary-metrics.type'
import { DailyChartPoint } from './daily-chart-point.type'
import { AdSet } from './ad-set.type'

@ObjectType()
export class Campaign {
  @Field()
  id: string

  @Field()
  name: string

  @Field(() => String)
  status: string

  @Field()
  account_id: string

  @Field()
  created_time: string

  @Field(() => SummaryMetrics, { nullable: true })
  summary?: SummaryMetrics

  @Field(() => [DailyChartPoint], { defaultValue: [] })
  chart: DailyChartPoint[]

  @Field(() => [AdSet])
  adSets: AdSet[]
}
