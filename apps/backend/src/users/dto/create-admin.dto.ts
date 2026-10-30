import { IsEmail, IsEnum, IsOptional, IsPhoneNumber, IsString } from 'class-validator';
import { BranchScope } from '@prisma/client';
import { IsAdminPassword } from './admin-password.decorator';

export class CreateAdminDto {
  @IsString()
  fullName: string;

  @IsPhoneNumber('UZ')
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @IsAdminPassword()
  password: string;

  @IsEnum(BranchScope)
  branchScope: BranchScope;
}
