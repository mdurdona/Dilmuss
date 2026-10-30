import { Controller, Get, Query } from '@nestjs/common';
import { NotificationStatus, NotificationType, PermissionCode } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermissions(PermissionCode.ADMIN_VIEW)
  list(@Query('status') status?: NotificationStatus, @Query('type') type?: NotificationType) {
    return this.notificationsService.list({ status, type });
  }
}
