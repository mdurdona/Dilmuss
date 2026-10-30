import { IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  fullName: string;

  @IsPhoneNumber('UZ')
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;
}
