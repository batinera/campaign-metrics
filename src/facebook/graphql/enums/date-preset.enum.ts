import { registerEnumType } from '@nestjs/graphql'

export enum DatePresetEnum {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  LAST_7D = 'last_7d',
  LAST_14D = 'last_14d',
  LAST_30D = 'last_30d',
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  MAXIMUM = 'maximum',
}

registerEnumType(DatePresetEnum, {
  name: 'DatePresetEnum',
  description: 'Predefined date ranges',
})
