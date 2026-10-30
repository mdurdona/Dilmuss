import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { PermissionCode } from '@prisma/client';
import { PermissionsService } from './permissions.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user';
import { SetOverrideDto } from './dto/set-override.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';

@Controller('permissions')
export class PermissionsController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequirePermissions(PermissionCode.PERMISSION_VIEW)
  list() {
    return this.permissionsService.listAllPermissions();
  }

  @Get('me')
  async myEffectivePermissions(@CurrentUser() user: RequestUser) {
    const set = await this.permissionsService.getEffectivePermissions(user.id);
    return { permissions: Array.from(set) };
  }

  @Get('overrides/:userId')
  @RequirePermissions(PermissionCode.PERMISSION_VIEW)
  getUserOverrides(@Param('userId') userId: string) {
    return this.permissionsService.getUserOverrides(userId);
  }

  @Post('overrides')
  @RequirePermissions(PermissionCode.PERMISSION_UPDATE)
  async setOverride(@Body() dto: SetOverrideDto, @CurrentUser() user: RequestUser) {
    const result = await this.permissionsService.setOverride(dto.userId, dto.permissionCode, dto.effect, user.id);
    await this.auditService.record({
      userId: user.id,
      action: AuditAction.PERMISSION_CHANGED,
      entity: 'User',
      entityId: dto.userId,
      newValue: { permissionCode: dto.permissionCode, effect: dto.effect },
    });
    return result;
  }

  @Delete('overrides/:userId/:permissionCode')
  @RequirePermissions(PermissionCode.PERMISSION_UPDATE)
  async removeOverride(
    @Param('userId') userId: string,
    @Param('permissionCode') permissionCode: PermissionCode,
    @CurrentUser() user: RequestUser,
  ) {
    await this.permissionsService.removeOverride(userId, permissionCode);
    await this.auditService.record({
      userId: user.id,
      action: AuditAction.PERMISSION_CHANGED,
      entity: 'User',
      entityId: userId,
      newValue: { permissionCode, effect: 'CLEARED' },
    });
    return { success: true };
  }
}
