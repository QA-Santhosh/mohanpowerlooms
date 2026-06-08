import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  private async generateNextTransactionId(): Promise<string> {
    const lastPayment = await this.prisma.salaryPayment.findFirst({
      orderBy: { transactionId: 'desc' },
    });

    if (!lastPayment) {
      return 'MPL-TXN-001';
    }

    const match = lastPayment.transactionId.match(/MPL-TXN-(\d+)/);
    if (!match) {
      return 'MPL-TXN-001';
    }

    const nextNum = parseInt(match[1], 10) + 1;
    return `MPL-TXN-${nextNum.toString().padStart(3, '0')}`;
  }

  async create(createPaymentDto: CreatePaymentDto, adminId: string) {
    const worker = await this.prisma.worker.findUnique({
      where: { id: createPaymentDto.workerId },
      include: { ledger: true },
    });

    if (!worker) {
      throw new NotFoundException(`Worker with ID ${createPaymentDto.workerId} not found.`);
    }

    const transactionId = await this.generateNextTransactionId();

    return this.prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.salaryPayment.create({
        data: {
          transactionId,
          workerId: createPaymentDto.workerId,
          amount: createPaymentDto.amount,
          paymentDate: new Date(createPaymentDto.paymentDate),
          paymentMethod: createPaymentDto.paymentMethod,
          referenceNumber: createPaymentDto.referenceNumber,
          notes: createPaymentDto.notes,
          adminId,
        },
      });

      // Update Salary Ledger
      const currentLedger = await tx.salaryLedger.findUnique({
        where: { workerId: worker.id },
      });

      if (currentLedger) {
        const totalPaid = currentLedger.totalPaid + createPaymentDto.amount;
        const totalPending = currentLedger.totalEarned - totalPaid;

        await tx.salaryLedger.update({
          where: { workerId: worker.id },
          data: {
            totalPaid,
            totalPending,
          },
        });
      }

      return payment;
    });
  }

  async findAll(filters: { workerId?: string; startDate?: string; endDate?: string }) {
    const whereClause: any = {};
    if (filters.workerId) {
      whereClause.workerId = filters.workerId;
    }
    if (filters.startDate || filters.endDate) {
      whereClause.paymentDate = {};
      if (filters.startDate) {
        whereClause.paymentDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        whereClause.paymentDate.lte = new Date(filters.endDate);
      }
    }

    return this.prisma.salaryPayment.findMany({
      where: whereClause,
      include: {
        worker: true,
      },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const payment = await this.prisma.salaryPayment.findUnique({
      where: { id },
      include: {
        worker: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Salary Payment with ID ${id} not found.`);
    }

    return payment;
  }

  async getLedgers() {
    return this.prisma.salaryLedger.findMany({
      include: {
        worker: true,
      },
      orderBy: { worker: { workerId: 'asc' } },
    });
  }

  async getLedgerForWorker(workerId: string) {
    const ledger = await this.prisma.salaryLedger.findUnique({
      where: { workerId },
      include: {
        worker: true,
      },
    });

    if (!ledger) {
      throw new NotFoundException(`Ledger not found for worker ID ${workerId}`);
    }

    return ledger;
  }

  async update(id: string, createPaymentDto: CreatePaymentDto) {
    const existing = await this.prisma.salaryPayment.findUnique({
      where: { id },
      include: { worker: true },
    });

    if (!existing) {
      throw new NotFoundException(`Payment record with ID ${id} not found.`);
    }

    const difference = createPaymentDto.amount - existing.amount;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.salaryPayment.update({
        where: { id },
        data: {
          workerId: createPaymentDto.workerId,
          amount: createPaymentDto.amount,
          paymentDate: new Date(createPaymentDto.paymentDate),
          paymentMethod: createPaymentDto.paymentMethod,
          referenceNumber: createPaymentDto.referenceNumber,
          notes: createPaymentDto.notes,
        },
      });

      // Update Ledger
      if (difference !== 0) {
        const currentLedger = await tx.salaryLedger.findUnique({
          where: { workerId: existing.workerId },
        });

        if (currentLedger) {
          const totalPaid = currentLedger.totalPaid + difference;
          const totalPending = currentLedger.totalEarned - totalPaid;

          await tx.salaryLedger.update({
            where: { workerId: existing.workerId },
            data: {
              totalPaid,
              totalPending,
            },
          });
        }
      }

      return updated;
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.salaryPayment.findUnique({
      where: { id },
      include: { worker: true },
    });

    if (!existing) {
      throw new NotFoundException(`Payment record with ID ${id} not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.salaryPayment.delete({
        where: { id },
      });

      // Reverse ledger payment
      const currentLedger = await tx.salaryLedger.findUnique({
        where: { workerId: existing.workerId },
      });

      if (currentLedger) {
        const totalPaid = Math.max(0, currentLedger.totalPaid - existing.amount);
        const totalPending = currentLedger.totalEarned - totalPaid;

        await tx.salaryLedger.update({
          where: { workerId: existing.workerId },
          data: {
            totalPaid,
            totalPending,
          },
        });
      }

      return { deleted: true };
    });
  }
}
