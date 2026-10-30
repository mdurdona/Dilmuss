import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { applyDiscount, resolveVariantPrice } from '../../common/utils/pricing';
import { formatProductCode } from '../../common/utils/format';

const MAX_PRODUCT_CODE = 9999;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryProductsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const searchIds = query.search ? await this.fuzzySearchProductIds(query.search) : null;

    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.ACTIVE,
      categories: query.categorySlug ? { some: { slug: query.categorySlug } } : undefined,
      basePrice:
        query.minPrice != null || query.maxPrice != null
          ? { gte: query.minPrice, lte: query.maxPrice }
          : undefined,
      id: searchIds ? { in: searchIds } : undefined,
      seasons: query.season ? { has: query.season } : undefined,
      AND: [
        ...(query.sizes?.length ? [{ variants: { some: { size: { in: query.sizes } } } }] : []),
        ...(query.colors?.length ? [{ variants: { some: { color: { in: query.colors } } } }] : []),
        ...(query.sale === '1' ? [this.activeDiscountFilter()] : []),
      ],
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sort === 'price_asc'
        ? { basePrice: 'asc' }
        : query.sort === 'price_desc'
          ? { basePrice: 'desc' }
          : { createdAt: 'desc' };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          images: { where: { isMain: true }, take: 1 },
          variants: { where: { isActive: true }, select: { color: true, colorHex: true, size: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: items.map((product) => this.toListItem(product)),
      total,
      page,
      pageSize,
    };
  }

  /** Katalog filtri uchun — faol mahsulotlardagi barcha noyob ranglar ro'yxati. */
  async listColors() {
    const variants = await this.prisma.productVariant.findMany({
      where: { isActive: true, product: { status: ProductStatus.ACTIVE } },
      select: { color: true, colorHex: true },
      distinct: ['color'],
      orderBy: { color: 'asc' },
    });
    return variants;
  }

  /**
   * pg_trgm orqali xato-tolerant qidiruv (bir-ikki harf yetishmasa/xato bo'lsa ham topadi),
   * shuningdek artikul (productCode, mijozga "Kod: 0009" sifatida ko'rsatiladi) bo'yicha ham qidiradi.
   */
  private async fuzzySearchProductIds(search: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Product"
      WHERE name ILIKE ${'%' + search + '%'}
         OR similarity(name, ${search}) > 0.2
         OR LPAD("productCode"::text, 4, '0') ILIKE ${'%' + search + '%'}
      ORDER BY similarity(name, ${search}) DESC
    `;
    return rows.map((r) => r.id);
  }

  /** TZ 5.3 — chegirma product yoki uning istalgan variantida amal qilayotgan bo'lsa "sale" hisoblanadi. */
  private activeDiscountFilter(now: Date = new Date()): Prisma.ProductWhereInput {
    const activeDiscount = {
      discountType: { not: null },
      discountValue: { not: null },
      AND: [
        { OR: [{ discountStartsAt: null }, { discountStartsAt: { lte: now } }] },
        { OR: [{ discountEndsAt: null }, { discountEndsAt: { gte: now } }] },
      ],
    };
    return {
      OR: [activeDiscount, { variants: { some: { isActive: true, ...activeDiscount } } }],
    };
  }

  private toListItem(product: Prisma.ProductGetPayload<{
    include: {
      images: true;
      variants: { select: { color: true; colorHex: true; size: true } };
    };
  }>) {
    const colors = Array.from(new Map(product.variants.map((v) => [v.color, v.colorHex])).entries()).map(
      ([color, colorHex]) => ({ color, colorHex }),
    );
    const sizes = Array.from(new Set(product.variants.map((v) => v.size)));

    return {
      id: product.id,
      productCode: formatProductCode(product.productCode),
      name: product.name,
      basePrice: product.basePrice,
      discountedPrice: applyDiscount(product.basePrice, product),
      mainImageUrl: product.images[0]?.url ?? null,
      colors,
      sizes,
    };
  }

  /** Admin uchun: status (ACTIVE/ARCHIVED) filtersiz, barcha mahsulotlar ro'yxati. */
  async listAdmin(params: { search?: string; page?: number; pageSize?: number }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const where: Prisma.ProductWhereInput = {
      name: params.search ? { contains: params.search, mode: 'insensitive' } : undefined,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { images: { where: { isMain: true }, take: 1 }, categories: true },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: items.map((p) => ({
        id: p.id,
        productCode: formatProductCode(p.productCode),
        name: p.name,
        basePrice: p.basePrice,
        status: p.status,
        mainImageUrl: p.images[0]?.url ?? null,
        categories: p.categories.map((c) => c.name),
      })),
      total,
      page,
      pageSize,
    };
  }

  /** Admin uchun: internal id bo'yicha, status'dan qat'iy nazar (edit form uchun). */
  async findByIdAdmin(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        categories: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
      },
    });
    if (!product) throw new NotFoundException('Mahsulot topilmadi');
    return { ...product, productCode: formatProductCode(product.productCode) };
  }

  async findByCode(productCode: number) {
    const product = await this.prisma.product.findUnique({
      where: { productCode },
      include: {
        categories: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { where: { isActive: true } },
        relatedProducts: {
          where: { status: ProductStatus.ACTIVE },
          include: { images: { where: { isMain: true }, take: 1 } },
        },
      },
    });
    if (!product || product.status !== ProductStatus.ACTIVE) throw new NotFoundException('Mahsulot topilmadi');

    return {
      ...product,
      productCode: formatProductCode(product.productCode),
      discountedPrice: applyDiscount(product.basePrice, product),
      variants: product.variants.map((variant) => {
        const price = resolveVariantPrice(product, variant);
        return {
          ...variant,
          price,
          effectivePrice: applyDiscount(price, variant),
        };
      }),
      relatedProducts: product.relatedProducts.map((related) => ({
        id: related.id,
        productCode: formatProductCode(related.productCode),
        name: related.name,
        basePrice: related.basePrice,
        discountedPrice: applyDiscount(related.basePrice, related),
        mainImageUrl: related.images[0]?.url ?? null,
      })),
    };
  }

  async create(dto: CreateProductDto) {
    const count = await this.prisma.product.count();
    if (count >= MAX_PRODUCT_CODE) {
      throw new Error('Mahsulot kodlari chegarasiga (9999) yetildi');
    }

    return this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        basePrice: dto.basePrice,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        discountStartsAt: dto.discountStartsAt ? new Date(dto.discountStartsAt) : undefined,
        discountEndsAt: dto.discountEndsAt ? new Date(dto.discountEndsAt) : undefined,
        videoUrl: dto.videoUrl,
        fit: dto.fit,
        seasons: dto.seasons ?? [],
        careInstructions: dto.careInstructions,
        modelInfo: dto.modelInfo,
        deliveryInfo: dto.deliveryInfo,
        returnPolicy: dto.returnPolicy,
        categories: { connect: dto.categoryIds.map((id) => ({ id })) },
        variants: {
          create: dto.variants.map((variant) => ({
            sku: variant.sku,
            color: variant.color,
            colorHex: variant.colorHex,
            size: variant.size,
            price: variant.price,
            discountType: variant.discountType,
            discountValue: variant.discountValue,
            discountStartsAt: variant.discountStartsAt ? new Date(variant.discountStartsAt) : undefined,
            discountEndsAt: variant.discountEndsAt ? new Date(variant.discountEndsAt) : undefined,
          })),
        },
      },
      include: { variants: true },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const { categoryIds, discountStartsAt, discountEndsAt, ...rest } = dto;
    return this.prisma.product.update({
      where: { id },
      data: {
        ...rest,
        discountStartsAt: discountStartsAt ? new Date(discountStartsAt) : undefined,
        discountEndsAt: discountEndsAt ? new Date(discountEndsAt) : undefined,
        categories: categoryIds ? { set: categoryIds.map((catId) => ({ id: catId })) } : undefined,
      },
    });
  }

  /** TZ 6.1 — hard delete yo'q, faqat ARCHIVED holatiga o'tkaziladi. */
  archive(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.ARCHIVED, archivedAt: new Date() },
    });
  }

  /** TZ'dan tashqari qo'shildi — arxivlangan mahsulotni qayta ACTIVE qilish. */
  activate(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.ACTIVE, archivedAt: null },
    });
  }

  addImages(
    productId: string,
    images: { url: string; storageKey: string; color?: string; altText?: string; isMain?: boolean }[],
  ) {
    return this.prisma.$transaction(
      images.map((image, index) =>
        this.prisma.productImage.create({
          data: { productId, sortOrder: index, ...image },
        }),
      ),
    );
  }

  addVariants(productId: string, variants: Omit<Prisma.ProductVariantCreateManyInput, 'productId'>[]) {
    return this.prisma.productVariant.createMany({
      data: variants.map((variant) => ({ ...variant, productId })),
    });
  }

  /** Rasm buyurtma/savat tarixiga bog'lanmagan — hard delete xavfsiz. */
  removeImage(imageId: string) {
    return this.prisma.productImage.delete({ where: { id: imageId } });
  }

  /** Variant savat/buyurtma/ombor tarixiga bog'langan — hard delete yo'q, faqat isActive orqali. */
  async updateVariant(variantId: string, dto: UpdateVariantDto) {
    try {
      return await this.prisma.productVariant.update({
        where: { id: variantId },
        data: {
          sku: dto.sku,
          color: dto.color,
          colorHex: dto.colorHex,
          size: dto.size,
          price: dto.price,
          isActive: dto.isActive,
          discountType: dto.discountType,
          discountValue: dto.discountValue,
          discountStartsAt: dto.discountStartsAt ? new Date(dto.discountStartsAt) : undefined,
          discountEndsAt: dto.discountEndsAt ? new Date(dto.discountEndsAt) : undefined,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Bunday SKU yoki rang+o\'lcham birikmasi allaqachon mavjud');
      }
      throw error;
    }
  }
}
