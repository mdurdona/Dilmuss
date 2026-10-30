import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { PermissionCode, AuditAction } from '@prisma/client';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user';
import { AuditService } from '../audit/audit.service';
import { BranchAccessService } from './branch-access.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { PermissionsService } from '../rbac/permissions.service';

@Controller('branches')
export class BranchesController {
  constructor(
    private readonly branchesService: BranchesService,
    private readonly auditService: AuditService,
    private readonly branchAccessService: BranchAccessService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  async findAll(@Query('includeInactive') includeInactive: string | undefined, @Req() req: Request) {
    // #17.2: mijozlar uchun ochiq, lekin includeInactive=true faqat BRANCH_VIEW huquqiga ega
    // xodimlar uchun ishlaydi — anonim/mijoz so'rovida jim ravishda e'tiborga olinmaydi.
    const user = req.user as RequestUser | null;
    const canSeeInactive =
      includeInactive === 'true' &&
      !!user &&
      (await this.permissionsService.hasPermission(user.id, PermissionCode.BRANCH_VIEW));
    return this.branchesService.findAll(canSeeInactive);
  }

  @Get('mine')
  async findMine(@CurrentUser() user: RequestUser) {
    const accessible = await this.branchAccessService.getAccessibleBranchIds(user);
    if (accessible === 'ALL') return this.branchesService.findAll(true);
    if (accessible.length === 0) return [];
    return this.branchesService.findByIds(accessible);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }

  @Post()
  @RequirePermissions(PermissionCode.BRANCH_CREATE)
  async create(@Body() dto: CreateBranchDto, @CurrentUser() user: RequestUser) {
    const branch = await this.branchesService.create(dto);
    await this.auditService.record({
      userId: user.id,
      action: AuditAction.CREATE,
      entity: 'Branch',
      entityId: branch.id,
      newValue: dto,
    });
    return branch;
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.BRANCH_UPDATE)
  async update(@Param('id') id: string, @Body() dto: UpdateBranchDto, @CurrentUser() user: RequestUser) {
    const before = await this.branchesService.findOne(id);
    const branch = await this.branchesService.update(id, dto);
    await this.auditService.record({
      userId: user.id,
      action: AuditAction.UPDATE,
      entity: 'Branch',
      entityId: id,
      oldValue: before,
      newValue: dto,
    });
    return branch;
  }

  @Post(':id/users/:userId')
  @RequirePermissions(PermissionCode.ADMIN_UPDATE)
  async assignUser(
    @Param('id') branchId: string,
    @Param('userId') userId: string,
    @Body('isPrimary') isPrimary: boolean | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    // #11 audit: ADMIN_UPDATE o'zi "admin biriktirishga ruxsat bor" degani, lekin QAYSI filialga
    // biriktirish mumkinligini alohida tekshiramiz — aks holda branch-scoped admin (agar unga
    // qandaydir sabab bilan ADMIN_UPDATE berilgan bo'lsa) o'ziga yoki boshqa adminga ruxsati
    // yo'q filialga kirish huquqini berib qo'yishi (imtiyoz oshirish) mumkin edi.
    const hasBranchAccess = await this.branchAccessService.assertBranchAccess(user, branchId);
    if (!hasBranchAccess) throw new ForbiddenException("Bu filialga ruxsatingiz yo'q");
    return this.branchesService.assignUser(branchId, userId, isPrimary);
  }
}
