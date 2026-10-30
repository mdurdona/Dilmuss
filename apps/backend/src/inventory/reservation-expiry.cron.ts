import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InventoryService } from './inventory.service';

@Injectable()
export class ReservationExpiryCron {
  private readonly logger = new Logger(ReservationExpiryCron.name);

  constructor(private readonly inventoryService: InventoryService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiry() {
    const count = await this.inventoryService.expireDueReservations();
    if (count > 0) this.logger.log(`${count} ta muddati o'tgan rezerv bo'shatildi`);
  }
}
