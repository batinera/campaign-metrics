import { Module } from '@nestjs/common'
import { AuthModule } from '@/facebook/auth'
import { FacebookController } from '@/facebook/controller'
import { FacebookService } from '@/facebook/service'

@Module({
  imports: [AuthModule],
  controllers: [FacebookController],
  providers: [FacebookService],
  exports: [FacebookService],
})
export class FacebookModule {}
