import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });
  }
}
