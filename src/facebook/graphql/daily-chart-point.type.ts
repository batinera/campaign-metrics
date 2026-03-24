import { ObjectType, Field } from '@nestjs/graphql'

@ObjectType()
export class DailyChartPoint {
  @Field()
  date: string

  @Field()
  spend: number

  @Field()
  impressions: number
}
