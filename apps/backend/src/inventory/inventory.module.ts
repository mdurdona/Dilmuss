import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { StockTransferService } from './stock-transfer.service';
import { StockTransferController } from './stock-transfer.controller';
import { ReservationExpiryCron } from './reservation-expiry.cron';
import { AuditModule } from '../audit/audit.module';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [AuditModule, BranchesModule],
  providers: [InventoryService, StockTransferService, ReservationExpiryCron],
  controllers: [InventoryController, StockTransferController],
  exports: [InventoryService, StockTransferService],
})
export class InventoryModule {}
