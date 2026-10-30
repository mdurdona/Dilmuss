import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { DiscountType } from '@prisma/client';

export class VariantInputDto {
  @IsString()
  sku: string;

  @IsString()
  color: string;

  @IsOptional()
  @IsString()
  colorHex?: string;

  @IsString()
  size: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @IsOptional()
  @IsInt()
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsDateString()
  discountStartsAt?: string;

  @IsOptional()
  @IsDateString()
  discountEndsAt?: string;
}
