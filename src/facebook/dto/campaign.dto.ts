import { StatusEnum } from '@/common/enums'
import { Expose, Type } from 'class-transformer'
import { AdSetDto } from '@/facebook/dto'

export class CampaignDto {
  @Expose()
  id: string

  @Expose()
  name: string

  @Expose()
  status: StatusEnum

  @Expose()
  account_id: string

  @Expose()
  created_time: string
}

export class CampaignWithAdSetsDto extends CampaignDto {
  @Expose()
  @Type(() => AdSetDto)
  adSets: AdSetDto[]
}
