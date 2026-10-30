import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.branch.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
    });
  }

  findByIds(ids: string[]) {
    return this.prisma.branch.findMany({
      where: { id: { in: ids } },
      orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException('Filial topilmadi');
    return branch;
  }

  /** TZ 4.7 — mainMarker orqali bitta Main Branch invarianti: eski main'ni tozalab, yangisini belgilaymiz. */
  async create(dto: CreateBranchDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.isMain) {
        await tx.branch.updateMany({ where: { mainMarker: true }, data: { isMain: false, mainMarker: null } });
      }
      return tx.branch.create({
        data: {
          name: dto.name,
          code: dto.code,
          region: dto.region,
          city: dto.city,
          address: dto.address,
          phone: dto.phone,
          isMain: dto.isMain ?? false,
          mainMarker: dto.isMain ? true : null,
        },
      });
    });
  }

  async update(id: string, dto: UpdateBranchDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.isMain) {
        await tx.branch.updateMany({
          where: { mainMarker: true, id: { not: id } },
          data: { isMain: false, mainMarker: null },
        });
      }
      return tx.branch.update({
        where: { id },
        data: {
          ...dto,
          mainMarker: dto.isMain === undefined ? undefined : dto.isMain ? true : null,
        },
      });
    });
  }

  async assignUser(branchId: string, userId: string, isPrimary = false) {
    await this.findOne(branchId);
    return this.prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.userBranch.updateMany({ where: { userId }, data: { isPrimary: false } });
      }
      return tx.userBranch.upsert({
        where: { userId_branchId: { userId, branchId } },
        create: { userId, branchId, isPrimary },
        update: { isPrimary },
      });
    });
  }

  unassignUser(branchId: string, userId: string) {
    return this.prisma.userBranch.delete({ where: { userId_branchId: { userId, branchId } } });
  }

  listUserBranches(userId: string) {
    return this.prisma.userBranch.findMany({ where: { userId }, include: { branch: true } });
  }
}
