import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { Prisma, Role } from '@prisma/client';

@Injectable()
export class WorkersService {
  constructor(private prisma: PrismaService) {}

  private async generateNextWorkerId(): Promise<string> {
    const lastWorker = await this.prisma.worker.findFirst({
      orderBy: { workerId: 'desc' },
    });

    if (!lastWorker) {
      return 'MPL-WRK-001';
    }

    const match = lastWorker.workerId.match(/MPL-WRK-(\d+)/);
    if (!match) {
      return 'MPL-WRK-001';
    }

    const nextNum = parseInt(match[1], 10) + 1;
    return `MPL-WRK-${nextNum.toString().padStart(3, '0')}`;
  }

  async create(createWorkerDto: CreateWorkerDto) {
    const workerId = await this.generateNextWorkerId();
    
    // Find if user email exists to link account
    let userId: string | undefined = undefined;
    if (createWorkerDto.email) {
      const user = await this.prisma.user.findUnique({
        where: { email: createWorkerDto.email },
      });
      if (user) {
        userId = user.id;
      }
    }

    // Wrap database operations in a transaction
    return this.prisma.$transaction(async (tx) => {
      const worker = await tx.worker.create({
        data: {
          workerId,
          firstName: createWorkerDto.firstName,
          lastName: createWorkerDto.lastName,
          mobileNumber: createWorkerDto.mobileNumber,
          address: createWorkerDto.address,
          aadhaarNumber: createWorkerDto.aadhaarNumber,
          dateOfJoining: new Date(createWorkerDto.dateOfJoining),
          status: createWorkerDto.status || 'ACTIVE',
          workerType: createWorkerDto.workerType,
          salaryType: createWorkerDto.salaryType,
          userId,
          sareeTypeId: createWorkerDto.sareeTypeId,
        },
      });

      // Create bank account
      if (createWorkerDto.bankAccount) {
        await tx.workerBankAccount.create({
          data: {
            workerId: worker.id,
            accountHolderName: createWorkerDto.bankAccount.accountHolderName,
            bankName: createWorkerDto.bankAccount.bankName,
            accountNumber: createWorkerDto.bankAccount.accountNumber,
            ifscCode: createWorkerDto.bankAccount.ifscCode,
            upiId: createWorkerDto.bankAccount.upiId,
          },
        });
      }

      // Resolve rate from SareeType if assigned
      let ratePerSaree = createWorkerDto.salaryConfig?.ratePerSaree || 0.0;
      if (createWorkerDto.sareeTypeId) {
        const st = await tx.sareeType.findUnique({ where: { id: createWorkerDto.sareeTypeId } });
        if (st) {
          ratePerSaree = st.rate;
        }
      }

      // Create salary config
      await tx.salaryConfiguration.create({
        data: {
          workerId: worker.id,
          ratePerSaree,
          fixedMonthlySalary: createWorkerDto.salaryConfig?.fixedMonthlySalary || 0.0,
        },
      });

      // Initialize salary ledger
      await tx.salaryLedger.create({
        data: {
          workerId: worker.id,
          totalEarned: 0.0,
          totalPaid: 0.0,
          totalPending: 0.0,
        },
      });

      return tx.worker.findUnique({
        where: { id: worker.id },
        include: {
          bankAccount: true,
          salaryConfig: true,
          ledger: true,
          sareeType: true,
        },
      });
    });
  }

  async findAll(userRole: Role, filterStatus?: string) {
    const whereClause: Prisma.WorkerWhereInput = {};
    if (filterStatus) {
      whereClause.status = filterStatus;
    }

    const workers = await this.prisma.worker.findMany({
      where: whereClause,
      include: {
        bankAccount: userRole === Role.SUPER_ADMIN, // Only load bank account if Admin
        salaryConfig: userRole === Role.SUPER_ADMIN, // Only load salary details if Admin
        ledger: userRole === Role.SUPER_ADMIN,
        sareeType: true,
      },
      orderBy: { workerId: 'asc' },
    });

    return workers;
  }

  async findOne(id: string, userRole: Role) {
    const worker = await this.prisma.worker.findUnique({
      where: { id },
      include: {
        bankAccount: userRole === Role.SUPER_ADMIN,
        salaryConfig: userRole === Role.SUPER_ADMIN,
        ledger: userRole === Role.SUPER_ADMIN,
        sareeType: true,
        assignments: {
          include: {
            warpYarn: true,
          },
        },
        productions: {
          orderBy: { productionDate: 'desc' },
          take: 10,
        },
      },
    });

    if (!worker) {
      throw new NotFoundException(`Worker with ID ${id} not found.`);
    }

    return worker;
  }

  async update(id: string, createWorkerDto: CreateWorkerDto) {
    const existing = await this.prisma.worker.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Worker with ID ${id} not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.worker.update({
        where: { id },
        data: {
          firstName: createWorkerDto.firstName,
          lastName: createWorkerDto.lastName,
          mobileNumber: createWorkerDto.mobileNumber,
          address: createWorkerDto.address,
          aadhaarNumber: createWorkerDto.aadhaarNumber,
          dateOfJoining: new Date(createWorkerDto.dateOfJoining),
          status: createWorkerDto.status || 'ACTIVE',
          workerType: createWorkerDto.workerType,
          salaryType: createWorkerDto.salaryType,
          sareeTypeId: createWorkerDto.sareeTypeId,
        },
      });

      if (createWorkerDto.bankAccount) {
        await tx.workerBankAccount.upsert({
          where: { workerId: id },
          update: {
            accountHolderName: createWorkerDto.bankAccount.accountHolderName,
            bankName: createWorkerDto.bankAccount.bankName,
            accountNumber: createWorkerDto.bankAccount.accountNumber,
            ifscCode: createWorkerDto.bankAccount.ifscCode,
            upiId: createWorkerDto.bankAccount.upiId,
          },
          create: {
            workerId: id,
            accountHolderName: createWorkerDto.bankAccount.accountHolderName,
            bankName: createWorkerDto.bankAccount.bankName,
            accountNumber: createWorkerDto.bankAccount.accountNumber,
            ifscCode: createWorkerDto.bankAccount.ifscCode,
            upiId: createWorkerDto.bankAccount.upiId,
          },
        });
      }

      // Resolve rate from SareeType if assigned
      let ratePerSaree = createWorkerDto.salaryConfig?.ratePerSaree || 0.0;
      if (createWorkerDto.sareeTypeId) {
        const st = await tx.sareeType.findUnique({ where: { id: createWorkerDto.sareeTypeId } });
        if (st) {
          ratePerSaree = st.rate;
        }
      }

      if (createWorkerDto.salaryConfig) {
        await tx.salaryConfiguration.upsert({
          where: { workerId: id },
          update: {
            ratePerSaree,
            fixedMonthlySalary: createWorkerDto.salaryConfig.fixedMonthlySalary || 0.0,
          },
          create: {
            workerId: id,
            ratePerSaree,
            fixedMonthlySalary: createWorkerDto.salaryConfig.fixedMonthlySalary || 0.0,
          },
        });
      }

      return tx.worker.findUnique({
        where: { id },
        include: {
          bankAccount: true,
          salaryConfig: true,
          ledger: true,
          sareeType: true,
        },
      });
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.worker.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Worker with ID ${id} not found.`);
    }

    // Delete associated details first, or count on cascade
    return this.prisma.worker.delete({
      where: { id },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.worker.findUnique({
      where: { userId },
    });
  }
}
