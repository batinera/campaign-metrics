import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { LoginDto } from 'src/facebook/auth/dto'
import { User } from 'src/facebook/auth/entity'
import { ErrorCode } from 'src/common/enums'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { username, email, password } = loginDto

    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.username = :username OR user.email = :email', {
        username: username || '',
        email: email || '',
      })
      .getOne()

    if (!user) {
      throw ErrorCode.INVALID_CREDENTIALS
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      throw ErrorCode.INVALID_CREDENTIALS
    }

    const payload = { username: user.username, sub: user.id }
    return {
      access_token: this.jwtService.sign(payload),
    }
  }
}
