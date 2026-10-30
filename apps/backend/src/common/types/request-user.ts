import { UserRole } from '@prisma/client';

export interface RequestUser {
  id: string;
  role: UserRole;
  phone: string;
}
