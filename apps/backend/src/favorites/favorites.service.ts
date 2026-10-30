import { Injectable } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { applyDiscount } from '../common/utils/pricing';
import { formatProductCode } from '../common/utils/format';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId, product: { status: ProductStatus.ACTIVE } },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            images: { where: { isMain: true }, take: 1 },
            variants: { where: { isActive: true }, select: { color: true, colorHex: true, size: true } },
          },
        },
      },
    });

    return favorites.map(({ product }) => {
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
    });
  }

  async listIds(userId: string): Promise<string[]> {
    const favorites = await this.prisma.favorite.findMany({ where: { userId }, select: { productId: true } });
    return favorites.map((f) => f.productId);
  }

  async add(userId: string, productId: string) {
    await this.prisma.favorite.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
    return { success: true };
  }

  async remove(userId: string, productId: string) {
    await this.prisma.favorite.deleteMany({ where: { userId, productId } });
    return { success: true };
  }
}
