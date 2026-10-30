import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { InventoryMovementReason } from '@prisma/client';

export class AdjustStockDto {
  @IsString()
  branchId: string;

  @IsString()
  variantId: string;

  @IsInt()
  delta: number;

  @IsEnum(InventoryMovementReason)
  reason: InventoryMovementReason;

  @IsOptional()
  @IsString()
  note?: string;
}
