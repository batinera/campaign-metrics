import { ObjectType, Field } from '@nestjs/graphql'

@ObjectType()
export class SummaryDetails {
  @Field(() => String, { nullable: true })
  account_id?: string

  @Field(() => String, { nullable: true })
  account_name?: string

  @Field(() => [CampaignRef], { nullable: true })
  campaigns?: CampaignRef[]
}

@ObjectType()
export class CampaignRef {
  @Field()
  id: string

  @Field()
  name: string
}

@ObjectType()
export class SummaryMetrics {
  @Field()
  spend: number

  @Field()
  results: number

  @Field()
  cpa: number

  @Field()
  reach: number

  @Field()
  impressions: number

  @Field()
  ctr: number

  @Field()
  cpm: number

  @Field(() => SummaryDetails, { nullable: true })
  details?: SummaryDetails
}
