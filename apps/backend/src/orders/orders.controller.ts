import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { OrderStatus, PaymentStatus, PermissionCode } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

const GUEST_COOKIE = 'dilmuss_guest_token';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post('checkout')
  checkout(@Body() dto: CheckoutDto, @Req() req: Request) {
    const user = req.user as RequestUser | null;
    const guestToken = req.cookies?.[GUEST_COOKIE] ?? null;
    return this.ordersService.checkout(user?.id ?? null, guestToken, dto);
  }

  @Public()
  @Get('track')
  track(@Query('orderNumber') orderNumber: string, @Query('phone') phone: string) {
    return this.ordersService.findByTracking(orderNumber, phone);
  }

  @Get('mine')
  listMine(@CurrentUser() user: RequestUser) {
    return this.ordersService.listForUser(user.id);
  }

  @Get('admin')
  @RequirePermissions(PermissionCode.ORDER_VIEW)
  listAdmin(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: OrderStatus,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
  ) {
    return this.ordersService.listForAdmin(user, { status, paymentStatus });
  }

  @Get('admin/:id')
  @RequirePermissions(PermissionCode.ORDER_VIEW)
  async findOneAdmin(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    await this.ordersService.assertBranchAccessForAdmin(id, user);
    return this.ordersService.findOne(id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    await this.ordersService.assertOwnership(id, user);
    return this.ordersService.findOne(id);
  }

  @Post(':id/cancel')
  async cancelOwn(@Param('id') id: string, @Body('reason') reason: string, @CurrentUser() user: RequestUser) {
    await this.ordersService.assertOwnership(id, user);
    return this.ordersService.updateStatus(id, OrderStatus.CANCELLED, user, reason);
  }

  @Patch(':id/status')
  @RequirePermissions(PermissionCode.ORDER_UPDATE)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @Body('note') note: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ordersService.updateStatus(id, status, user, note);
  }

  @Post(':id/assign-branch')
  @RequirePermissions(PermissionCode.ORDER_UPDATE)
  assignBranch(@Param('id') id: string, @Body('branchId') branchId: string, @CurrentUser() user: RequestUser) {
    return this.ordersService.assignBranch(id, branchId, user);
  }
}
