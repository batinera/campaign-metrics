import { registerEnumType } from '@nestjs/graphql'

export enum SortByEnum {
  NAME = 'name',
  CREATED_TIME = 'created_time',
}

registerEnumType(SortByEnum, {
  name: 'SortByEnum',
  description: 'Sort by field',
})
