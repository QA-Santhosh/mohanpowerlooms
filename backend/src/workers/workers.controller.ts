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
  ForbiddenException, 
  Query
} from '@nestjs/common';
import { WorkersService } from './workers.service';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { FirebaseAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { AuditInterceptor } from '../audit/audit.interceptor';

@Controller('workers')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN)
  create(@Body() createWorkerDto: CreateWorkerDto) {
    return this.workersService.create(createWorkerDto);
  }

  @Get()
  findAll(@Req() req, @Query('status') status?: string) {
    const userRole = req.user.role;
    return this.workersService.findAll(userRole, status);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req) {
    const user = req.user;
    
    // Workers can only view their own profile
    if (user.role === Role.WORKER) {
      const dbWorker = await this.workersService.findByUserId(user.id);
      if (!dbWorker || dbWorker.id !== id) {
        throw new ForbiddenException('Workers are only permitted to view their own profile.');
      }
    }

    return this.workersService.findOne(id, user.role);
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() createWorkerDto: CreateWorkerDto) {
    return this.workersService.update(id, createWorkerDto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.workersService.remove(id);
  }
}
