import { Module } from '@nestjs/common'
import { FacebookController } from 'src/facebook/controller'
import { FacebookService } from 'src/facebook/service'
import { AuthModule } from 'src/facebook/auth'

@Module({
  imports: [AuthModule],
  controllers: [FacebookController],
  providers: [FacebookService],
  exports: [FacebookService],
})
export class FacebookModule {}
