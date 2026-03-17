import { IsString, IsNotEmpty, MinLength, Matches, IsOptional } from 'class-validator'

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  email?: string

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  username?: string

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'The password must be at least 8 characters long' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'The password is too weak. It must contain uppercase letters, numbers, and special characters',
  })
  password: string
}
