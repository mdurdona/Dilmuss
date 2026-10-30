import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { AuditAction, PermissionCode } from '@prisma/client';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { VariantInputDto } from './dto/variant-input.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { AuditService } from '../../audit/audit.service';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly auditService: AuditService,
  ) {}

  @Public()
  @Get()
  list(@Query() query: QueryProductsDto) {
    return this.productsService.list(query);
  }

  @Public()
  @Get('colors')
  listColors() {
    return this.productsService.listColors();
  }

  @Get('admin/all')
  @RequirePermissions(PermissionCode.PRODUCT_VIEW)
  listAdmin(@Query('search') search?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.productsService.listAdmin({
      search,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('admin/:id')
  @RequirePermissions(PermissionCode.PRODUCT_VIEW)
  findByIdAdmin(@Param('id') id: string) {
    return this.productsService.findByIdAdmin(id);
  }

  @Public()
  @Get(':code')
  findByCode(@Param('code', ParseIntPipe) code: number) {
    return this.productsService.findByCode(code);
  }

  @Post()
  @RequirePermissions(PermissionCode.PRODUCT_CREATE)
  async create(@Body() dto: CreateProductDto, @CurrentUser() user: RequestUser) {
    const product = await this.productsService.create(dto);
    await this.auditService.record({
      userId: user.id,
      action: AuditAction.CREATE,
      entity: 'Product',
      entityId: product.id,
      newValue: { name: product.name, basePrice: product.basePrice },
    });
    return product;
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.PRODUCT_UPDATE)
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto, @CurrentUser() user: RequestUser) {
    const product = await this.productsService.update(id, dto);
    await this.auditService.record({
      userId: user.id,
      action: AuditAction.UPDATE,
      entity: 'Product',
      entityId: id,
      newValue: dto,
    });
    return product;
  }

  @Post(':id/archive')
  @RequirePermissions(PermissionCode.PRODUCT_DELETE)
  async archive(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    const product = await this.productsService.archive(id);
    await this.auditService.record({
      userId: user.id,
      action: AuditAction.ARCHIVE,
      entity: 'Product',
      entityId: id,
    });
    return product;
  }

  @Post(':id/activate')
  @RequirePermissions(PermissionCode.PRODUCT_UPDATE)
  async activate(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    const product = await this.productsService.activate(id);
    await this.auditService.record({
      userId: user.id,
      action: AuditAction.UPDATE,
      entity: 'Product',
      entityId: id,
      newValue: { status: 'ACTIVE' },
    });
    return product;
  }

  @Post(':id/images')
  @RequirePermissions(PermissionCode.PRODUCT_UPDATE)
  addImages(
    @Param('id') id: string,
    @Body('images') images: { url: string; storageKey: string; color?: string; altText?: string; isMain?: boolean }[],
  ) {
    return this.productsService.addImages(id, images);
  }

  @Delete(':id/images/:imageId')
  @RequirePermissions(PermissionCode.PRODUCT_UPDATE)
  removeImage(@Param('imageId') imageId: string) {
    return this.productsService.removeImage(imageId);
  }

  @Post(':id/variants')
  @RequirePermissions(PermissionCode.PRODUCT_UPDATE)
  addVariants(@Param('id') id: string, @Body() dto: VariantInputDto[]) {
    return this.productsService.addVariants(
      id,
      dto.map((v) => ({
        sku: v.sku,
        color: v.color,
        colorHex: v.colorHex,
        size: v.size,
        price: v.price,
        discountType: v.discountType,
        discountValue: v.discountValue,
      })),
    );
  }

  @Patch(':id/variants/:variantId')
  @RequirePermissions(PermissionCode.PRODUCT_UPDATE)
  updateVariant(@Param('variantId') variantId: string, @Body() dto: UpdateVariantDto) {
    return this.productsService.updateVariant(variantId, dto);
  }
}
