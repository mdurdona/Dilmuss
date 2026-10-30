import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymeAdapter } from './adapters/payme.adapter';
import { ClickAdapter } from './adapters/click.adapter';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  providers: [PaymentsService, PaymeAdapter, ClickAdapter],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
