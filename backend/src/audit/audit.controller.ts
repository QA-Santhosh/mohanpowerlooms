import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { FirebaseAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('audit')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN)
  findAll() {
    return this.auditService.findAll();
  }
}
