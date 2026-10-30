import { Injectable } from '@nestjs/common';
import { BranchScope, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../common/types/request-user';

export type AccessibleBranches = 'ALL' | string[];

/** TZ 4.3 — admin qaysi filial(lar)ga kira olishini branchScope + UserBranch orqali aniqlaydi. */
@Injectable()
export class BranchAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getAccessibleBranchIds(user: RequestUser): Promise<AccessibleBranches> {
    if (user.role === UserRole.SUPERADMIN) return 'ALL';
    if (user.role === UserRole.CUSTOMER) return [];

    const dbUser = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { branchScope: true },
    });

    if (dbUser.branchScope === BranchScope.ALL_BRANCHES) return 'ALL';

    const userBranches = await this.prisma.userBranch.findMany({
      where: { userId: user.id },
      orderBy: { isPrimary: 'desc' },
    });

    if (dbUser.branchScope === BranchScope.OWN_BRANCH) {
      const primary = userBranches[0];
      return primary ? [primary.branchId] : [];
    }

    // SELECTED_BRANCHES
    return userBranches.map((ub) => ub.branchId);
  }

  async assertBranchAccess(user: RequestUser, branchId: string): Promise<boolean> {
    const accessible = await this.getAccessibleBranchIds(user);
    return accessible === 'ALL' || accessible.includes(branchId);
  }
}
