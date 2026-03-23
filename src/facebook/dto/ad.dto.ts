import { StatusEnum } from '@/common/enums'
import { Expose, Type } from 'class-transformer'

export class AdCreativeDto {
  @Expose()
  id: string

  @Expose()
  name?: string

  @Expose()
  body?: string

  @Expose()
  image_url?: string

  @Expose()
  thumbnail_url?: string

  @Expose()
  video_id?: string
}

export class AdDto {
  @Expose()
  id: string

  @Expose()
  name: string

  @Expose()
  status: StatusEnum

  @Expose()
  adset_id: string

  @Expose()
  adset?: { id: string; name: string }

  @Expose()
  campaign_id: string

  @Expose()
  created_time: string

  @Expose()
  @Type(() => AdCreativeDto)
  creative?: AdCreativeDto
}

export class AdsByAdSetDto {
  adSet: { id: string; name: string }
  ads: AdDto[]
}
