import { Controller, Get, Query } from '@nestjs/common';
import { PermissionCode } from '@prisma/client';
import { AuditService } from './audit.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions(PermissionCode.AUDIT_LOG_VIEW)
  list(
    @Query('entity') entity?: string,
    @Query('userId') userId?: string,
    @Query('branchId') branchId?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.auditService.findMany({
      entity,
      userId,
      branchId,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }
}
