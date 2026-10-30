import { PrismaClient, UserRole, UserStatus, PermissionCode, BranchScope, DiscountType, ProductStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ADMIN_PERMISSIONS: PermissionCode[] = [
  PermissionCode.PRODUCT_VIEW,
  PermissionCode.PRODUCT_CREATE,
  PermissionCode.PRODUCT_UPDATE,
  PermissionCode.PRODUCT_DELETE,
  PermissionCode.ORDER_VIEW,
  PermissionCode.ORDER_UPDATE,
  PermissionCode.ORDER_CANCEL,
  PermissionCode.ORDER_REFUND,
  PermissionCode.CUSTOMER_VIEW,
  PermissionCode.CUSTOMER_UPDATE,
  PermissionCode.INVENTORY_VIEW,
  PermissionCode.INVENTORY_UPDATE,
  PermissionCode.PAYMENT_VIEW,
  PermissionCode.PAYMENT_VERIFY,
  PermissionCode.DELIVERY_VIEW,
  PermissionCode.DELIVERY_UPDATE,
  PermissionCode.REPORT_VIEW,
  PermissionCode.ADMIN_VIEW,
  PermissionCode.BRANCH_VIEW,
];

async function seedRolesAndPermissions() {
  for (const code of Object.values(UserRole)) {
    await prisma.role.upsert({
      where: { code },
      create: { code, name: code },
      update: {},
    });
  }

  for (const code of Object.values(PermissionCode)) {
    await prisma.permission.upsert({
      where: { code },
      create: { code, module: code.split('_')[0] },
      update: {},
    });
  }

  const superadminRole = await prisma.role.findUniqueOrThrow({ where: { code: UserRole.SUPERADMIN } });
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: UserRole.ADMIN } });
  const allPermissions = await prisma.permission.findMany();

  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superadminRole.id, permissionId: permission.id } },
      create: { roleId: superadminRole.id, permissionId: permission.id },
      update: {},
    });
  }

  const adminPermissionRows = allPermissions.filter((p) => ADMIN_PERMISSIONS.includes(p.code));
  for (const permission of adminPermissionRows) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      create: { roleId: adminRole.id, permissionId: permission.id },
      update: {},
    });
  }
}

async function seedBranch() {
  return prisma.branch.upsert({
    where: { code: 'MAIN' },
    create: {
      name: 'Bosh filial — Toshkent',
      code: 'MAIN',
      region: 'Toshkent shahri',
      city: 'Toshkent',
      address: 'Amir Temur ko\'chasi, 1',
      phone: '+998901234567',
      isMain: true,
      mainMarker: true,
    },
    update: {},
  });
}

async function seedSuperadmin() {
  const phone = process.env.SEED_SUPERADMIN_PHONE ?? '+998901112233';
  const password = process.env.SEED_SUPERADMIN_PASSWORD ?? 'SuperAdmin123!';
  const passwordHash = await bcrypt.hash(password, 10);

  // activeSuperadminMarker unique — boshqa telefonli eski SUPERADMIN bo'lsa, u nofaol qilinadi,
  // aks holda upsert unique xatosi bilan yiqiladi.
  const demoted = await prisma.user.updateMany({
    where: { activeSuperadminMarker: true, phone: { not: phone } },
    data: { activeSuperadminMarker: null, status: UserStatus.INACTIVE },
  });
  if (demoted.count > 0) {
    console.log(`Eski SUPERADMIN(lar) nofaol qilindi: ${demoted.count}`);
  }

  // Seed har safar SUPERADMIN'ni ishlaydigan holatga qaytaradi: parol, rol, status, blok.
  const superadminState = {
    passwordHash,
    role: UserRole.SUPERADMIN,
    status: UserStatus.ACTIVE,
    branchScope: BranchScope.ALL_BRANCHES,
    activeSuperadminMarker: true,
    failedLoginCount: 0,
    lockedUntil: null,
  };

  const user = await prisma.user.upsert({
    where: { phone },
    create: { fullName: 'Bosh Administrator', phone, ...superadminState },
    update: superadminState,
  });

  console.log(`SUPERADMIN: ${phone} / ${password}`);
  return user;
}

async function seedDeliveryZones() {
  await prisma.deliveryZone.upsert({
    where: { id: 'zone-tashkent' },
    create: { id: 'zone-tashkent', name: 'Toshkent shahri', region: 'Toshkent shahri', fee: 30000 },
    update: {},
  });
  await prisma.deliveryZone.upsert({
    where: { id: 'zone-samarkand' },
    create: { id: 'zone-samarkand', name: 'Samarqand shahri', region: 'Samarqand shahri', fee: 20000 },
    update: {},
  });
  await prisma.deliveryZone.upsert({
    where: { id: 'zone-default' },
    create: { id: 'zone-default', name: "Boshqa hududlar", fee: 40000, isDefault: true },
    update: {},
  });
}

async function seedSettings() {
  await prisma.systemSetting.upsert({
    where: { key: 'stock.reservation.ttlMinutes' },
    create: { key: 'stock.reservation.ttlMinutes', value: 15, description: "Checkout stock rezervi TTL (daqiqa)" },
    update: {},
  });
}

async function seedCategories() {
  const kiyimlar = await prisma.category.upsert({
    where: { slug: 'kiyimlar' },
    create: { name: 'Kiyimlar', slug: 'kiyimlar', sortOrder: 0 },
    update: {},
  });

  const children = [
    { name: "Ko'ylaklar", slug: 'koylaklar' },
    { name: 'Tunikalar', slug: 'tunikalar' },
    { name: 'Bluzkalar', slug: 'bluzkalar' },
    { name: 'Kostyumlar', slug: 'kostyumlar' },
    { name: 'Shimlar', slug: 'shimlar' },
    { name: 'Yubkalar', slug: 'yubkalar' },
    { name: 'Tashqi kiyimlar', slug: 'tashqi-kiyimlar' },
    { name: 'Jemperlar va kardiganlar', slug: 'jemperlar-kardiganlar' },
    { name: 'Abayalar', slug: 'abayalar' },
    { name: 'Ichki kiyim', slug: 'ichki-kiyim' },
    { name: 'Sport kiyimlari', slug: 'sport-kiyimlari' },
  ];

  const created: Record<string, string> = {};
  for (const [index, child] of children.entries()) {
    const category = await prisma.category.upsert({
      where: { slug: child.slug },
      create: { name: child.name, slug: child.slug, parentId: kiyimlar.id, sortOrder: index },
      update: {},
    });
    created[child.slug] = category.id;
  }

  await prisma.category.upsert({
    where: { slug: 'oyoq-kiyimlar' },
    create: { name: 'Oyoq kiyimlar', slug: 'oyoq-kiyimlar', sortOrder: 1 },
    update: {},
  });
  return created;
}

interface SeedVariant {
  color: string;
  colorHex: string;
  sizes: string[];
}

interface SeedImage {
  file: string; // apps/frontend/public/products/<slug>/<file>
  color: string;
}

interface SeedProduct {
  name: string;
  slug: string; // rasm/video papkasi: apps/frontend/public/products/<slug>/
  basePrice: number;
  discountPercent?: number;
  description?: string;
  hasVideo?: boolean; // <slug>/video.mp4
  archived?: boolean;
  categorySlug: string;
  variants: SeedVariant[];
  images: SeedImage[]; // birinchisi asosiy (isMain) rasm
}

// Rasmlar apps/frontend/public/products/ ichida saqlanadi (Abaya — o'z suratlari,
// qolganlari Unsplash'dan namunaviy rasmlar). Haqiqiy suratlar admin panel orqali almashtiriladi.
// Tartib muhim: yangi bazada productCode shu tartibda 1, 2, 3... bo'lib beriladi.
const SEED_PRODUCTS: SeedProduct[] = [
  {
    name: "Gullar naqshli ko'ylak",
    slug: 'gullar-naqshli-koylak',
    basePrice: 448000,
    discountPercent: 20,
    categorySlug: 'koylaklar',
    variants: [
      { color: 'Pushti', colorHex: '#e8a0b4', sizes: ['XS', 'S', 'M', 'L'] },
      { color: 'Qizil', colorHex: '#b23a48', sizes: ['S', 'M', 'L'] },
    ],
    images: [
      { file: 'pushti.jpg', color: 'Pushti' },
      { file: 'qizil.jpg', color: 'Qizil' },
    ],
  },
  {
    name: "Klassik ko'ylak",
    slug: 'klassik-koylak',
    basePrice: 429000,
    categorySlug: 'koylaklar',
    variants: [
      { color: 'Qora', colorHex: '#1c1c1c', sizes: ['XS', 'S', 'M', 'L', 'XL'] },
      { color: 'Bej', colorHex: '#d8c3a5', sizes: ['S', 'M', 'L'] },
    ],
    images: [
      { file: 'qora.jpg', color: 'Qora' },
      { file: 'bej.jpg', color: 'Bej' },
    ],
  },
  {
    name: "Nafis ko'ylak",
    slug: 'nafis-koylak',
    basePrice: 429000,
    categorySlug: 'koylaklar',
    variants: [
      { color: 'Pushti', colorHex: '#e8a0b4', sizes: ['S', 'M', 'L'] },
      { color: 'Yashil', colorHex: '#4f6d4f', sizes: ['S', 'M'] },
    ],
    images: [
      { file: 'pushti.jpg', color: 'Pushti' },
      { file: 'yashil.jpg', color: 'Yashil' },
    ],
  },
  {
    name: "Yozgi ko'ylak",
    slug: 'yozgi-koylak',
    basePrice: 399000,
    categorySlug: 'koylaklar',
    variants: [{ color: 'Sariq', colorHex: '#e2c14c', sizes: ['XS', 'S', 'M'] }],
    images: [{ file: 'sariq.jpg', color: 'Sariq' }],
  },
  {
    name: "Zamonaviy ko'ylak",
    slug: 'zamonaviy-koylak',
    basePrice: 459000,
    categorySlug: 'koylaklar',
    variants: [{ color: 'Yashil', colorHex: '#4f6d4f', sizes: ['M', 'L', 'XL'] }],
    images: [{ file: 'yashil.jpg', color: 'Yashil' }],
  },
  {
    name: 'Kardigan — bej',
    slug: 'kardigan-bej',
    basePrice: 320000,
    categorySlug: 'tashqi-kiyimlar',
    variants: [{ color: 'Bej', colorHex: '#d8c3a5', sizes: ['S', 'M', 'L'] }],
    images: [
      { file: 'bej.jpg', color: 'Bej' },
      { file: 'bej-2.jpg', color: 'Bej' },
    ],
  },
  {
    name: "Yengil ko'ylak",
    slug: 'yengil-koylak',
    basePrice: 429000,
    categorySlug: 'koylaklar',
    variants: [
      { color: 'Pushti', colorHex: '#e8a0b4', sizes: ['S', 'M', 'L'] },
      { color: 'Yashil', colorHex: '#4f6d4f', sizes: ['S', 'M'] },
    ],
    images: [
      { file: 'pushti.jpg', color: 'Pushti' },
      { file: 'yashil.jpg', color: 'Yashil' },
    ],
  },
  {
    name: "Romantik ko'ylak",
    slug: 'romantik-koylak',
    basePrice: 429000,
    archived: true,
    categorySlug: 'koylaklar',
    variants: [
      { color: 'Pushti', colorHex: '#e8a0b4', sizes: ['S', 'M', 'L'] },
      { color: 'Yashil', colorHex: '#4f6d4f', sizes: ['S', 'M'] },
    ],
    images: [
      { file: 'pushti.jpg', color: 'Pushti' },
      { file: 'yashil.jpg', color: 'Yashil' },
    ],
  },
  {
    name: "Abaya to'plami",
    slug: 'abaya-toplami',
    basePrice: 195000,
    description: "Jibbon va abaya birgalikda to'plam — silliq mato, dantel bezakli yenglar va ro'mol.",
    hasVideo: true,
    categorySlug: 'abayalar',
    variants: [
      { color: 'Qizil', colorHex: '#8f1d2c', sizes: ['S', 'M', 'L', 'XL', 'XXL'] },
      { color: 'Qora', colorHex: '#1c1c1c', sizes: ['S', 'M', 'L', 'XL', 'XXL'] },
      { color: 'Jigarrang', colorHex: '#4a2f28', sizes: ['S', 'M', 'L', 'XL', 'XXL'] },
      { color: "Ko'k-kulrang", colorHex: '#6b84a0', sizes: ['S', 'M', 'L', 'XL', 'XXL'] },
    ],
    images: [
      { file: 'qizil.png', color: 'Qizil' },
      { file: 'qora.png', color: 'Qora' },
      { file: 'jigarrang.png', color: 'Jigarrang' },
      { file: 'kok-kulrang.png', color: "Ko'k-kulrang" },
    ],
  },
];

async function seedProducts(categoryIds: Record<string, string>, branchId: string) {
  for (const product of SEED_PRODUCTS) {
    const videoUrl = product.hasVideo ? `/products/${product.slug}/video.mp4` : undefined;
    let existing = await prisma.product.findFirst({ where: { name: product.name } });

    if (!existing) {
      const created = await prisma.product.create({
        data: {
          name: product.name,
          basePrice: product.basePrice,
          description: product.description,
          videoUrl,
          status: product.archived ? ProductStatus.ARCHIVED : ProductStatus.ACTIVE,
          archivedAt: product.archived ? new Date() : undefined,
          discountType: product.discountPercent ? DiscountType.PERCENT : undefined,
          discountValue: product.discountPercent,
          categories: { connect: [{ id: categoryIds[product.categorySlug] }] },
          variants: {
            create: product.variants.flatMap((variant) =>
              variant.sizes.map((size) => ({
                sku: `${product.name.slice(0, 3).toUpperCase()}-${variant.color.slice(0, 2).toUpperCase()}-${size}-${Math.floor(Math.random() * 10000)}`,
                color: variant.color,
                colorHex: variant.colorHex,
                size,
              })),
            ),
          },
        },
        include: { variants: true },
      });

      for (const variant of created.variants) {
        await prisma.branchInventory.create({
          data: { branchId, variantId: variant.id, onHand: 20, reserved: 0 },
        });
      }
      existing = created;
    } else if (videoUrl && !existing.videoUrl) {
      await prisma.product.update({ where: { id: existing.id }, data: { videoUrl } });
    }

    // Rasmlar faqat mahsulotda umuman rasm bo'lmasa qo'shiladi — admin panelda
    // almashtirilgan haqiqiy suratlar seed qayta ishga tushganda ustidan yozilmaydi.
    const imageCount = await prisma.productImage.count({ where: { productId: existing.id } });
    if (imageCount === 0) {
      await prisma.productImage.createMany({
        data: product.images.map((image, index) => ({
          productId: existing.id,
          url: `/products/${product.slug}/${image.file}`,
          storageKey: `products/${product.slug}/${image.file}`,
          color: image.color,
          altText: `${product.name} — ${image.color}`,
          isMain: index === 0,
          sortOrder: index,
        })),
      });
    }
  }
}

async function main() {
  await seedRolesAndPermissions();
  const branch = await seedBranch();
  await seedSuperadmin();
  await seedDeliveryZones();
  await seedSettings();
  const categoryIds = await seedCategories();
  await seedProducts(categoryIds, branch.id);
  console.log('Seed tugadi.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
