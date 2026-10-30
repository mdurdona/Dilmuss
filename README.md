# Dilmuss — ayollar kiyim do'koni

Ko'p filialli e-commerce platforma: NestJS + Prisma (PostgreSQL) backend va Next.js frontend.

> TZ'da bo'lmagan, lekin ishlab chiqish jarayonida qo'shilgan narsalar uchun [QOSHIMCHALAR.md](./QOSHIMCHALAR.md) ga qarang.

## Struktura

```
apps/
  backend/   NestJS API (auth, RBAC, katalog, ombor, savat, buyurtma, to'lov, va h.k.)
  frontend/  Next.js 16 mijoz vitrinasi (Tailwind CSS)
```

## Talablar

- Node.js 24+, pnpm 11+
- Lokal PostgreSQL (loyihada Homebrew `postgresql@18` ishlatilgan)

## Ishga tushirish

```bash
pnpm install

# Backend
cd apps/backend
cp .env.example .env   # DATABASE_URL, JWT sirlarini moslang
pnpm prisma:migrate    # migratsiyalarni qo'llash
pnpm prisma:seed       # boshlang'ich ma'lumotlar (rol/permission/filial/superadmin/namuna mahsulotlar)
pnpm dev                # http://localhost:4000/api (Swagger: /api/docs)

# Frontend (alohida terminalda)
cd apps/frontend
pnpm dev                # http://localhost:3000
```

Seed superadmin: `.env`dagi `SEED_SUPERADMIN_PHONE`/`SEED_SUPERADMIN_PASSWORD` (default: `+998901112233` / `SuperAdmin123!`).

## Backend — amalga oshirilgan modullar

- **Auth**: ro'yxatdan o'tish (telefon → OTP tasdiqlash → parol, email yo'q) + login (telefon+parol), JWT access+refresh (refresh — httpOnly cookie), brute-force lock (TZ 17), session boshqaruvi. OTP `PhoneVerification` jadvalida saqlanadi (5 daqiqa TTL, 60s qayta yuborish cooldown, 5 ta urinish limiti), yuborilishi mavjud Notification stub orqali (real SMS provider yo'q — kod backend konsol logiga chiqadi).
- **RBAC**: Role/Permission/RolePermission + individual GRANT/REVOKE override (TZ 4.6), SUPERADMIN yagonaligi (`activeSuperadminMarker` unique invariant).
- **Filiallar**: CRUD, admin↔filial biriktirish, `branchScope` (OWN/SELECTED/ALL) asosida kirish nazorati.
- **Katalog**: 2 darajali kategoriya, mahsulot/variant/rasm, chegirma (product va variant darajasida, muddat bilan), pg_trgm qidiruv.
- **Ombor**: BranchInventory (available = onHand - reserved), InventoryMovement immutable log, StockReservation (15 daqiqalik TTL, cron orqali expire), StockTransfer (filiallararo, Phase 2).
- **Savat**: guest (cookie token) + ro'yxatdan o'tgan foydalanuvchi, login/register'da avtomatik birlashtirish.
- **Buyurtma**: checkout state machine (PENDING_PAYMENT → CONFIRMED → ... → DELIVERED / CANCELLED, MANUAL_REVIEW — bitta filialda barcha mahsulot topilmasa), holat tarixi, bekor qilishda stock qaytarish.
- **To'lov**: Payme (JSON-RPC: CheckPerformTransaction/CreateTransaction/PerformTransaction/CancelTransaction/CheckTransaction) va Click (Prepare/Complete, MD5 imzo tekshiruvi) adapterlari, idempotency (`PaymentTransaction.idempotencyKey`), `Payment.paidMarker` unique invariant orqali bitta order = bitta PAID to'lov.
- **Yetkazib berish**: zona bo'yicha narx (Toshkent 30 000 / Samarqand 20 000 / boshqa 40 000), yetkazib berish holati.
- **Notification**: Telegram adapter (token bo'lmasa faqat log), Email/SMS/Push — hozircha stub.
- **Audit log**: sezilarli amallar uchun yozuv, maxfiy maydonlar redact qilinadi.
- **System settings**: key-value (masalan `stock.reservation.ttlMinutes`).
- **Saralangan (sevimlilar)**: `Favorite` (userId+productId, unique), faqat autentifikatsiya talab qiladi (RBAC permission kerak emas).

### Hali qilinmagan / keyingi bosqich

- Audit log ko'rish uchun admin UI yo'q (backend API tayyor). Permission override (GRANT/REVOKE) UI endi mavjud — "Adminlar" sahifasida SUPERADMIN har bir admin uchun "Huquqlar" panelini ochib, har bir ruxsatni Ruxsat/Standart/Taqiqlash holatiga o'tkaza oladi.
- Payme/Click **sandbox hisob ma'lumotlari** yo'q — `.env`ga haqiqiy `PAYME_*`/`CLICK_*` kiritilmaguncha to'lov checkout linklari ishlamaydi (webhook mantiqi tayyor va test qilingan strukturaviy jihatdan).
- Fayl yuklash (S3/MinIO) — hozircha mahsulot rasmlari uchun URL qabul qilinadi, real upload adapteri yo'q.
- Ijtimoiy tarmoq integratsiyasi (masalan bitta tugma bilan ijtimoiy tarmoq orqali kirish) — hozircha yo'q. (Sevimlilar/wishlist endi mavjud — pastga qarang.)

## Frontend — mijoz vitrinasi (`/`)

Bosh sahifa, katalog (filtrlar: kategoriya/narx/o'lcham/rang + saralash), mahsulot detali, savat, checkout (3 bosqich: shaxsiy ma'lumot → yetkazib berish → to'lov, kirilmagan bo'lsa ro'yxatdan o'tish/kirishga yo'naltiriladi va tugagach checkout'ga qaytariladi), login/register, profil (ma'lumot, buyurtmalar, saralangan, manzillar). Barcha mijoz sahifalari `app/(store)/` ostida, umumiy Header/Footer bilan.

## Frontend — admin panel (`/admin`)

`app/admin/` — mijozlar qismidan butunlay alohida kirish nuqtasi: `/admin/login` (mustaqil sahifa, `/login`dan farqli — "Ro'yxatdan o'tish" havolasi yo'q). Qolgan barcha `/admin/*` sahifalar `app/admin/(protected)/` guruhida, ADMIN/SUPERADMIN rolidagi foydalanuvchi kirishi mumkin (`AdminGuard`), alohida sidebar (`AdminSidebar`). Bo'limlar:

- **Boshqaruv paneli** — buyurtma holatlari bo'yicha statistika, kam qolgan zaxira soni, to'langan tushum, so'nggi buyurtmalar.
- **Buyurtmalar** — ro'yxat (holat bo'yicha filtr) + detal sahifa: holatni o'zgartirish (state machine bo'yicha ruxsat etilgan o'tishlar), MANUAL_REVIEW uchun filial biriktirish, holat tarixi, to'lovlar.
- **Mahsulotlar** — ro'yxat (qidiruv), yangi mahsulot yaratish (nomi/narxi/tavsif/kategoriya/variantlar), tahrirlash (barcha maydonlar: chegirma, video, fason, mavsum(lar) + rasm qo'shish/o'chirish rang belgisi bilan + yangi variant qo'shish/olib tashlash), arxivlash/qayta faollashtirish.
- **Kategoriyalar** — 2 darajali daraxt, yaratish, faollashtirish/faolsizlantirish.
- **Ombor** — filial tanlash, barcha variantlar bo'yicha onHand/reserved/available jadvali, qo'lda tuzatish (delta + sabab).
- **Filiallar** — ro'yxat + yaratish.
- **Foydalanuvchilar** — barcha CUSTOMER rolidagi ro'yxatdan o'tgan foydalanuvchilar ro'yxati (qidiruv, bloklash/faollashtirish).
- **Adminlar** — ro'yxat (SUPERADMIN ko'rsatilmaydi) + yangi admin yaratish (`branchScope` bilan, faqat SUPERADMIN), bloklash/faollashtirish, har bir admin uchun individual permission override (Ruxsat/Standart/Taqiqlash) paneli (faqat SUPERADMIN).
- **Sozlamalar** — `SystemSetting` key-value jadvali (masalan `stock.reservation.ttlMinutes`).

Barcha sahifalar `apps/backend` API'siga to'g'ridan-to'g'ri ulangan (`NEXT_PUBLIC_API_URL`, default `http://localhost:4000/api`). Mahsulot rasmlari hozircha `picsum.photos` orqali generatsiya qilingan placeholder — real mahsulot suratlari bilan almashtirilishi kerak.
