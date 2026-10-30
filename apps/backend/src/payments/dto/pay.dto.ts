import { IsEnum } from 'class-validator';
import { PaymentProvider } from '@prisma/client';

export class PayDto {
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;
}
