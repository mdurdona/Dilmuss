import { ForbiddenException } from '@nestjs/common';
import { BranchScope } from '@prisma/client';
import { TestContext } from '../test/db-fixtures';
import { AuditService } from '../audit/audit.service';
import { BranchAccessService } from './branch-access.service';
import { BranchesService } from './branches.service';
import { BranchesController } from './branches.controller';
import { PermissionsService } from '../rbac/permissions.service';

describe('BranchesController.assignUser — security fix #11: branch access permissiondan alohida', () => {
  const ctx = new TestContext();
  const branchesService = new BranchesService(ctx.prisma);
  const auditService = new AuditService(ctx.prisma);
  const branchAccessService = new BranchAccessService(ctx.prisma);
  const permissionsService = new PermissionsService(ctx.prisma);
  const controller = new BranchesController(branchesService, auditService, branchAccessService, permissionsService);

  afterAll(async () => {
    await ctx.cleanup();
  });

  it("OWN_BRANCH admin ruxsati yo'q filialga boshqa adminni biriktira olmaydi", async () => {
    const ownBranch = await ctx.makeBranch();
    const otherBranch = await ctx.makeBranch();
    const actor = await ctx.makeAdmin({ branchScope: BranchScope.OWN_BRANCH, primaryBranchId: ownBranch.id });
    const target = await ctx.makeAdmin({ branchScope: BranchScope.OWN_BRANCH, primaryBranchId: ownBranch.id });

    await expect(controller.assignUser(otherBranch.id, target.id, false, actor as any)).rejects.toThrow(
      ForbiddenException,
    );

    const rows = await ctx.prisma.userBranch.count({ where: { userId: target.id, branchId: otherBranch.id } });
    expect(rows).toBe(0);
  });

  it("o'z filialiga admin biriktirish ishlayveradi", async () => {
    const ownBranch = await ctx.makeBranch();
    const actor = await ctx.makeAdmin({ branchScope: BranchScope.OWN_BRANCH, primaryBranchId: ownBranch.id });
    const target = await ctx.makeAdmin({ branchScope: BranchScope.OWN_BRANCH }); // hali hech qanday filialga biriktirilmagan

    await controller.assignUser(ownBranch.id, target.id, false, actor as any);

    const rows = await ctx.prisma.userBranch.count({ where: { userId: target.id, branchId: ownBranch.id } });
    expect(rows).toBe(1);
  });
});

describe('BranchesController.findAll — security fix #17.2: includeInactive faqat ruxsatlilar uchun', () => {
  const ctx = new TestContext();
  const branchesService = new BranchesService(ctx.prisma);
  const auditService = new AuditService(ctx.prisma);
  const branchAccessService = new BranchAccessService(ctx.prisma);
  const permissionsService = new PermissionsService(ctx.prisma);
  const controller = new BranchesController(branchesService, auditService, branchAccessService, permissionsService);

  afterAll(async () => {
    await ctx.cleanup();
  });

  async function makeInactiveBranch() {
    const branch = await ctx.makeBranch();
    await ctx.prisma.branch.update({ where: { id: branch.id }, data: { isActive: false } });
    return branch;
  }

  it("anonim so'rov includeInactive=true bilan ham nofaol filialni ko'rmaydi", async () => {
    const inactive = await makeInactiveBranch();

    const result = await controller.findAll('true', { user: null } as any);

    expect(result.some((b) => b.id === inactive.id)).toBe(false);
  });

  it("BRANCH_VIEW huquqi yo'q CUSTOMER ham ko'ra olmaydi", async () => {
    const inactive = await makeInactiveBranch();
    const customer = await ctx.makeCustomer();

    const result = await controller.findAll('true', { user: customer } as any);

    expect(result.some((b) => b.id === inactive.id)).toBe(false);
  });

  it("BRANCH_VIEW huquqiga ega ADMIN nofaol filialni ko'radi", async () => {
    const inactive = await makeInactiveBranch();
    const admin = await ctx.makeAdmin({ branchScope: BranchScope.OWN_BRANCH });
    const permission = await ctx.prisma.permission.findFirstOrThrow({ where: { code: 'BRANCH_VIEW' as any } });
    await ctx.prisma.userPermissionOverride.create({
      data: { userId: admin.id, permissionId: permission.id, effect: 'GRANT' as any },
    });

    const result = await controller.findAll('true', { user: admin } as any);

    expect(result.some((b) => b.id === inactive.id)).toBe(true);
  });
});
