import { IsPhoneNumber, IsString } from 'class-validator';

export class LoginDto {
  @IsPhoneNumber('UZ')
  phone: string;

  @IsString()
  password: string;
}
