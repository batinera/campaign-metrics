import { Expose } from 'class-transformer'

export class AdAccountDto {
  @Expose()
  id: string

  @Expose()
  account_id: string

  @Expose()
  name: string

  @Expose()
  currency: string
}
