import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentMethod } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('PaymentsService Salary Ledger Logic', () => {
  let service: PaymentsService;
  let prisma: PrismaService;

  // Mock Prisma Client
  const mockPrisma = {
    worker: {
      findUnique: jest.fn(),
    },
    salaryPayment: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    salaryLedger: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrisma)), // Mock transacted executor
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset jest mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create salary payment', () => {
    it('should throw NotFoundException if worker does not exist', async () => {
      mockPrisma.worker.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          {
            workerId: 'invalid-worker',
            amount: 500.0,
            paymentDate: new Date().toISOString(),
            paymentMethod: PaymentMethod.UPI,
          },
          'admin-id'
        )
      ).rejects.toThrow(NotFoundException);
    });

    it('should record payment and update salary ledger successfully', async () => {
      // Mock worker profile
      const mockWorker = {
        id: 'worker-123',
        firstName: 'Ravi',
        lastName: 'Weaver',
        salaryType: 'PER_SAREE',
      };
      mockPrisma.worker.findUnique.mockResolvedValue(mockWorker);

      // Mock generate transaction id helpers
      mockPrisma.salaryPayment.findFirst.mockResolvedValue({ transactionId: 'MPL-TXN-005' });

      // Mock current ledger status
      const mockLedger = {
        workerId: 'worker-123',
        totalEarned: 2000.0,
        totalPaid: 1000.0,
        totalPending: 1000.0,
      };
      mockPrisma.salaryLedger.findUnique.mockResolvedValue(mockLedger);

      // Mock write targets
      const mockPaymentResult = {
        id: 'payment-id-1',
        transactionId: 'MPL-TXN-006',
        amount: 500.0,
      };
      mockPrisma.salaryPayment.create.mockResolvedValue(mockPaymentResult);

      const result = await service.create(
        {
          workerId: 'worker-123',
          amount: 500.0,
          paymentDate: new Date().toISOString(),
          paymentMethod: PaymentMethod.UPI,
          referenceNumber: 'REF-111',
          notes: 'Test pay',
        },
        'admin-id'
      );

      // Assertions
      expect(prisma.worker.findUnique).toHaveBeenCalledWith({
        where: { id: 'worker-123' },
        include: { ledger: true },
      });

      expect(prisma.salaryPayment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          transactionId: 'MPL-TXN-006',
          workerId: 'worker-123',
          amount: 500.0,
          paymentMethod: PaymentMethod.UPI,
        }),
      });

      expect(prisma.salaryLedger.update).toHaveBeenCalledWith({
        where: { workerId: 'worker-123' },
        data: {
          totalPaid: 1500.0, // 1000 + 500
          totalPending: 500.0, // 2000 - 1500
        },
      });

      expect(result).toEqual(mockPaymentResult);
    });
  });
});
