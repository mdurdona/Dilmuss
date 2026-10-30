import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const BCRYPT_ROUNDS = 10;
const SELECT_SAFE = {
  id: true,
  fullName: true,
  phone: true,
  email: true,
  role: true,
  status: true,
  branchScope: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  findAdmins() {
    return this.prisma.user.findMany({
      where: { role: { in: [UserRole.ADMIN, UserRole.SUPERADMIN] } },
      select: SELECT_SAFE,
      orderBy: { createdAt: 'desc' },
    });
  }

  findCustomers(search?: string) {
    return this.prisma.user.findMany({
      where: {
        role: UserRole.CUSTOMER,
        OR: search
          ? [{ fullName: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }]
          : undefined,
      },
      select: SELECT_SAFE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SELECT_SAFE });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    return user;
  }

  async createAdmin(dto: CreateAdminDto) {
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) throw new ConflictException('Bu telefon raqami allaqachon mavjud');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    return this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email,
        passwordHash,
        role: UserRole.ADMIN,
        branchScope: dto.branchScope,
      },
      select: SELECT_SAFE,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const target = await this.findOne(id);
    // SUPERADMIN hisobi (o'zining ismi/emailidan tashqari) faqat o'zi /users/me orqali o'zgartira oladi —
    // boshqa SUPERADMIN yoki ADMIN_UPDATE huquqiga ega hech kim bu yo'l orqali unga tegmasligi kerak
    // (bitta hisob buzilsa ham, boshqa SUPERADMIN hisoblarini bloklash/parolini o'zgartirish imkonsiz bo'lishi uchun).
    if (target.role === UserRole.SUPERADMIN) {
      throw new ForbiddenException("SUPERADMIN hisobini bu yo'l orqali o'zgartirib bo'lmaydi");
    }
    const { password, ...rest } = dto;
    const data: Prisma.UserUpdateInput = { ...rest };
    if (password) {
      data.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    }
    try {
      const updated = await this.prisma.user.update({ where: { id }, data, select: SELECT_SAFE });
      // Parol reset qilinganda eski sessiyalar (refresh tokenlar) darhol bekor qilinadi — aks holda
      // hisob buzilib, parol "xavfsizlik uchun" almashtirilsa ham, hujumchining eski refresh tokeni
      // 30 kungacha ishlab turishi mumkin edi.
      if (password) {
        await this.authService.revokeAllSessions(id);
      }
      return updated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Bu telefon raqami allaqachon mavjud');
      }
      throw error;
    }
  }

  /** TZ 4.7 — faqat 1 ta ACTIVE SUPERADMIN bo'lishi mumkin, activeSuperadminMarker @unique shu invariantni bazada ta'minlaydi. */
  async promoteToSuperadmin(id: string) {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: { role: UserRole.SUPERADMIN, status: UserStatus.ACTIVE, activeSuperadminMarker: true },
        select: SELECT_SAFE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Tizimda allaqachon faol SUPERADMIN mavjud');
      }
      throw error;
    }
  }

  async setStatus(id: string, status: UserStatus) {
    const user = await this.findOne(id);
    if (user.role === UserRole.SUPERADMIN) {
      throw new ForbiddenException("SUPERADMIN hisobining holatini bu yo'l orqali o'zgartirib bo'lmaydi");
    }
    const data: Prisma.UserUpdateInput = { status };
    const updated = await this.prisma.user.update({ where: { id }, data, select: SELECT_SAFE });
    // Hisob bloklanganda/nofaol qilinganda refresh sessiyalar ham darhol bekor qilinadi — aks holda
    // bloklangan foydalanuvchi refresh token orqali 30 kungacha yangi access token olaverishi mumkin edi.
    if (status !== UserStatus.ACTIVE) {
      await this.authService.revokeAllSessions(id);
    }
    return updated;
  }

  async updateProfile(id: string, dto: Pick<UpdateUserDto, 'fullName' | 'email'>) {
    return this.prisma.user.update({ where: { id }, data: dto, select: SELECT_SAFE });
  }

  async changePassword(id: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) throw new ConflictException('Joriy parol xato');
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { success: true };
  }
}
