import { IsEnum, IsString } from 'class-validator';
import { OverrideEffect, PermissionCode } from '@prisma/client';

export class SetOverrideDto {
  @IsString()
  userId: string;

  @IsEnum(PermissionCode)
  permissionCode: PermissionCode;

  @IsEnum(OverrideEffect)
  effect: OverrideEffect;
}
