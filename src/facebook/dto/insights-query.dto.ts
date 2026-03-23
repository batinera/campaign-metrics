import { IsOptional, IsString, IsIn, Matches, IsEnum } from 'class-validator'
import { Expose, Transform } from 'class-transformer'
import { StatusEnum } from '@/common/enums'

const DATE_PRESETS = [
  'today',
  'yesterday',
  'last_7d',
  'last_14d',
  'last_30d',
  'this_month',
  'last_month',
  'maximum',
] as const

export class InsightsQueryDto {
  @IsOptional()
  @IsString()
  @Transform(({ obj, value }) => {
    const val = value ?? obj?.account_id ?? obj?.accountId
    return val && !String(val).startsWith('act_') ? `act_${val}` : val
  })
  @Matches(/^act_\d+$/, {
    message: 'accountId must be in the format act_XXXXXXXXX',
  })
  @Expose()
  accountId?: string

  @IsOptional()
  @IsString()
  campaignId?: string

  @IsOptional()
  @IsString({ each: true })
  campaignIds?: string[]

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(StatusEnum)
  status?: StatusEnum

  @IsOptional()
  @IsIn(DATE_PRESETS)
  datePreset?: (typeof DATE_PRESETS)[number]

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateStart?: string

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateEnd?: string

  @IsOptional()
  @IsString()
  @IsIn(['name', 'created_time'])
  sortBy?: 'name' | 'created_time' = 'created_time'

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc'
}
