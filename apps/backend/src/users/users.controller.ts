import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AuditAction, PermissionCode, UserStatus } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user';
import { AuditService } from '../audit/audit.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.usersService.findOne(user.id);
  }

  @Patch('me')
  updateMe(@Body() dto: Pick<UpdateUserDto, 'fullName' | 'email'>, @CurrentUser() user: RequestUser) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get('admins')
  @RequirePermissions(PermissionCode.ADMIN_VIEW)
  findAdmins() {
    return this.usersService.findAdmins();
  }

  @Get('customers')
  @RequirePermissions(PermissionCode.CUSTOMER_VIEW)
  findCustomers(@Query('search') search?: string) {
    return this.usersService.findCustomers(search);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.ADMIN_VIEW)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post('admins')
  @RequirePermissions(PermissionCode.ADMIN_CREATE)
  async createAdmin(@Body() dto: CreateAdminDto, @CurrentUser() user: RequestUser) {
    const admin = await this.usersService.createAdmin(dto);
    await this.auditService.record({
      userId: user.id,
      action: AuditAction.CREATE,
      entity: 'User',
      entityId: admin.id,
      newValue: { fullName: admin.fullName, phone: admin.phone, role: admin.role },
    });
    return admin;
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.ADMIN_UPDATE)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions(PermissionCode.ADMIN_UPDATE)
  async setStatus(@Param('id') id: string, @Body('status') status: UserStatus, @CurrentUser() user: RequestUser) {
    const result = await this.usersService.setStatus(id, status);
    await this.auditService.record({
      userId: user.id,
      action: AuditAction.STATUS_CHANGE,
      entity: 'User',
      entityId: id,
      newValue: { status },
    });
    return result;
  }
}
