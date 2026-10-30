import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Category } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

type CategoryNode = Category & { children: CategoryNode[] };

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** 2 darajali daraxt: top-level kategoriyalar + har biri uchun children. */
  async findTree(includeInactive = false): Promise<CategoryNode[]> {
    const categories = await this.prisma.category.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    const byParent = new Map<string | null, Category[]>();
    for (const category of categories) {
      const key = category.parentId;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(category);
    }
    const attachChildren = (parentId: string | null): CategoryNode[] =>
      (byParent.get(parentId) ?? []).map((category) => ({
        ...category,
        children: attachChildren(category.id),
      }));
    return attachChildren(null);
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({ where: { slug } });
    if (!category) throw new NotFoundException('Kategoriya topilmadi');
    return category;
  }

  async create(dto: CreateCategoryDto) {
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Ota kategoriya topilmadi');
      // TZ — faqat 2 darajali nested kategoriya ruxsat etilgan
      if (parent.parentId) throw new BadRequestException('Kategoriya chuqurligi 2 darajadan oshmasligi kerak');
    }
    return this.prisma.category.create({ data: dto });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Ota kategoriya topilmadi');
      if (parent.parentId) throw new BadRequestException('Kategoriya chuqurligi 2 darajadan oshmasligi kerak');
    }
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  setActive(id: string, isActive: boolean) {
    return this.prisma.category.update({ where: { id }, data: { isActive } });
  }
}
