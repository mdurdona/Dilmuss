import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { PermissionCode } from '@prisma/client';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { OptionalJwtAuthGuard } from '../../auth/guards/optional-jwt-auth.guard';
import { PermissionsService } from '../../rbac/permissions.service';
import type { RequestUser } from '../../common/types/request-user';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  async findTree(@Query('includeInactive') includeInactive: string | undefined, @Req() req: Request) {
    // #17.2: bu route mijozlar uchun ochiq (@Public), lekin includeInactive=true faqat
    // PRODUCT_VIEW huquqiga ega xodimlar uchun ma'noli — anonim/mijoz so'rovida bu bayroq
    // e'tiborga olinmaydi (xato tashlanmaydi, shunchaki arxivlangan kategoriyalar oshkor bo'lmaydi).
    const user = req.user as RequestUser | null;
    const canSeeInactive =
      includeInactive === 'true' &&
      !!user &&
      (await this.permissionsService.hasPermission(user.id, PermissionCode.PRODUCT_VIEW));
    return this.categoriesService.findTree(canSeeInactive);
  }

  @Public()
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  @Post()
  @RequirePermissions(PermissionCode.PRODUCT_CREATE)
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.PRODUCT_UPDATE)
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }
}
