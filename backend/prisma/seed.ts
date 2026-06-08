import { PrismaClient, Role, WorkerType, SalaryType, WarpStatus, PaymentMethod } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Clean existing data
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.salaryPayment.deleteMany({});
  await prisma.salaryLedger.deleteMany({});
  await prisma.salaryConfiguration.deleteMany({});
  await prisma.productionEntry.deleteMany({});
  await prisma.warpAssignment.deleteMany({});
  await prisma.warpYarn.deleteMany({});
  await prisma.workerBankAccount.deleteMany({});
  await prisma.worker.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Cleaned old database records.');

  // 2. Create Users
  const ownerUser = await prisma.user.create({
    data: {
      email: 'owner@mohanlooms.com',
      firstName: 'Mohan',
      lastName: 'Kumar',
      role: Role.SUPER_ADMIN,
      firebaseUid: 'mock-firebase-uid-owner',
    },
  });

  const supervisorUser = await prisma.user.create({
    data: {
      email: 'supervisor@mohanlooms.com',
      firstName: 'Rajesh',
      lastName: 'Kumar',
      role: Role.SUPERVISOR,
      firebaseUid: 'mock-firebase-uid-supervisor',
    },
  });

  const weaverUser = await prisma.user.create({
    data: {
      email: 'ravi@mohanlooms.com',
      firstName: 'Ravi',
      lastName: 'Weaver',
      role: Role.WORKER,
      firebaseUid: 'mock-firebase-uid-ravi',
    },
  });

  console.log('Created Users.');

  // 3. Create Workers
  const raviWorker = await prisma.worker.create({
    data: {
      workerId: 'MPL-WRK-001',
      firstName: 'Ravi',
      lastName: 'Weaver',
      mobileNumber: '9876543210',
      address: '12, Loom Street, Salem, Tamil Nadu',
      aadhaarNumber: '123456789012',
      dateOfJoining: new Date('2026-01-01'),
      status: 'ACTIVE',
      workerType: WorkerType.WEAVER,
      salaryType: SalaryType.PER_SAREE,
      userId: weaverUser.id,
      bankAccount: {
        create: {
          accountHolderName: 'Ravi Weaver',
          bankName: 'State Bank of India',
          accountNumber: '12345678901',
          ifscCode: 'SBIN0001234',
          upiId: 'ravi@oksbi',
        },
      },
      salaryConfig: {
        create: {
          ratePerSaree: 150.0,
          fixedMonthlySalary: 0.0,
        },
      },
    },
  });

  const kumarWorker = await prisma.worker.create({
    data: {
      workerId: 'MPL-WRK-002',
      firstName: 'Kumar',
      lastName: 'Helper',
      mobileNumber: '9876543211',
      address: '15, Main Road, Salem, Tamil Nadu',
      aadhaarNumber: '234567890123',
      dateOfJoining: new Date('2026-02-15'),
      status: 'ACTIVE',
      workerType: WorkerType.HELPER,
      salaryType: SalaryType.FIXED_MONTHLY,
      bankAccount: {
        create: {
          accountHolderName: 'Kumar Helper',
          bankName: 'HDFC Bank',
          accountNumber: '98765432109',
          ifscCode: 'HDFC0004567',
          upiId: 'kumar@okhdfc',
        },
      },
      salaryConfig: {
        create: {
          ratePerSaree: 0.0,
          fixedMonthlySalary: 12000.0,
        },
      },
    },
  });

  const rameshWorker = await prisma.worker.create({
    data: {
      workerId: 'MPL-WRK-003',
      firstName: 'Ramesh',
      lastName: 'Weaver',
      mobileNumber: '9876543212',
      address: '8, Cross Street, Salem, Tamil Nadu',
      aadhaarNumber: '345678901234',
      dateOfJoining: new Date('2026-03-01'),
      status: 'ACTIVE',
      workerType: WorkerType.WEAVER,
      salaryType: SalaryType.PER_SAREE,
      bankAccount: {
        create: {
          accountHolderName: 'Ramesh Weaver',
          bankName: 'Indian Bank',
          accountNumber: '45678901234',
          ifscCode: 'IDIB0007890',
          upiId: 'ramesh@okindian',
        },
      },
      salaryConfig: {
        create: {
          ratePerSaree: 140.0,
          fixedMonthlySalary: 0.0,
        },
      },
    },
  });

  console.log('Created Workers, Bank Accounts and Salary Configurations.');

  // 4. Create Warp Yarns
  const warp1 = await prisma.warpYarn.create({
    data: {
      warpId: 'MPL-WRP-001',
      warpName: 'Soft Silk Paavu Blue',
      designName: 'Kanchipuram Border',
      sareeType: 'Silk Saree',
      color: 'Royal Blue',
      yarnQuality: '60 Count Pure Silk',
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-06-15'),
      status: WarpStatus.ACTIVE,
      expectedSarees: 40,
      expectedWarpLength: 240.0,
      productionTarget: 40,
    },
  });

  const warp2 = await prisma.warpYarn.create({
    data: {
      warpId: 'MPL-WRP-002',
      warpName: 'Cotton Paavu Yellow',
      designName: 'Plain Gold Zari',
      sareeType: 'Cotton Saree',
      color: 'Mustard Yellow',
      yarnQuality: '80 Count Cotton',
      startDate: new Date('2026-05-15'),
      status: WarpStatus.ACTIVE,
      expectedSarees: 60,
      expectedWarpLength: 360.0,
      productionTarget: 60,
    },
  });

  console.log('Created Warp Yarns.');

  // 5. Create Warp Assignments
  await prisma.warpAssignment.createMany({
    data: [
      { workerId: rameshWorker.id, warpYarnId: warp1.id },
      { workerId: raviWorker.id, warpYarnId: warp1.id },
      { workerId: raviWorker.id, warpYarnId: warp2.id },
    ],
  });

  console.log('Assigned Workers to Warp Yarns.');

  // 6. Create Production Entries
  // Ravi weaves 5 sarees on Warp 1 (no defects) and 10 on Warp 2 (no defects)
  // Ramesh weaves 3 sarees on Warp 1 (1 defect) -> 2 net sarees
  const prod1 = await prisma.productionEntry.create({
    data: {
      productionId: 'MPL-PRD-001',
      productionDate: new Date('2026-05-20'),
      workerId: raviWorker.id,
      warpYarnId: warp1.id,
      sareeCount: 5,
      defectiveSareeCount: 0,
      netSarees: 5,
      remarks: 'Excellent quality, royal blue silk border',
      supervisorId: supervisorUser.id,
    },
  });

  const prod2 = await prisma.productionEntry.create({
    data: {
      productionId: 'MPL-PRD-002',
      productionDate: new Date('2026-05-22'),
      workerId: rameshWorker.id,
      warpYarnId: warp1.id,
      sareeCount: 3,
      defectiveSareeCount: 1,
      netSarees: 2,
      remarks: 'Zari alignment issue on 1 saree, discarded',
      supervisorId: supervisorUser.id,
    },
  });

  const prod3 = await prisma.productionEntry.create({
    data: {
      productionId: 'MPL-PRD-003',
      productionDate: new Date('2026-05-25'),
      workerId: raviWorker.id,
      warpYarnId: warp2.id,
      sareeCount: 10,
      defectiveSareeCount: 0,
      netSarees: 10,
      remarks: 'Cotton weaving, consistent quality',
      supervisorId: supervisorUser.id,
    },
  });

  console.log('Seeded Production Entries.');

  // 7. Calculate and Seed Salary Ledger
  // Ravi: (5 sarees * 150) + (10 sarees * 150) = 2250
  // Ramesh: 2 sarees * 140 = 280
  // Kumar (fixed monthly): 12000 (earned for the month)
  const raviEarned = (5 * 150.0) + (10 * 150.0);
  const rameshEarned = 2 * 140.0;
  const kumarEarned = 12000.0;

  // Payments
  // Ravi: ₹1000 paid
  // Kumar: ₹8000 paid
  // Ramesh: ₹0 paid
  const raviPaid = 1000.0;
  const kumarPaid = 8000.0;
  const rameshPaid = 0.0;

  await prisma.salaryLedger.createMany({
    data: [
      {
        workerId: raviWorker.id,
        totalEarned: raviEarned,
        totalPaid: raviPaid,
        totalPending: raviEarned - raviPaid,
      },
      {
        workerId: kumarWorker.id,
        totalEarned: kumarEarned,
        totalPaid: kumarPaid,
        totalPending: kumarEarned - kumarPaid,
      },
      {
        workerId: rameshWorker.id,
        totalEarned: rameshEarned,
        totalPaid: rameshPaid,
        totalPending: rameshEarned - rameshPaid,
      },
    ],
  });

  console.log('Seeded Salary Ledgers.');

  // 8. Create Payments
  await prisma.salaryPayment.create({
    data: {
      transactionId: 'MPL-TXN-001',
      workerId: raviWorker.id,
      amount: raviPaid,
      paymentDate: new Date('2026-05-28'),
      paymentMethod: PaymentMethod.UPI,
      referenceNumber: 'UPI20260528Ravi',
      notes: 'Mid-month advance payment',
      adminId: ownerUser.id,
    },
  });

  await prisma.salaryPayment.create({
    data: {
      transactionId: 'MPL-TXN-002',
      workerId: kumarWorker.id,
      amount: kumarPaid,
      paymentDate: new Date('2026-05-30'),
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      referenceNumber: 'NEFTHDFCR202605',
      notes: 'May partial fixed salary payment',
      adminId: ownerUser.id,
    },
  });

  console.log('Seeded Salary Payments.');

  // 9. Seed Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: ownerUser.id,
        action: 'Worker Created',
        module: 'Worker Management',
        timestamp: new Date('2026-01-01T10:00:00Z'),
        newValue: JSON.stringify({ name: 'Ravi Weaver', type: 'WEAVER' }),
      },
      {
        userId: ownerUser.id,
        action: 'Warp Created',
        module: 'Warp Yarn Management',
        timestamp: new Date('2026-05-01T09:00:00Z'),
        newValue: JSON.stringify({ name: 'Soft Silk Paavu Blue' }),
      },
      {
        userId: supervisorUser.id,
        action: 'Production Logged',
        module: 'Saree Production',
        timestamp: new Date('2026-05-20T17:30:00Z'),
        newValue: JSON.stringify({ worker: 'Ravi', netSarees: 5 }),
      },
      {
        userId: ownerUser.id,
        action: 'Payment Recorded',
        module: 'Salary & Banking',
        timestamp: new Date('2026-05-28T11:00:00Z'),
        newValue: JSON.stringify({ worker: 'Ravi', amount: 1000.0 }),
      },
    ],
  });

  console.log('Seeded Audit Logs.');

  // 10. Seed Notifications
  await prisma.notification.createMany({
    data: [
      {
        recipientId: ownerUser.id,
        title: 'Warp Assignment Complete',
        message: 'Ravi Weaver and Ramesh Weaver have been assigned to Soft Silk Paavu Blue.',
        read: true,
      },
      {
        recipientId: weaverUser.id,
        title: 'Salary Credited',
        message: 'A payment of ₹1000 has been credited to your account via UPI on 28th May.',
        read: false,
      },
      {
        recipientId: ownerUser.id,
        title: 'Production Target Reached',
        message: 'Warp MPL-WRP-001 has reached 17.5% of its expected saree target.',
        read: false,
      },
    ],
  });

  console.log('Seeded Notifications.');
  console.log('Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
