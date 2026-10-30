import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { AddressMethod } from '@prisma/client';

export class CreateAddressDto {
  @IsString()
  recipientName: string;

  @IsString()
  phone: string;

  @IsString()
  region: string;

  @IsString()
  district: string;

  @IsOptional()
  @IsString()
  mahalla?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  house?: string;

  @IsOptional()
  @IsString()
  apartment?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsEnum(AddressMethod)
  method?: AddressMethod;

  @IsOptional()
  isDefault?: boolean;
}
