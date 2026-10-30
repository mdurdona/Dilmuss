import { Module } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { BranchesController } from './branches.controller';
import { BranchAccessService } from './branch-access.service';
import { AuditModule } from '../audit/audit.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [AuditModule, RbacModule],
  providers: [BranchesService, BranchAccessService],
  controllers: [BranchesController],
  exports: [BranchesService, BranchAccessService],
})
export class BranchesModule {}
