import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BranchScope } from '@prisma/client';
import { CreateAdminDto } from './create-admin.dto';

describe('CreateAdminDto — security fix #13: admin password policy', () => {
  const base = {
    fullName: 'Test Admin',
    phone: '+998901112233',
    branchScope: BranchScope.OWN_BRANCH,
  };

  async function passwordErrors(password: string) {
    const dto = plainToInstance(CreateAdminDto, { ...base, password });
    const errors = await validate(dto);
    return errors.find((e) => e.property === 'password');
  }

  it("qisqa parol (6 belgi, eski minimal) endi rad etiladi", async () => {
    expect(await passwordErrors('abc123')).toBeDefined();
  });

  it("faqat kichik harf + raqamli 12+ belgili parol ham rad etiladi (katta harf yo'q)", async () => {
    expect(await passwordErrors('lowercase123')).toBeDefined();
  });

  it("katta harfsiz, raqamsiz uzun parol rad etiladi", async () => {
    expect(await passwordErrors('onlylowercaseletters')).toBeDefined();
  });

  it("12+ belgi, katta+kichik harf va raqam bo'lgan kuchli parol qabul qilinadi", async () => {
    expect(await passwordErrors('StrongPass123')).toBeUndefined();
  });
});
