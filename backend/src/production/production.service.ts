import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductionDto } from './dto/create-production.dto';
import { SalaryType } from '@prisma/client';

@Injectable()
export class ProductionService {
  constructor(private prisma: PrismaService) {}

  private async generateNextProductionId(): Promise<string> {
    const lastProd = await this.prisma.productionEntry.findFirst({
      orderBy: { productionId: 'desc' },
    });

    if (!lastProd) {
      return 'MPL-PRD-001';
    }

    const match = lastProd.productionId.match(/MPL-PRD-(\d+)/);
    if (!match) {
      return 'MPL-PRD-001';
    }

    const nextNum = parseInt(match[1], 10) + 1;
    return `MPL-PRD-${nextNum.toString().padStart(3, '0')}`;
  }

  async create(createProductionDto: CreateProductionDto, supervisorId?: string) {
    const netSarees = createProductionDto.sareeCount - createProductionDto.defectiveSareeCount;
    if (netSarees < 0) {
      throw new BadRequestException('Defective saree count cannot exceed total saree count.');
    }

    const worker = await this.prisma.worker.findUnique({
      where: { id: createProductionDto.workerId },
      include: { salaryConfig: true, ledger: true },
    });

    if (!worker) {
      throw new NotFoundException(`Worker with ID ${createProductionDto.workerId} not found.`);
    }

    const warp = await this.prisma.warpYarn.findUnique({
      where: { id: createProductionDto.warpYarnId },
    });

    if (!warp) {
      throw new NotFoundException(`Warp Yarn with ID ${createProductionDto.warpYarnId} not found.`);
    }

    const productionId = await this.generateNextProductionId();

    // Calculate earned salary for this entry
    let earnedAmount = 0.0;
    if (worker.salaryType === SalaryType.PER_SAREE && worker.salaryConfig) {
      earnedAmount = netSarees * worker.salaryConfig.ratePerSaree;
    }

    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.productionEntry.create({
        data: {
          productionId,
          productionDate: new Date(createProductionDto.productionDate),
          workerId: createProductionDto.workerId,
          warpYarnId: createProductionDto.warpYarnId,
          sareeCount: createProductionDto.sareeCount,
          defectiveSareeCount: createProductionDto.defectiveSareeCount,
          netSarees,
          remarks: createProductionDto.remarks,
          supervisorId,
        },
      });

      // Update Salary Ledger if Per Saree worker
      if (earnedAmount > 0) {
        const currentLedger = await tx.salaryLedger.findUnique({
          where: { workerId: worker.id },
        });

        if (currentLedger) {
          const totalEarned = currentLedger.totalEarned + earnedAmount;
          const totalPending = totalEarned - currentLedger.totalPaid;

          await tx.salaryLedger.update({
            where: { workerId: worker.id },
            data: {
              totalEarned,
              totalPending,
            },
          });
        }
      }

      return entry;
    });
  }

  async findAll(filters: { workerId?: string; warpYarnId?: string; startDate?: string; endDate?: string }) {
    const whereClause: any = {};

    if (filters.workerId) {
      whereClause.workerId = filters.workerId;
    }
    if (filters.warpYarnId) {
      whereClause.warpYarnId = filters.warpYarnId;
    }
    if (filters.startDate || filters.endDate) {
      whereClause.productionDate = {};
      if (filters.startDate) {
        whereClause.productionDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        whereClause.productionDate.lte = new Date(filters.endDate);
      }
    }

    return this.prisma.productionEntry.findMany({
      where: whereClause,
      include: {
        worker: true,
        warpYarn: true,
      },
      orderBy: { productionDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const entry = await this.prisma.productionEntry.findUnique({
      where: { id },
      include: {
        worker: true,
        warpYarn: true,
      },
    });

    if (!entry) {
      throw new NotFoundException(`Production entry with ID ${id} not found.`);
    }

    return entry;
  }

  async update(id: string, createProductionDto: CreateProductionDto) {
    const existing = await this.prisma.productionEntry.findUnique({
      where: { id },
      include: { worker: { include: { salaryConfig: true, ledger: true } } },
    });

    if (!existing) {
      throw new NotFoundException(`Production entry with ID ${id} not found.`);
    }

    const netSarees = createProductionDto.sareeCount - createProductionDto.defectiveSareeCount;
    if (netSarees < 0) {
      throw new BadRequestException('Defective saree count cannot exceed total saree count.');
    }

    // Calculate original and new earnings
    let oldEarned = 0.0;
    let newEarned = 0.0;

    const worker = existing.worker;
    if (worker.salaryType === SalaryType.PER_SAREE && worker.salaryConfig) {
      oldEarned = existing.netSarees * worker.salaryConfig.ratePerSaree;
      newEarned = netSarees * worker.salaryConfig.ratePerSaree;
    }

    const difference = newEarned - oldEarned;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.productionEntry.update({
        where: { id },
        data: {
          productionDate: new Date(createProductionDto.productionDate),
          workerId: createProductionDto.workerId,
          warpYarnId: createProductionDto.warpYarnId,
          sareeCount: createProductionDto.sareeCount,
          defectiveSareeCount: createProductionDto.defectiveSareeCount,
          netSarees,
          remarks: createProductionDto.remarks,
        },
      });

      // Update Ledger if there is a difference and it's a Per Saree worker
      if (difference !== 0 && worker.salaryConfig) {
        const currentLedger = await tx.salaryLedger.findUnique({
          where: { workerId: worker.id },
        });

        if (currentLedger) {
          const totalEarned = currentLedger.totalEarned + difference;
          const totalPending = totalEarned - currentLedger.totalPaid;

          await tx.salaryLedger.update({
            where: { workerId: worker.id },
            data: {
              totalEarned,
              totalPending,
            },
          });
        }
      }

      return updated;
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.productionEntry.findUnique({
      where: { id },
      include: { worker: { include: { salaryConfig: true, ledger: true } } },
    });

    if (!existing) {
      throw new NotFoundException(`Production entry with ID ${id} not found.`);
    }

    let earned = 0.0;
    const worker = existing.worker;
    if (worker.salaryType === SalaryType.PER_SAREE && worker.salaryConfig) {
      earned = existing.netSarees * worker.salaryConfig.ratePerSaree;
    }

    return this.prisma.$transaction(async (tx) => {
      // Delete entry
      const deleted = await tx.productionEntry.delete({
        where: { id },
      });

      // Reverse ledger credit
      if (earned > 0) {
        const currentLedger = await tx.salaryLedger.findUnique({
          where: { workerId: worker.id },
        });

        if (currentLedger) {
          const totalEarned = Math.max(0, currentLedger.totalEarned - earned);
          const totalPending = totalEarned - currentLedger.totalPaid;

          await tx.salaryLedger.update({
            where: { workerId: worker.id },
            data: {
              totalEarned,
              totalPending,
            },
          });
        }
      }

      return { deleted: true };
    });
  }
}
