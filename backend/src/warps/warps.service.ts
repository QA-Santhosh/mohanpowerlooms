import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWarpDto } from './dto/create-warp.dto';
import { WarpStatus } from '@prisma/client';

@Injectable()
export class WarpsService {
  constructor(private prisma: PrismaService) {}

  private async generateNextWarpId(): Promise<string> {
    const lastWarp = await this.prisma.warpYarn.findFirst({
      orderBy: { warpId: 'desc' },
    });

    if (!lastWarp) {
      return 'MPL-WRP-001';
    }

    const match = lastWarp.warpId.match(/MPL-WRP-(\d+)/);
    if (!match) {
      return 'MPL-WRP-001';
    }

    const nextNum = parseInt(match[1], 10) + 1;
    return `MPL-WRP-${nextNum.toString().padStart(3, '0')}`;
  }

  async create(createWarpDto: CreateWarpDto) {
    const warpId = createWarpDto.warpId || (await this.generateNextWarpId());

    // Check uniqueness
    const existing = await this.prisma.warpYarn.findUnique({
      where: { warpId },
    });
    if (existing) {
      throw new BadRequestException(`Warp ID ${warpId} already exists.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const warp = await tx.warpYarn.create({
        data: {
          warpId,
          warpName: createWarpDto.warpName,
          designName: createWarpDto.designName,
          sareeType: createWarpDto.sareeType,
          color: createWarpDto.color,
          yarnQuality: createWarpDto.yarnQuality,
          startDate: new Date(createWarpDto.startDate),
          endDate: createWarpDto.endDate ? new Date(createWarpDto.endDate) : null,
          status: createWarpDto.status || WarpStatus.ACTIVE,
          expectedSarees: createWarpDto.expectedSarees,
          expectedWarpLength: createWarpDto.expectedWarpLength,
          productionTarget: createWarpDto.productionTarget,
        },
      });

      // Handle worker assignments
      if (createWarpDto.assignedWorkerIds && createWarpDto.assignedWorkerIds.length > 0) {
        const assignments = createWarpDto.assignedWorkerIds.map((workerId) => ({
          workerId,
          warpYarnId: warp.id,
        }));
        await tx.warpAssignment.createMany({
          data: assignments,
        });
      }

      return tx.warpYarn.findUnique({
        where: { id: warp.id },
        include: {
          assignments: {
            include: {
              worker: true,
            },
          },
        },
      });
    });
  }

  async findAll(status?: WarpStatus) {
    const where = status ? { status } : {};
    const warps = await this.prisma.warpYarn.findMany({
      where,
      include: {
        assignments: {
          include: {
            worker: true,
          },
        },
        productions: true, // For statistics calculations
      },
      orderBy: { warpId: 'asc' },
    });

    // Compute status and totals dynamically
    return warps.map((warp) => {
      const netSarees = warp.productions.reduce((sum, p) => sum + p.netSarees, 0);
      const defectiveSarees = warp.productions.reduce((sum, p) => sum + p.defectiveSareeCount, 0);
      const remainingProduction = Math.max(0, warp.expectedSarees - netSarees);
      
      return {
        ...warp,
        stats: {
          producedSarees: netSarees,
          defectiveSarees,
          remainingProduction,
          progressPercentage: Math.min(100, (netSarees / warp.expectedSarees) * 100),
        },
      };
    });
  }

  async findOne(id: string) {
    const warp = await this.prisma.warpYarn.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            worker: true,
          },
        },
        productions: {
          include: {
            worker: true,
          },
          orderBy: { productionDate: 'desc' },
        },
      },
    });

    if (!warp) {
      throw new NotFoundException(`Warp Yarn with ID ${id} not found.`);
    }

    const netSarees = warp.productions.reduce((sum, p) => sum + p.netSarees, 0);
    const defectiveSarees = warp.productions.reduce((sum, p) => sum + p.defectiveSareeCount, 0);
    const remainingProduction = Math.max(0, warp.expectedSarees - netSarees);

    return {
      ...warp,
      stats: {
        producedSarees: netSarees,
        defectiveSarees,
        remainingProduction,
        progressPercentage: Math.min(100, (netSarees / warp.expectedSarees) * 100),
      },
    };
  }

  async update(id: string, createWarpDto: CreateWarpDto) {
    const existing = await this.prisma.warpYarn.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Warp Yarn with ID ${id} not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.warpYarn.update({
        where: { id },
        data: {
          warpName: createWarpDto.warpName,
          designName: createWarpDto.designName,
          sareeType: createWarpDto.sareeType,
          color: createWarpDto.color,
          yarnQuality: createWarpDto.yarnQuality,
          startDate: new Date(createWarpDto.startDate),
          endDate: createWarpDto.endDate ? new Date(createWarpDto.endDate) : null,
          status: createWarpDto.status || WarpStatus.ACTIVE,
          expectedSarees: createWarpDto.expectedSarees,
          expectedWarpLength: createWarpDto.expectedWarpLength,
          productionTarget: createWarpDto.productionTarget,
        },
      });

      // If assignedWorkerIds are provided, sync assignments
      if (createWarpDto.assignedWorkerIds !== undefined) {
        // Delete all old assignments
        await tx.warpAssignment.deleteMany({
          where: { warpYarnId: id },
        });

        // Add new assignments
        if (createWarpDto.assignedWorkerIds.length > 0) {
          const assignments = createWarpDto.assignedWorkerIds.map((workerId) => ({
            workerId,
            warpYarnId: id,
          }));
          await tx.warpAssignment.createMany({
            data: assignments,
          });
        }
      }

      return tx.warpYarn.findUnique({
        where: { id },
        include: {
          assignments: {
            include: {
              worker: true,
            },
          },
        },
      });
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.warpYarn.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Warp Yarn with ID ${id} not found.`);
    }

    return this.prisma.warpYarn.delete({
      where: { id },
    });
  }
}
