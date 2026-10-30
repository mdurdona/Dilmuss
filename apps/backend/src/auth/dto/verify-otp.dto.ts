import { IsPhoneNumber, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsPhoneNumber('UZ')
  phone: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
