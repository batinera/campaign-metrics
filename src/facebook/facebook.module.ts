import { Module } from '@nestjs/common'
import { AuthModule } from '@/facebook/auth'
import { FacebookResolver } from '@/facebook/resolver/facebook.resolver'
import { FacebookService, FacebookAPIHelper, FacebookInsightsService } from '@/facebook/service'
import '@/facebook/graphql/enums'

@Module({
  imports: [AuthModule],
  providers: [FacebookResolver, FacebookService, FacebookAPIHelper, FacebookInsightsService],
  exports: [FacebookService],
})
export class FacebookModule {}
