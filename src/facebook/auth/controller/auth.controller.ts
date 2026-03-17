import { Body, Controller, Post } from '@nestjs/common'
import { LoginDto } from '@/facebook/auth/dto'
import { AuthService } from '@/facebook/auth/service'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto)
  }
}
