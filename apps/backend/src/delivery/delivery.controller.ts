import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { DeliveryStatus, PermissionCode } from '@prisma/client';
import { DeliveryService } from './delivery.service';
import { DeliveryZonesService } from './delivery-zones.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user';

@Controller('deliveries')
export class DeliveryController {
  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly deliveryZonesService: DeliveryZonesService,
  ) {}

  @Public()
  @Get('zones')
  zones() {
    return this.deliveryZonesService.findAll();
  }

  @Public()
  @Get('zones/quote')
  quote(@Query('region') region: string, @Query('district') district?: string) {
    return this.deliveryZonesService.computeFee(region, district);
  }

  @Get()
  @RequirePermissions(PermissionCode.DELIVERY_VIEW)
  list(@Query('branchId') branchId: string | undefined, @Query('status') status: DeliveryStatus | undefined, @CurrentUser() user: RequestUser) {
    return this.deliveryService.list({ branchId, status }, user);
  }

  @Patch(':id/status')
  @RequirePermissions(PermissionCode.DELIVERY_UPDATE)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: DeliveryStatus,
    @Body('courierName') courierName: string | undefined,
    @Body('courierPhone') courierPhone: string | undefined,
    @Body('trackingNumber') trackingNumber: string | undefined,
    @Body('note') note: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.deliveryService.updateStatus(id, status, { courierName, courierPhone, trackingNumber, note }, user);
  }

  @Post('zones')
  @RequirePermissions(PermissionCode.DELIVERY_UPDATE)
  createZone(@Body() body: { name: string; region?: string; district?: string; fee: number; isDefault?: boolean }) {
    return this.deliveryZonesService.create(body);
  }
}
