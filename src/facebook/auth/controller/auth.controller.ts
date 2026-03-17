import { Controller, Post, Body } from '@nestjs/common'
import { AuthService } from 'src/facebook/auth/service'
import { LoginDto } from 'src/facebook/auth/dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto)
  }
}
