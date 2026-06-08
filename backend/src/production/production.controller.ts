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
import { ProductionService } from './production.service';
import { CreateProductionDto } from './dto/create-production.dto';
import { FirebaseAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { AuditInterceptor } from '../audit/audit.interceptor';

@Controller('production')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.SUPERVISOR)
  create(@Body() createProductionDto: CreateProductionDto, @Req() req) {
    const supervisorId = req.user.id;
    return this.productionService.create(createProductionDto, supervisorId);
  }

  @Get()
  async findAll(
    @Req() req,
    @Query('workerId') workerId?: string,
    @Query('warpYarnId') warpYarnId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const user = req.user;

    // Workers can only see their own production entries
    if (user.role === Role.WORKER) {
      if (!user.workerProfile) {
        throw new ForbiddenException('User is not associated with a worker profile.');
      }
      return this.productionService.findAll({
        workerId: user.workerProfile.id,
        warpYarnId,
        startDate,
        endDate
      });
    }

    return this.productionService.findAll({
      workerId,
      warpYarnId,
      startDate,
      endDate
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req) {
    const user = req.user;
    const entry = await this.productionService.findOne(id);

    // Workers can only view their own production entry
    if (user.role === Role.WORKER && entry.workerId !== user.workerProfile?.id) {
      throw new ForbiddenException('Workers are not allowed to view other workers\' production records.');
    }

    return entry;
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN, Role.SUPERVISOR)
  update(@Param('id') id: string, @Body() createProductionDto: CreateProductionDto) {
    return this.productionService.update(id, createProductionDto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.productionService.remove(id);
  }
}
