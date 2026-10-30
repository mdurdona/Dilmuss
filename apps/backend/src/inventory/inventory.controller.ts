import { Body, Controller, ForbiddenException, Get, Param, Post } from '@nestjs/common';
import { AuditAction, PermissionCode } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { BranchAccessService } from '../branches/branch-access.service';

@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  /** INVENTORY_VIEW/UPDATE ruxsati "shu turdagi amalni bajarish mumkinmi" degani, filialga kira olishni alohida tekshiradi. */
  private async assertBranchAccess(user: RequestUser, branchId: string) {
    const allowed = await this.branchAccessService.assertBranchAccess(user, branchId);
    if (!allowed) throw new ForbiddenException('Bu filialga ruxsatingiz yo\'q');
  }

  @Get('branch/:branchId')
  @RequirePermissions(PermissionCode.INVENTORY_VIEW)
  async listByBranch(@Param('branchId') branchId: string, @CurrentUser() user: RequestUser) {
    await this.assertBranchAccess(user, branchId);
    return this.inventoryService.listByBranch(branchId);
  }

  @Get('variant/:variantId')
  @RequirePermissions(PermissionCode.INVENTORY_VIEW)
  async listByVariant(@Param('variantId') variantId: string, @CurrentUser() user: RequestUser) {
    const rows = await this.inventoryService.listByVariant(variantId);
    const accessible = await this.branchAccessService.getAccessibleBranchIds(user);
    if (accessible === 'ALL') return rows;
    return rows.filter((row) => accessible.includes(row.branchId));
  }

  @Get('branch/:branchId/low-stock')
  @RequirePermissions(PermissionCode.INVENTORY_VIEW)
  async lowStock(@Param('branchId') branchId: string, @CurrentUser() user: RequestUser) {
    await this.assertBranchAccess(user, branchId);
    const rows = await this.prisma.branchInventory.findMany({
      where: { branchId },
      include: { variant: { include: { product: true } } },
    });
    return rows.filter((row) => row.onHand - row.reserved <= row.lowStockThreshold);
  }

  @Post('adjust')
  @RequirePermissions(PermissionCode.INVENTORY_UPDATE)
  async adjust(@Body() dto: AdjustStockDto, @CurrentUser() user: RequestUser) {
    await this.assertBranchAccess(user, dto.branchId);
    const result = await this.inventoryService.adjustOnHand({ ...dto, userId: user.id });
    await this.auditService.record({
      userId: user.id,
      action: AuditAction.UPDATE,
      entity: 'BranchInventory',
      entityId: `${dto.branchId}:${dto.variantId}`,
      newValue: dto,
      branchId: dto.branchId,
    });
    return result;
  }
}
