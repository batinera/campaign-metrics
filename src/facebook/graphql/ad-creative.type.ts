import { ObjectType, Field } from '@nestjs/graphql'

@ObjectType()
export class AdCreative {
  @Field()
  id: string

  @Field(() => String, { nullable: true })
  name?: string

  @Field(() => String, { nullable: true })
  body?: string

  @Field(() => String, { nullable: true })
  image_url?: string

  @Field(() => String, { nullable: true })
  thumbnail_url?: string

  @Field(() => String, { nullable: true })
  video_id?: string
}
