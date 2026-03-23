import { StatusEnum } from '@/common/enums'
import { Expose } from 'class-transformer'

export class AdSetDto {
  @Expose()
  id: string

  @Expose()
  name: string

  @Expose()
  status: StatusEnum

  @Expose()
  campaign_id: string

  @Expose()
  account_id: string

  @Expose()
  created_time: string
}
