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
  Query 
} from '@nestjs/common';
import { WarpsService } from './warps.service';
import { CreateWarpDto } from './dto/create-warp.dto';
import { FirebaseAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, WarpStatus } from '@prisma/client';
import { AuditInterceptor } from '../audit/audit.interceptor';

@Controller('warps')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class WarpsController {
  constructor(private readonly warpsService: WarpsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN)
  create(@Body() createWarpDto: CreateWarpDto) {
    return this.warpsService.create(createWarpDto);
  }

  @Get()
  findAll(@Query('status') status?: WarpStatus) {
    return this.warpsService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.warpsService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() createWarpDto: CreateWarpDto) {
    return this.warpsService.update(id, createWarpDto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.warpsService.remove(id);
  }
}
