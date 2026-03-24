import {
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'

export class ErrorCode {
  static INVALID_CREDENTIALS = new UnauthorizedException('INVALID_CREDENTIALS')
  static USER_NOT_FOUND = new NotFoundException('USER_NOT_FOUND')
  static WEAK_PASSWORD = new BadRequestException('WEAK_PASSWORD')
  static UNAUTHORIZED = new UnauthorizedException('UNAUTHORIZED')
  static TOKEN_EXPIRED = new UnauthorizedException('TOKEN_EXPIRED')

  static FB_API_ERROR = new BadRequestException('FB_API_ERROR')
  static ACCOUNT_NOT_FOUND = new NotFoundException('ACCOUNT_NOT_FOUND')
  static CAMPAIGN_NOT_FOUND = new NotFoundException('CAMPAIGN_NOT_FOUND')
  static ADSET_NOT_FOUND = new NotFoundException('ADSET_NOT_FOUND')
  static AD_NOT_FOUND = new NotFoundException('AD_NOT_FOUND')
  static INSUFFICIENT_PERMISSIONS = new ForbiddenException('INSUFFICIENT_PERMISSIONS')

  static INTERNAL_SERVER_ERROR = new InternalServerErrorException('INTERNAL_SERVER_ERROR')
  static VALIDATION_ERROR = new BadRequestException('VALIDATION_ERROR')
}
