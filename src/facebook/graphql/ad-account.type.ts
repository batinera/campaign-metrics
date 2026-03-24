import { ObjectType, Field } from '@nestjs/graphql'

@ObjectType()
export class AdAccount {
  @Field()
  id: string

  @Field()
  accountId: string

  @Field()
  name: string

  @Field(() => String, { nullable: true })
  currency?: string
}
