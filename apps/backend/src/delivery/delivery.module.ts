import { Module } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { DeliveryZonesService } from './delivery-zones.service';
import { DeliveryController } from './delivery.controller';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [BranchesModule],
  providers: [DeliveryService, DeliveryZonesService],
  controllers: [DeliveryController],
  exports: [DeliveryService, DeliveryZonesService],
})
export class DeliveryModule {}
