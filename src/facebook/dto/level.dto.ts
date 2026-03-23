import { Expose } from 'class-transformer'

export class LevelDto {
  @Expose()
  account: string

  @Expose()
  campaign: string

  @Expose()
  ad: string

  @Expose()
  campaigns: string
}
