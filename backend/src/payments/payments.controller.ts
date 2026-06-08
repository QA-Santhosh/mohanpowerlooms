import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Put, 
  Param, 
  Delete, 
  UseGuards, 
  UseInterceptors, 
  Req, 
  Query,
  ForbiddenException
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { FirebaseAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { AuditInterceptor } from '../audit/audit.interceptor';

@Controller('payments')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN)
  create(@Body() createPaymentDto: CreatePaymentDto, @Req() req) {
    const adminId = req.user.id;
    return this.paymentsService.create(createPaymentDto, adminId);
  }

  @Get()
  async findAll(
    @Req() req,
    @Query('workerId') workerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const user = req.user;

    // Workers can only see their own payments
    if (user.role === Role.WORKER) {
      if (!user.workerProfile) {
        throw new ForbiddenException('User is not associated with a worker profile.');
      }
      return this.paymentsService.findAll({
        workerId: user.workerProfile.id,
        startDate,
        endDate
      });
    }

    return this.paymentsService.findAll({
      workerId,
      startDate,
      endDate
    });
  }

  // Get ledgers (all workers) - Admin only
  @Get('ledger')
  @Roles(Role.SUPER_ADMIN)
  getLedgers() {
    return this.paymentsService.getLedgers();
  }

  // Get worker's own ledger - Worker only
  @Get('ledger/me')
  async getMyLedger(@Req() req) {
    const user = req.user;
    if (user.role !== Role.WORKER || !user.workerProfile) {
      throw new ForbiddenException('This route is only accessible by Workers.');
    }
    return this.paymentsService.getLedgerForWorker(user.workerProfile.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req) {
    const user = req.user;
    const payment = await this.paymentsService.findOne(id);

    // Workers can only view their own payment entry
    if (user.role === Role.WORKER && payment.workerId !== user.workerProfile?.id) {
      throw new ForbiddenException('Workers are not allowed to view other workers\' payment records.');
    }

    return payment;
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.update(id, createPaymentDto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.paymentsService.remove(id);
  }
}
