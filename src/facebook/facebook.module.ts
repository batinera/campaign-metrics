import { Module } from '@nestjs/common'
import { FacebookController } from './controller'
import { FacebookService } from './service'

@Module({
  controllers: [FacebookController],
  providers: [FacebookService],
  exports: [FacebookService],
})
export class FacebookModule {}
