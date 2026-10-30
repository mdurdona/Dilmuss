import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { PermissionCode } from '@prisma/client';
import { SettingsService } from './settings.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermissions(PermissionCode.SYSTEM_SETTINGS_VIEW)
  list() {
    return this.settingsService.list();
  }

  @Put(':key')
  @RequirePermissions(PermissionCode.SYSTEM_SETTINGS_UPDATE)
  set(@Param('key') key: string, @Body('value') value: unknown, @CurrentUser() user: RequestUser) {
    return this.settingsService.set(key, value as never, user.id);
  }
}
