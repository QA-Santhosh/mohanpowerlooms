import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(userRole: Role, workerProfileId?: string) {
    const isWorker = userRole === Role.WORKER;
    const workerFilter = isWorker ? { workerId: workerProfileId } : {};

    // 1. Total Sarees Produced
    const productionSum = await this.prisma.productionEntry.aggregate({
      where: workerFilter,
      _sum: {
        netSarees: true,
      },
    });
    const totalSarees = productionSum._sum.netSarees || 0;

    // 2. Total Workers
    const totalWorkers = await this.prisma.worker.count();

    // 3. Active Warp Yarns
    // If worker, count only warps assigned to them
    const activeWarps = await this.prisma.warpYarn.count({
      where: {
        status: 'ACTIVE',
        ...(isWorker ? { assignments: { some: { workerId: workerProfileId } } } : {}),
      },
    });

    // 4. Financials (Total Salary Paid & Pending) - Admin/Worker only. Supervisors see 0 or hidden.
    let totalPaid = 0;
    let pendingSalary = 0;

    if (userRole === Role.SUPER_ADMIN) {
      const ledgerAgg = await this.prisma.salaryLedger.aggregate({
        _sum: {
          totalPaid: true,
          totalPending: true,
        },
      });
      totalPaid = ledgerAgg._sum.totalPaid || 0;
      pendingSalary = ledgerAgg._sum.totalPending || 0;
    } else if (isWorker && workerProfileId) {
      const ledger = await this.prisma.salaryLedger.findUnique({
        where: { workerId: workerProfileId },
      });
      if (ledger) {
        totalPaid = ledger.totalPaid;
        pendingSalary = ledger.totalPending;
      }
    }

    // 5. Current Month Production
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthProductionSum = await this.prisma.productionEntry.aggregate({
      where: {
        ...workerFilter,
        productionDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: {
        netSarees: true,
      },
    });
    const monthProduction = monthProductionSum._sum.netSarees || 0;

    // 6. Current Month Payments (Admin or Worker)
    let monthPayments = 0;
    if (userRole === Role.SUPER_ADMIN || isWorker) {
      const monthPaymentsSum = await this.prisma.salaryPayment.aggregate({
        where: {
          ...workerFilter,
          paymentDate: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: {
          amount: true,
        },
      });
      monthPayments = monthPaymentsSum._sum.amount || 0;
    }

    return {
      totalSarees,
      totalWorkers,
      activeWarps,
      totalPaid,
      pendingSalary,
      monthProduction,
      monthPayments,
    };
  }

  async getCharts(userRole: Role, workerProfileId?: string) {
    const isWorker = userRole === Role.WORKER;
    const workerFilter = isWorker ? { workerId: workerProfileId } : {};

    // 1. Monthly Production Trend (last 6 months)
    const productionEntries = await this.prisma.productionEntry.findMany({
      where: workerFilter,
      select: {
        netSarees: true,
        productionDate: true,
      },
      orderBy: { productionDate: 'asc' },
    });

    const productionTrendMap = new Map<string, number>();
    productionEntries.forEach((entry) => {
      const date = new Date(entry.productionDate);
      const monthYear = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      const current = productionTrendMap.get(monthYear) || 0;
      productionTrendMap.set(monthYear, current + entry.netSarees);
    });

    const productionTrend = Array.from(productionTrendMap.entries()).map(([month, sarees]) => ({
      month,
      sarees,
    }));

    // 2. Monthly Salary Trend (last 6 months) - Only for Admin or Worker
    const salaryTrend: any[] = [];
    if (userRole === Role.SUPER_ADMIN || isWorker) {
      const payments = await this.prisma.salaryPayment.findMany({
        where: workerFilter,
        select: {
          amount: true,
          paymentDate: true,
        },
        orderBy: { paymentDate: 'asc' },
      });

      const salaryTrendMap = new Map<string, number>();
      payments.forEach((payment) => {
        const date = new Date(payment.paymentDate);
        const monthYear = date.toLocaleString('default', { month: 'short', year: '2-digit' });
        const current = salaryTrendMap.get(monthYear) || 0;
        salaryTrendMap.set(monthYear, current + payment.amount);
      });

      Array.from(salaryTrendMap.entries()).forEach(([month, amount]) => {
        salaryTrend.push({ month, amount });
      });
    }

    // 3. Warp Completion Status
    const activeWarps = await this.prisma.warpYarn.findMany({
      where: {
        status: 'ACTIVE',
        ...(isWorker ? { assignments: { some: { workerId: workerProfileId } } } : {}),
      },
      include: {
        productions: true,
      },
    });

    const warpCompletion = activeWarps.map((warp) => {
      const netSarees = warp.productions.reduce((sum, p) => sum + p.netSarees, 0);
      return {
        warpName: warp.warpName,
        expected: warp.expectedSarees,
        produced: netSarees,
      };
    });

    return {
      productionTrend,
      salaryTrend,
      warpCompletion,
    };
  }

  async getRecentActivities(userRole: Role, workerProfileId?: string) {
    const isWorker = userRole === Role.WORKER;
    const workerFilter = isWorker ? { workerId: workerProfileId } : {};

    // 1. Latest Production Entries
    const recentProduction = await this.prisma.productionEntry.findMany({
      where: workerFilter,
      take: 5,
      orderBy: { productionDate: 'desc' },
      include: {
        worker: { select: { firstName: true, lastName: true } },
        warpYarn: { select: { warpName: true } },
      },
    });

    // 2. Recent Payments (Admin & Worker only)
    let recentPayments: any[] = [];
    if (userRole === Role.SUPER_ADMIN || isWorker) {
      recentPayments = await this.prisma.salaryPayment.findMany({
        where: workerFilter,
        take: 5,
        orderBy: { paymentDate: 'desc' },
        include: {
          worker: { select: { firstName: true, lastName: true } },
        },
      });
    }

    // 3. Recent Workers (Admin & Supervisor only)
    let recentWorkers: any[] = [];
    if (userRole !== Role.WORKER) {
      recentWorkers = await this.prisma.worker.findMany({
        take: 5,
        orderBy: { dateOfJoining: 'desc' },
      });
    }

    return {
      recentProduction,
      recentPayments,
      recentWorkers,
    };
  }
}
