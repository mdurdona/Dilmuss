import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PermissionCode } from '@prisma/client';
import { StockTransferService } from './stock-transfer.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user';

@Controller('stock-transfers')
export class StockTransferController {
  constructor(private readonly stockTransferService: StockTransferService) {}

  @Get()
  @RequirePermissions(PermissionCode.INVENTORY_VIEW)
  list(@Query('branchId') branchId: string | undefined, @CurrentUser() user: RequestUser) {
    return this.stockTransferService.list(branchId, user);
  }

  @Post()
  @RequirePermissions(PermissionCode.INVENTORY_UPDATE)
  request(
    @Body('fromBranchId') fromBranchId: string,
    @Body('toBranchId') toBranchId: string,
    @Body('items') items: { variantId: string; quantity: number }[],
    @Body('note') note: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.stockTransferService.request(fromBranchId, toBranchId, items, user.id, note, user);
  }

  @Post(':id/approve')
  @RequirePermissions(PermissionCode.INVENTORY_UPDATE)
  approve(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.stockTransferService.approve(id, user.id, user);
  }

  @Post(':id/ship')
  @RequirePermissions(PermissionCode.INVENTORY_UPDATE)
  ship(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.stockTransferService.ship(id, user);
  }

  @Post(':id/receive')
  @RequirePermissions(PermissionCode.INVENTORY_UPDATE)
  receive(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.stockTransferService.receive(id, user.id, user);
  }

  @Post(':id/cancel')
  @RequirePermissions(PermissionCode.INVENTORY_UPDATE)
  cancel(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.stockTransferService.cancel(id, user);
  }
}
