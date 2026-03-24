import { ObjectType, Field } from '@nestjs/graphql'
import { registerEnumType } from '@nestjs/graphql'
import { StatusEnum } from '@/common/enums'
import { AdCreative } from './ad-creative.type'

registerEnumType(StatusEnum, {
  name: 'StatusEnum',
  description: 'Status of campaign, ad set or ad',
})

@ObjectType()
export class Ad {
  @Field()
  id: string

  @Field()
  name: string

  @Field(() => String)
  status: string

  @Field()
  adset_id: string

  @Field()
  campaign_id: string

  @Field()
  created_time: string

  @Field(() => AdCreative, { nullable: true })
  creative?: AdCreative
}
