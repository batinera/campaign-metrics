import { InputType, Field } from '@nestjs/graphql'
import { StatusEnum } from '@/common/enums'
import { DatePresetEnum, SortByEnum, SortOrderEnum } from '@/facebook/graphql/enums'

@InputType()
export class CampaignFilterInput {
  @Field(() => String, { nullable: true })
  accountId?: string

  @Field(() => String, { nullable: true })
  campaignId?: string

  @Field(() => [String], { nullable: true })
  campaignIds?: string[]

  @Field(() => StatusEnum, { nullable: true })
  status?: StatusEnum

  @Field(() => DatePresetEnum, { nullable: true })
  datePreset?: DatePresetEnum

  @Field(() => String, { nullable: true, description: 'Start date in YYYY-MM-DD format' })
  dateStart?: string

  @Field(() => String, { nullable: true, description: 'End date in YYYY-MM-DD format' })
  dateEnd?: string

  @Field(() => SortByEnum, { nullable: true, defaultValue: SortByEnum.CREATED_TIME })
  sortBy?: SortByEnum

  @Field(() => SortOrderEnum, { nullable: true, defaultValue: SortOrderEnum.DESC })
  sortOrder?: SortOrderEnum
}
