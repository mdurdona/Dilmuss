import { randomUUID } from 'crypto';
import { TestContext } from '../../test/db-fixtures';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { PermissionsService } from '../../rbac/permissions.service';

describe('CategoriesController.findTree — security fix #17.2: includeInactive faqat ruxsatlilar uchun', () => {
  const ctx = new TestContext();
  const categoriesService = new CategoriesService(ctx.prisma);
  const permissionsService = new PermissionsService(ctx.prisma);
  const controller = new CategoriesController(categoriesService, permissionsService);

  const categoryIds: string[] = [];
  async function makeInactiveCategory() {
    const category = await ctx.prisma.category.create({
      data: { name: 'Arxivlangan', slug: `test-inactive-${randomUUID()}`, isActive: false },
    });
    categoryIds.push(category.id);
    return category;
  }

  afterAll(async () => {
    await ctx.prisma.category.deleteMany({ where: { id: { in: categoryIds } } });
    await ctx.cleanup();
  });

  it("anonim (tokensiz) so'rov includeInactive=true bo'lsa ham arxivlangan kategoriyani ko'rmaydi", async () => {
    const inactive = await makeInactiveCategory();

    const result = await controller.findTree('true', { user: null } as any);

    expect(result.some((c) => c.id === inactive.id)).toBe(false);
  });

  it("PRODUCT_VIEW huquqi yo'q autentifikatsiyalangan foydalanuvchi (masalan CUSTOMER) ham ko'ra olmaydi", async () => {
    const inactive = await makeInactiveCategory();
    const customer = await ctx.makeCustomer();

    const result = await controller.findTree('true', { user: customer } as any);

    expect(result.some((c) => c.id === inactive.id)).toBe(false);
  });

  it("PRODUCT_VIEW huquqiga ega ADMIN includeInactive=true bilan arxivlangan kategoriyani ko'radi", async () => {
    const inactive = await makeInactiveCategory();
    const admin = await ctx.makeAdmin({ branchScope: 'OWN_BRANCH' as any });
    const permission = await ctx.prisma.permission.findFirstOrThrow({ where: { code: 'PRODUCT_VIEW' as any } });
    await ctx.prisma.userPermissionOverride.create({
      data: { userId: admin.id, permissionId: permission.id, effect: 'GRANT' as any },
    });

    const result = await controller.findTree('true', { user: admin } as any);

    expect(result.some((c) => c.id === inactive.id)).toBe(true);
  });

  it("includeInactive so'ralmasa (default), faol foydalanuvchi bo'lsa ham arxivlangan ko'rinmaydi", async () => {
    const inactive = await makeInactiveCategory();
    const admin = await ctx.makeAdmin({ branchScope: 'OWN_BRANCH' as any });

    const result = await controller.findTree(undefined, { user: admin } as any);

    expect(result.some((c) => c.id === inactive.id)).toBe(false);
  });
});
