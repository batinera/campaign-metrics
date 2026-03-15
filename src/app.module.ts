import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { FacebookModule } from './facebook/facebook.module'

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }), FacebookModule],
})
export class AppModule {}
