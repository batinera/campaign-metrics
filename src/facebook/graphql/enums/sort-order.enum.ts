import { registerEnumType } from '@nestjs/graphql'

export enum SortOrderEnum {
  ASC = 'asc',
  DESC = 'desc',
}

registerEnumType(SortOrderEnum, {
  name: 'SortOrderEnum',
  description: 'Sort order direction',
})
